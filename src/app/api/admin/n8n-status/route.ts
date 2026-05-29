import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/n8n-status
 *
 * Verifica o status da integração n8n:
 * - Se N8N_API_KEY está configurada
 * - Se os webhooks de saída (N8N_LEAD_WEBHOOK_URL, N8N_IMPORT_WEBHOOK_URL) estão configurados
 *
 * Retorna também as URLs dos endpoints Ovile que o n8n usa.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKeySet = Boolean(process.env.N8N_API_KEY);
  const leadWebhookSet = Boolean(process.env.N8N_LEAD_WEBHOOK_URL);
  const importWebhookSet = Boolean(process.env.N8N_IMPORT_WEBHOOK_URL);

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://ovile.com.br";

  return NextResponse.json({
    status: {
      apiKeySet,
      leadWebhookSet,
      importWebhookSet,
      allConfigured: apiKeySet && leadWebhookSet && importWebhookSet,
    },
    endpoints: {
      leadsQueue:    `${baseUrl}/api/n8n/leads`,
      updateLead:    `${baseUrl}/api/n8n/update-lead`,
      config:        `${baseUrl}/api/n8n/config`,
      notifyReferrer: `${baseUrl}/api/n8n/notify-referrer`,
    },
    // Mostra apenas prefixo da chave por segurança
    apiKeyPreview: apiKeySet
      ? `${process.env.N8N_API_KEY!.slice(0, 8)}...`
      : null,
  });
}
