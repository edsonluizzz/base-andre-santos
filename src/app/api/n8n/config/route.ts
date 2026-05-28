import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
 * - Mensagem de convite (template)
 * - Mensagem de boas-vindas após confirmação
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.settings.findUnique({
    where: { id: "singleton" },
    select: { whatsappGroupLink: true, campaignName: true },
  });

  const groupLink = settings?.whatsappGroupLink ?? null;

  return NextResponse.json({
    whatsappGroupLink: groupLink,
    // Templates de mensagem — edite aqui conforme necessário
    messages: {
      invite: `Olá {nome}! 👋\n\nSou da equipe do André Santos e estamos organizando nossa base de apoio para 2026.\n\nVocê toparia fazer parte do nosso grupo de apoiadores no WhatsApp?\n\nResponda *SIM* ou *NÃO* 👇`,
      welcome: groupLink
        ? `Que ótimo, {nome}! 🎉\n\nSeja muito bem-vindo(a) ao grupo de apoiadores do André Santos!\n\nEntre aqui 👇\n${groupLink}\n\nJuntos faremos história no Paraná! 🇧🇷`
        : null,
      optOut: `Tudo bem, {nome}! Sem problemas. Se mudar de ideia, estaremos por aqui. 🙏`,
    },
  });
}
