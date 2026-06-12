import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { toZapiPhone } from "@/lib/zapi";

export const dynamic = "force-dynamic";

/**
 * Histórico de conversa com um contato (F3 — lê da tabela WhatsappMessage,
 * populada pelo webhook). Antes usava o Z-API chat-messages, indisponível no
 * multi-device. `to` é sempre um telefone (não grupo). Só ADMIN.
 * GET /api/zapi/messages?to=<telefone>&amount=<n>
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { db, cid } = getCampaignContext(session);

    const to = req.nextUrl.searchParams.get("to")?.trim();
    if (!to || !toZapiPhone(to)) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    const amount = Math.min(Math.max(Number(req.nextUrl.searchParams.get("amount")) || 30, 1), 100);
    const pNorm = to.replace(/\D/g, "").slice(-8);

    const rows = await db.whatsappMessage.findMany({
      where: { campaignId: cid, phoneNormalized: pNorm, isGroup: false },
      orderBy: { timestamp: "asc" },
      take: amount,
    });

    const messages = rows.map((r) => ({
      id: r.id,
      fromMe: r.fromMe,
      timestamp: r.timestamp.getTime(),
      senderName: r.senderName ?? undefined,
      kind: r.type,
      text: r.body ?? undefined,
      mediaUrl: r.mediaUrl ?? undefined,
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar histórico";
    console.error("[zapi/messages GET] %s", message);
    return NextResponse.json({ error: "Falha ao buscar histórico" }, { status: 502 });
  }
}
