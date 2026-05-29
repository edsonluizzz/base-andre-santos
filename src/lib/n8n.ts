/**
 * Helpers de integração com n8n.
 *
 * Env vars necessárias (Vercel):
 *   N8N_API_KEY            — chave secreta compartilhada entre Ovile ↔ n8n
 *   N8N_LEAD_WEBHOOK_URL   — webhook disparado quando 1 lead é criado (formulário público / manual)
 *   N8N_IMPORT_WEBHOOK_URL — webhook disparado após importação em lote (CSV/XLSX)
 *
 * Ambas são fire-and-forget: falhas não bloqueiam a resposta ao usuário.
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
 * Dispara imediatamente quando um único lead é criado com telefone.
 * Usado pelo formulário público e cadastro manual com status=LEAD.
 */
export async function triggerLeadWebhook(lead: LeadPayload): Promise<void> {
  const webhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;
  if (!webhookUrl || !lead.phone) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Silencioso — n8n é opcional, não pode derrubar o cadastro
    console.warn("[n8n] Lead webhook falhou:", lead.collaboratorId);
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
