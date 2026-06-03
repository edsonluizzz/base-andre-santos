import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/notify-referrer
 *
 * Chamado internamente quando um lead converte (CONVERT action).
 * Busca o referenciador do lead e retorna os dados para o n8n enviar
 * uma notificação via WhatsApp ao indicador.
 *
 * Body JSON:
 *   { collaboratorId: string, campaignId?: string }
 *
 * Resposta:
 *   {
 *     ok: true,
 *     referrer: { id, name, phone } | null,
 *     convertedLead: { id, name }
 *   }
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { collaboratorId?: string; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { collaboratorId, campaignId = "andre-santos-2026" } = body;

  if (!collaboratorId) {
    return NextResponse.json({ error: "collaboratorId obrigatório" }, { status: 400 });
  }

  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json(
      { error: `Campaign '${campaignId}' não encontrada ou inativa` },
      { status: 404 }
    );
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  // Buscar o lead convertido e seu referenciador
  const lead = await db.collaborator.findUnique({
    where: { id: collaboratorId },
    select: {
      id: true,
      name: true,
      registeredById: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  // Se não tem referenciador, nada a notificar
  if (!lead.registeredById) {
    return NextResponse.json({
      ok: true,
      referrer: null,
      convertedLead: { id: lead.id, name: lead.name },
    });
  }

  // Buscar dados do referenciador (que cadastrou o lead)
  const referrer = await db.collaborator.findFirst({
    where: {
      campaignId,
      userId: lead.registeredById,
    },
    select: { id: true, name: true, phone: true },
  });

  return NextResponse.json({
    ok: true,
    referrer: referrer ?? null,
    convertedLead: { id: lead.id, name: lead.name },
  });
}
