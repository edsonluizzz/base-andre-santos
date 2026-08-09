/**
 * Helpers para o módulo de disparo WhatsApp.
 * Resolução de filtros → query Prisma de Collaborator.
 */

import type { PrismaClient } from "@prisma/client";

export type BroadcastFilters = {
  source?: string | string[];                      // EBOOK_QUEM_SOU_EU, GOSPEL_CLASS, etc
  status?: "LEAD" | "ACTIVE" | "INACTIVE" | Array<"LEAD" | "ACTIVE" | "INACTIVE">;
  supportStatus?: "CONFIRMADO" | "NEGOCIANDO" | "NEUTRO" | "ADVERSARIO";
  city?: string;                                   // contains insensitive
  profile?: string | string[];                     // PASTOR, APOIADOR, etc
  channel?: "INSTAGRAM" | "WHATSAPP" | "EVENTO" | "LINK" | "OUTRO";
  notContactedDays?: number;                       // só leads não contatados nos últimos N dias
  hasPhone?: boolean;                              // default true
  lgpdConsent?: boolean;                           // default true (legal requirement)
  collaboratorIds?: string[];                      // seleção manual via UI (override filtros)
};

/**
 * Converte filtros do broadcast em where Prisma + retorna count + recipients.
 *
 * Limit é aplicado pra preview (não conta no real broadcast).
 */
export async function resolveRecipients(
  db: PrismaClient,
  campaignId: string,
  filters: BroadcastFilters,
  options: { limit?: number; preview?: boolean } = {}
): Promise<{
  count: number;
  recipients: Array<{ id: string; name: string; phone: string; city: string | null }>;
}> {
  // Seleção manual sempre sobrepõe filtros
  if (filters.collaboratorIds && filters.collaboratorIds.length > 0) {
    const recipients = await db.collaborator.findMany({
      where: {
        campaignId,
        id: { in: filters.collaboratorIds },
        phone: { not: null },
      },
      select: { id: true, name: true, phone: true, city: true },
    });
    const valid = recipients.filter((r): r is typeof r & { phone: string } => Boolean(r.phone));
    return { count: valid.length, recipients: valid };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { campaignId };

  if (filters.hasPhone !== false) where.phone = { not: null };
  if (filters.lgpdConsent !== false) where.lgpdConsent = true;

  if (filters.source) {
    where.source = Array.isArray(filters.source)
      ? { in: filters.source }
      : filters.source;
  }
  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }
  if (filters.supportStatus) where.supportStatus = filters.supportStatus;
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.profile) {
    where.profile = Array.isArray(filters.profile)
      ? { in: filters.profile }
      : filters.profile;
  }
  if (filters.channel) where.channel = filters.channel;

  if (filters.notContactedDays !== undefined && filters.notContactedDays > 0) {
    const cutoff = new Date(Date.now() - filters.notContactedDays * 24 * 60 * 60 * 1000);
    where.OR = [
      { lastContactedAt: null },
      { lastContactedAt: { lt: cutoff } },
    ];
  }

  const count = await db.collaborator.count({ where });

  const recipients = await db.collaborator.findMany({
    where,
    select: { id: true, name: true, phone: true, city: true },
    take: options.limit ?? (options.preview ? 20 : count),
    orderBy: { createdAt: "asc" },
  });

  const valid = recipients.filter((r): r is typeof r & { phone: string } =>
    Boolean(r.phone)
  );
  return { count, recipients: valid };
}

/**
 * Renderiza placeholders na mensagem: {nome}, {primeironome}, {cidade}.
 */
export function renderMessage(template: string, vars: { name: string; city: string | null }): string {
  const firstName = vars.name.trim().split(" ")[0] ?? vars.name;
  return template
    .replace(/\{nome\}/gi, vars.name.trim())
    .replace(/\{primeironome\}/gi, firstName)
    .replace(/\{cidade\}/gi, vars.city?.trim() || "sua cidade");
}
