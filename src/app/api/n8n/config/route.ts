import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl, getCampaignIntegrations } from "@/lib/meta-db";

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
 * - Templates de mensagem humanizados
 * - Credenciais Z-API DO TENANT (não mais hardcoded nos workflows)
 *
 * Query params:
 *   campaign_id (string, padrão "andre-santos-2026")
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 *
 * Variável {nome} é substituída pelo n8n com o nome real do lead.
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? LEGACY_CID;

  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const [settings, integrations] = await Promise.all([
    db.settings.findUnique({
      where: { id: "singleton" },
      select: { whatsappGroupLink: true, campaignName: true },
    }),
    getCampaignIntegrations(campaignId),
  ]);

  const groupLink = settings?.whatsappGroupLink ?? null;
  const candidateName = settings?.campaignName ?? "André Santos";

  // Z-API: prioridade campos do tenant; fallback legado só para André
  const isLegacyCampaign = campaignId === LEGACY_CID;
  const zapi = {
    instance: integrations.zApiInstance ?? (isLegacyCampaign ? LEGACY_ZAPI_INSTANCE : null),
    token: integrations.zApiToken ?? (isLegacyCampaign ? LEGACY_ZAPI_TOKEN : null),
    clientToken: integrations.zApiClientToken ?? (isLegacyCampaign ? LEGACY_ZAPI_CLIENT_TOKEN : null),
  };

  // URL completa para envio (workflow concatena ?token e ?phone) — facilita pra workflow
  const zApiSendTextUrl = zapi.instance && zapi.token
    ? `https://api.z-api.io/instances/${zapi.instance}/token/${zapi.token}/send-text`
    : null;

  return NextResponse.json({
    campaignId,
    candidateName,
    whatsappGroupLink: groupLink,
    messages: {
      // Mensagem de convite — tom pessoal, não parece robô
      invite: `Oi, {nome}! Tudo bem? 😊\n\nSou da equipe do ${candidateName} e vi que você demonstrou interesse em apoiar nossa campanha para 2026.\n\nEstamos montando um grupo de apoiadores no WhatsApp pra ficar mais próximo de quem acredita nessa causa com a gente.\n\nVocê toparia entrar? É rápido, sem compromisso 🙏\n\nResponda *SIM* ou *NÃO*`,

      // Mensagem de boas-vindas quando SIM
      welcome: groupLink
        ? `Que alegria, {nome}! 🎉\n\nObrigado de coração por topar essa caminhada com a gente!\n\nAqui está o link do nosso grupo de apoiadores:\n👉 ${groupLink}\n\nNos vemos lá! Juntos vamos fazer bonito pelo Paraná 🇧🇷💚`
        : `Que alegria, {nome}! 🎉\n\nObrigado por topar estar nessa caminhada com a gente!\n\nEm breve você vai receber o link do nosso grupo de apoiadores. Fique de olho no WhatsApp!\n\nForça, ${candidateName} 💚`,

      // Mensagem quando NÃO
      optOut: `Tudo bem, {nome}! Sem nenhum problema 😊\n\nSe um dia mudar de ideia, pode contar com a gente. A porta tá sempre aberta!\n\nUm abraço 🤝`,
    },
    zapi: {
      instance: zapi.instance,
      token: zapi.token,
      clientToken: zapi.clientToken,
      sendTextUrl: zApiSendTextUrl,
      configured: Boolean(zapi.instance && zapi.token && zapi.clientToken),
    },
  });
}
