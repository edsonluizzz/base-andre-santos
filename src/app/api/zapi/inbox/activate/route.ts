import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiSetReceivedWebhook, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

// Ativa o recebimento de mensagens (F3): aponta o webhook "ao receber" da Z-API
// para o nosso /api/zapi/webhook. TRAVA: só ativa se N8N_RESPOSTA_WEBHOOK_URL
// estiver setada — senão o relay ao WF2 não acontece e o SIM/NÃO quebraria.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    const { cid } = getCampaignContext(session);

    if (!process.env.N8N_RESPOSTA_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "Configure a env N8N_RESPOSTA_WEBHOOK_URL no Vercel antes de ativar (senão o SIM/NÃO para de funcionar)." },
        { status: 409 },
      );
    }

    const base = process.env.APP_URL || req.nextUrl.origin;
    const secret = process.env.ZAPI_WEBHOOK_SECRET;
    const webhookUrl =
      `${base.replace(/\/$/, "")}/api/zapi/webhook?cid=${encodeURIComponent(cid)}` +
      (secret ? `&key=${encodeURIComponent(secret)}` : "");

    await zapiSetReceivedWebhook(cid, webhookUrl);

    return NextResponse.json({ ok: true, webhookUrl });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/inbox/activate]", err);
    return NextResponse.json({ error: "Falha ao configurar o webhook na Z-API" }, { status: 502 });
  }
}
