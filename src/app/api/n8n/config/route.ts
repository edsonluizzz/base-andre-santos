import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/config
 *
 * Retorna configurações usadas pelos workflows n8n:
 * - Link do grupo WhatsApp
 * - Nome da campanha
 * - Templates de mensagem humanizados (convite, boas-vindas, opt-out)
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
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const settings = await db.settings.findUnique({
    where: { id: "singleton" },
    select: { whatsappGroupLink: true, campaignName: true },
  });

  const groupLink = settings?.whatsappGroupLink ?? null;
  const candidateName = settings?.campaignName ?? "André Santos";

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
  });
}
