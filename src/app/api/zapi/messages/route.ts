import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiChatMessages, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

/**
 * Histórico de conversa (Fase 2 — inbox no painel).
 * GET /api/zapi/messages?to=<telefone>&amount=<n>
 * Só ADMIN. `to` é sempre um telefone (não grupo) — a inbox é por contato.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { cid } = getCampaignContext(session);

    const to = req.nextUrl.searchParams.get("to")?.trim();
    if (!to || !toZapiPhone(to)) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    const amount = Math.min(Math.max(Number(req.nextUrl.searchParams.get("amount")) || 30, 1), 100);

    const messages = await zapiChatMessages(cid, to, amount);
    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Falha ao buscar histórico";
    console.error("[zapi/messages GET] %s", message);
    return NextResponse.json({ error: "Falha ao buscar histórico (Z-API)" }, { status: 502 });
  }
}
