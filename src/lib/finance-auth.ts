import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * Autentica e exige isFinanceAdmin — restrição por e-mail, separada do role
 * ADMIN da campanha (hoje compartilhado por várias pessoas) e de isSuperAdmin.
 * Uso: const gate = await requireFinanceAdmin(); if (!gate.ok) return gate.response;
 */
export async function requireFinanceAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  if (!session.user.isFinanceAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Acesso restrito ao financeiro" }, { status: 403 }) };
  }
  const { db, cid } = getCampaignContext(session);
  return { ok: true as const, session, db, cid };
}
