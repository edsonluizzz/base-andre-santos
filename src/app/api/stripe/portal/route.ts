import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Apenas administradores podem acessar o portal" }, { status: 403 });

    const eid = session.user.establishmentId ?? "default-porto-belo";
    const est = await db.establishment.findUnique({ where: { id: eid } });

    if (!est?.stripeCustomerId)
      return NextResponse.json({ error: "Nenhuma assinatura encontrada" }, { status: 404 });

    const baseUrl = process.env.APP_URL ?? "https://ovile.com.br";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: est.stripeCustomerId,
      return_url: `${baseUrl}/configuracoes`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json({ error: "Erro ao acessar portal de pagamento" }, { status: 500 });
  }
}
