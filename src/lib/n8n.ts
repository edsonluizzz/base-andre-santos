/**
 * Helpers de integração com n8n.
 *
 * Env vars necessárias (Vercel):
 *   N8N_API_KEY            — chave secreta compartilhada entre Ovile ↔ n8n
 *   N8N_LEAD_WEBHOOK_URL   — webhook disparado quando 1 lead é criado (formulário público / manual)
 *   N8N_IMPORT_WEBHOOK_URL — webhook disparado após importação em lote (CSV/XLSX)
 *   N8N_MANUAL_WEBHOOK_URL — webhook disparado quando admin dispara convite em massa (WF4)
 *
 * Todas são fire-and-forget: falhas não bloqueiam a resposta ao usuário.
 */

export interface LeadPayload {
  collaboratorId: string;
  name: string;
  phone: string;
  campaignId: string;
  source?: string | null;
  city?: string | null;
  referredByCollaboratorId?: string | null;
}

/**
 * Daily limit de mensagens WhatsApp iniciadas por campanha.
 * Padrão sane pra warmup pós-ban — pode ser ajustado via env LEAD_DAILY_LIMIT.
 *
 * Lógica anti-ban:
 *  - Conta quantos Collaborator viraram CONTACTED nas últimas 24h
 *  - Se >= limite, NÃO chama webhook (lead fica LEAD pendente, WF1 ou ação
 *    manual pega quando warmup avançar)
 */
const DEFAULT_DAILY_LIMIT = parseInt(process.env.LEAD_DAILY_LIMIT ?? "25", 10);

async function checkDailyLimit(campaignId: string): Promise<{ allowed: boolean; sent24h: number; limit: number }> {
  const limit = DEFAULT_DAILY_LIMIT;
  if (limit <= 0) return { allowed: true, sent24h: 0, limit }; // 0 = ilimitado
  try {
    // Import dinâmico evita ciclo com lib/db
    const { db } = await import("@/lib/db");
    const { getCampaignContext } = await import("@/lib/campaign-context");
    const { getCampaignDbUrl } = await import("@/lib/meta-db");
    const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
    const { db: tenantDb } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });
    void db; // unused but kept for future cross-tenant analytics
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sent24h = await tenantDb.collaborator.count({
      where: { campaignId, lastContactedAt: { gte: since24h } },
    });
    return { allowed: sent24h < limit, sent24h, limit };
  } catch (err) {
    console.warn("[n8n] checkDailyLimit falhou — permitindo por safety:", err);
    return { allowed: true, sent24h: 0, limit };
  }
}

/**
 * Dispara imediatamente quando um único lead é criado com telefone.
 * Usado pelo formulário público e cadastro manual com status=LEAD.
 *
 * Respeita daily limit anti-ban (LEAD_DAILY_LIMIT env var, padrão 25).
 */
export async function triggerLeadWebhook(lead: LeadPayload): Promise<void> {
  const webhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[n8n] N8N_LEAD_WEBHOOK_URL nao configurado — skip", lead.collaboratorId);
    return;
  }
  if (!lead.phone) {
    console.warn("[n8n] lead sem phone — skip", lead.collaboratorId);
    return;
  }

  // Anti-ban: respeita daily limit de mensagens iniciadas
  const dailyCheck = await checkDailyLimit(lead.campaignId);
  if (!dailyCheck.allowed) {
    console.warn(
      `[n8n] daily-limit reached (${dailyCheck.sent24h}/${dailyCheck.limit}) — skip ${lead.collaboratorId}, lead fica LEAD pendente`
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(5_000),
    });
    console.log(
      `[n8n] Lead webhook disparado (${dailyCheck.sent24h + 1}/${dailyCheck.limit}):`,
      lead.collaboratorId,
      "status:",
      res.status
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[n8n] Lead webhook falhou:", lead.collaboratorId, msg);
  }
}

/**
 * Dispara após importação CSV/XLSX com a lista de NOVOS leads criados.
 * n8n recebe o lote e processa com o pacing que evita banimento.
 */
export async function triggerImportBatchWebhook(
  leads: LeadPayload[]
): Promise<void> {
  const webhookUrl = process.env.N8N_IMPORT_WEBHOOK_URL;
  if (!webhookUrl || leads.length === 0) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads, count: leads.length }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    console.warn("[n8n] Import batch webhook falhou");
  }
}

export interface ManualBatchResult {
  ok: boolean;
  error?: string;
  status?: number;
}

/**
 * Dispara quando admin seleciona colaboradores e clica "Enviar convite".
 * WF4 (n8n) recebe o lote e processa com mesmo pacing 2-4min entre mensagens.
 *
 * Bloqueante: aguarda a resposta do webhook pra confirmar que o fluxo foi acionado.
 * Retorna { ok, error?, status? } pro endpoint informar o cliente.
 */
export async function triggerManualInviteBatch(
  leads: LeadPayload[],
  actorId: string,
  kind: "invite" | "reactivation" = "invite",
): Promise<ManualBatchResult> {
  const webhookUrl = process.env.N8N_MANUAL_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "N8N_MANUAL_WEBHOOK_URL não configurado no Vercel" };
  }
  if (leads.length === 0) {
    return { ok: false, error: "Lista de leads vazia" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads,
        count: leads.length,
        source: "manual",
        kind,
        actorId,
        triggeredAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `n8n respondeu HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch falhou";
    console.warn("[n8n] Manual batch webhook falhou:", msg);
    return { ok: false, error: msg };
  }
}
