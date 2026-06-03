import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignIntegrations } from "@/lib/meta-db";
import { validateCampaign } from "@/lib/validate-campaign";
import { renderAllMessages, INVITE_TEMPLATES, WELCOME_TEMPLATES, OPTOUT_TEMPLATES, REACTIVATION_TEMPLATES, periodoEleitoral } from "@/lib/message-templates";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

// Fallback global mantido APENAS para a campanha original (andre-santos-2026)
const LEGACY_CID = "andre-santos-2026";
const LEGACY_ZAPI_INSTANCE = "3F3DB93D8FCE11FDF2216E531F01401A";
const LEGACY_ZAPI_TOKEN = "30BC72BA6F47BE762085BE77";
const LEGACY_ZAPI_CLIENT_TOKEN = "Ffd62620c670443338f8d7bd0936987a8S";

/**
 * GET /api/n8n/config
 *
 * Retorna configurações usadas pelos workflows n8n:
 * - Link do grupo WhatsApp
 * - Nome da campanha
 * - Mensagens (3 tipos × 5 variações com gênero detectado e período eleitoral)
 * - Credenciais Z-API do tenant
 *
 * Query params:
 *   campaign_id (string, padrão "andre-santos-2026")
 *   name        (string, opcional) — se presente, retorna messages.{invite,welcome,optOut}
 *               já prontos (uma variação sorteada por chamada, gênero detectado,
 *               primeiro nome formatado). Se ausente, retorna templates raw para
 *               compat com workflows antigos.
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? LEGACY_CID;
  const name = searchParams.get("name") ?? null;

  // Valida que Campaign existe e está ativa — evita vazamento de fallback
  // para o banco do André quando passa campaign_id inválido.
  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json(
      { error: `Campaign '${campaignId}' não encontrada ou inativa` },
      { status: 404 }
    );
  }

  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const [settings, integrations] = await Promise.all([
    db.settings.findUnique({
      where: { id: "singleton" },
      select: { whatsappGroupLink: true, campaignName: true },
    }),
    getCampaignIntegrations(campaignId),
  ]);

  const groupLink = settings?.whatsappGroupLink ?? null;
  // Prioridade: Campaign.candidateName (canônico, global) > Settings.campaignName
  // (tenant, legado). Sem fallback hardcoded — quem usa o sistema multi-tenant
  // tem que ter candidateName setado pelo seed-tenants ou pela UI.
  const candidateName = validated.candidateName ?? settings?.campaignName ?? validated.name;

  // Z-API
  const isLegacyCampaign = campaignId === LEGACY_CID;
  const zapi = {
    instance: integrations.zApiInstance ?? (isLegacyCampaign ? LEGACY_ZAPI_INSTANCE : null),
    token: integrations.zApiToken ?? (isLegacyCampaign ? LEGACY_ZAPI_TOKEN : null),
    clientToken: integrations.zApiClientToken ?? (isLegacyCampaign ? LEGACY_ZAPI_CLIENT_TOKEN : null),
  };

  const zApiSendTextUrl = zapi.instance && zapi.token
    ? `https://api.z-api.io/instances/${zapi.instance}/token/${zapi.token}/send-text`
    : null;

  // Mensagens: se receber `name`, renderiza prontas (com gênero e período)
  // Se não receber, devolve templates raw — workflow antigo continua funcionando
  let messages;
  if (name) {
    messages = renderAllMessages({
      fullName: name,
      candidateName,
      groupLink,
    });
  } else {
    // Compat: workflows antigos não passam ?name — devolvemos a V1 com {nome}
    // substituído por "apoiador(a)" como salvaguarda para nunca enviar placeholder cru.
    // Sintaxe markdown do WhatsApp preservada (*texto*, 👉).
    const FALLBACK_NAME = "apoiador(a)";
    const fillCommon = (tpl: string) =>
      tpl
        .replaceAll("{nome}", FALLBACK_NAME)
        .replaceAll("{candidato}", candidateName)
        .replaceAll("{periodo}", periodoEleitoral())
        .replaceAll("{querido}", "amigo(a)")
        .replaceAll("{amigo}", "amigo(a)")
        .replaceAll("{bem-vindo}", "bem-vindo(a)");
    messages = {
      invite: fillCommon(INVITE_TEMPLATES[0]),
      welcome: fillCommon(WELCOME_TEMPLATES[0]).replaceAll("{groupLink}", groupLink ?? ""),
      optOut: fillCommon(OPTOUT_TEMPLATES[0]),
      reactivation: fillCommon(REACTIVATION_TEMPLATES[0]),
    };
  }

  return NextResponse.json({
    campaignId,
    candidateName,
    whatsappGroupLink: groupLink,
    periodoEleitoral: periodoEleitoral(),
    messages,
    zapi: {
      instance: zapi.instance,
      token: zapi.token,
      clientToken: zapi.clientToken,
      sendTextUrl: zApiSendTextUrl,
      configured: Boolean(zapi.instance && zapi.token && zapi.clientToken),
    },
  });
}
