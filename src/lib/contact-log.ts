/**
 * Helper para registrar eventos de contato com colaboradores.
 *
 * Kinds suportados:
 *   SENT_INVITE        — convite WhatsApp enviado (WF1/WF3/WF4 → CONTACTED)
 *   SENT_REACTIVATION  — mensagem de reativação enviada (WF4 kind=reactivation)
 *   RECEIVED_YES       — lead respondeu SIM (WF2)
 *   RECEIVED_NO        — lead respondeu NÃO (WF2)
 *   CONVERT            — lead virou ACTIVE/CONFIRMADO
 *   OPT_OUT            — lead deu opt-out
 *   MANUAL_NOTE        — admin registrou nota manual
 *
 * Channels: WHATSAPP, EMAIL, MANUAL
 * Sources:  WF1, WF3, WF4, MANUAL_FORM, MANUAL_ADMIN, n8n-config
 */

import type { PrismaClient } from "@prisma/client";

export type ContactKind =
  | "SENT_INVITE"
  | "SENT_REACTIVATION"
  | "RECEIVED_YES"
  | "RECEIVED_NO"
  | "CONVERT"
  | "OPT_OUT"
  | "MANUAL_NOTE";

export type ContactChannel = "WHATSAPP" | "EMAIL" | "MANUAL";

export interface LogContactInput {
  collaboratorId: string;
  campaignId: string;
  kind: ContactKind;
  channel?: ContactChannel;
  actorId?: string | null;
  source?: string | null;
  notes?: string | null;
}

/**
 * Cria um ContactLog. Falha silenciosa (não bloqueia fluxo principal).
 */
export async function logContact(db: PrismaClient, input: LogContactInput): Promise<void> {
  try {
    await db.contactLog.create({
      data: {
        collaboratorId: input.collaboratorId,
        campaignId: input.campaignId,
        kind: input.kind,
        channel: input.channel ?? null,
        actorId: input.actorId ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
    });
  } catch (err) {
    console.warn("[contact-log] falha ao registrar:", err);
  }
}

/**
 * Versão bulk — registra N eventos do mesmo kind para múltiplos colaboradores.
 * Usado pelo bulk-invite.
 */
export async function logContactBulk(
  db: PrismaClient,
  campaignId: string,
  collaboratorIds: string[],
  kind: ContactKind,
  options: { channel?: ContactChannel; actorId?: string | null; source?: string | null } = {},
): Promise<void> {
  if (collaboratorIds.length === 0) return;
  try {
    await db.contactLog.createMany({
      data: collaboratorIds.map((id) => ({
        collaboratorId: id,
        campaignId,
        kind,
        channel: options.channel ?? null,
        actorId: options.actorId ?? null,
        source: options.source ?? null,
      })),
    });
  } catch (err) {
    console.warn("[contact-log] bulk falhou:", err);
  }
}

// ─── Labels para UI ───────────────────────────────────────────────────────

export const CONTACT_KIND_LABEL: Record<ContactKind, string> = {
  SENT_INVITE: "Convite enviado",
  SENT_REACTIVATION: "Reativação enviada",
  RECEIVED_YES: "Respondeu SIM",
  RECEIVED_NO: "Respondeu NÃO",
  CONVERT: "Confirmou apoio",
  OPT_OUT: "Optou por não participar",
  MANUAL_NOTE: "Nota manual",
};

export const CONTACT_KIND_COLOR: Record<ContactKind, string> = {
  SENT_INVITE: "text-blue-400",
  SENT_REACTIVATION: "text-purple-400",
  RECEIVED_YES: "text-green-400",
  RECEIVED_NO: "text-slate-400",
  CONVERT: "text-green-400",
  OPT_OUT: "text-red-400",
  MANUAL_NOTE: "text-amber-400",
};
