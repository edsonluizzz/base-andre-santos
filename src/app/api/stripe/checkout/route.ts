import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

const TRIAL_DAYS = 7;

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Apenas administradores podem fazer upgrade" }, { status: 403 });

    const eid = session.user.establishmentId ?? "default-porto-belo";
    const est = await db.establishment.findUnique({ where: { id: eid } });
    if (!est) return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    if (est.plan === "PRO" && est.stripeStatus === "active")
      return NextResponse.json({ error: "Estabelecimento já está no plano Pro" }, { status: 409 });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    // Reutilizar ou criar customer no Stripe
    let customerId = est.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        name: est.name,
        email: user?.email ?? undefined,
        metadata: { establishmentId: eid },
      });
      customerId = customer.id;
      await db.establishment.update({ where: { id: eid }, data: { stripeCustomerId: customerId } });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://ovile.com.br";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { establishmentId: eid },
      },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/configuracoes?upgrade=cancelled`,
      metadata: { establishmentId: eid },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento" }, { status: 500 });
  }
}
