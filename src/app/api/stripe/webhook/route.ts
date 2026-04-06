import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

// Mapeamento Stripe status → plano interno
function planFromStatus(status: Stripe.Subscription.Status): string {
  return ["active", "trialing"].includes(status) ? "PRO" : "FREE";
}

async function syncSubscription(sub: Stripe.Subscription) {
  const eid =
    (sub.metadata?.establishmentId as string | undefined) ??
    (sub as unknown as { customer: Stripe.Customer }).customer?.metadata?.establishmentId;

  if (!eid) {
    // Tentar buscar pelo stripeSubscriptionId ou customerId
    const bySubId = await db.establishment.findUnique({ where: { stripeSubscriptionId: sub.id } });
    const estId = bySubId?.id;
    if (!estId) {
      console.warn("Webhook: establishmentId não encontrado para subscription", sub.id);
      return;
    }
    await updateEstablishment(estId, sub);
    return;
  }

  await updateEstablishment(eid, sub);
}

async function updateEstablishment(eid: string, sub: Stripe.Subscription) {
  const status = sub.status;
  const plan = planFromStatus(status);
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  // current_period_end está no item da assinatura no Stripe API 2025-03-31.basil
  const itemPeriodEnd = sub.items.data[0]?.current_period_end;
  const periodEnd = itemPeriodEnd ? new Date(itemPeriodEnd * 1000) : null;
  const cancelAtPeriodEnd = sub.cancel_at_period_end;
  const priceId = sub.items.data[0]?.price?.id ?? null;

  await db.establishment.update({
    where: { id: eid },
    data: {
      stripeSubscriptionId: sub.id,
      stripeStatus: status,
      plan,
      trialEndsAt: trialEnd,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
      stripePriceId: priceId,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const eid = session.metadata?.establishmentId;
        const customerId = session.customer as string;
        if (eid && customerId) {
          await db.establishment.update({
            where: { id: eid },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const bySubId = await db.establishment.findUnique({ where: { stripeSubscriptionId: sub.id } });
        if (bySubId) {
          await db.establishment.update({
            where: { id: bySubId.id },
            data: {
              plan: "FREE",
              stripeStatus: "canceled",
              stripeSubscriptionId: null,
              trialEndsAt: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              stripePriceId: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription: string }).subscription;
        if (subId) {
          const est = await db.establishment.findUnique({ where: { stripeSubscriptionId: subId } });
          if (est) {
            await db.establishment.update({
              where: { id: est.id },
              data: { stripeStatus: "past_due" },
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
