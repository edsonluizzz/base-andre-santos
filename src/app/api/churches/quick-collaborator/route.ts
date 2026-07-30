import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db as globalDb } from "@/lib/db";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizePhone } from "@/lib/utils";
import { zapiSendText, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";
import { buildCompleteProfileMessage } from "@/lib/message-templates";

/**
 * Cadastro mínimo de colaborador (nome + telefone) direto do fluxo de
 * atribuição em Igrejas — pra não travar quem ainda não está no sistema.
 * Ao criar, dispara WhatsApp (best-effort) com link de convite pra pessoa
 * completar o próprio cadastro (CPF etc) depois, via /entrar → Google login
 * → /completar-perfil. Como o Collaborator já nasce com o telefone, o merge
 * por phoneNormalized em /api/invite/complete-profile vincula automaticamente
 * esse mesmo registro quando ela completar o cadastro (preserva o id, então
 * as atribuições de igreja já feitas continuam válidas).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid: CID } = getCampaignContext(session);
    const { name, phone } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const zapiPhone = toZapiPhone(phone ?? "");
    if (!zapiPhone) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });

    const collaborator = await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        phone: phone.trim(),
        phoneNormalized: normalizePhone(phone),
        source: "IGREJAS_CADASTRO_RAPIDO",
        registeredById: session.user.id,
      },
      select: { id: true, name: true, phone: true },
    });

    let whatsappStatus: "SENT" | "FAILED" | "SKIPPED" = "SKIPPED";
    let whatsappError: string | null = null;
    try {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL não configurada");

      // Reaproveita um InviteLink padrão (role MEMBER, sem expiração) em vez
      // de criar um novo a cada cadastro — InviteLink vive no banco global.
      let link = await globalDb.inviteLink.findFirst({
        where: { campaignId: CID, role: "MEMBER", expiresAt: null },
        orderBy: { createdAt: "asc" },
      });
      if (!link) {
        link = await globalDb.inviteLink.create({
          data: { campaignId: CID, role: "MEMBER", createdBy: session.user.id },
        });
      }
      const inviteUrl = `${appUrl.replace(/\/$/, "")}/entrar?token=${link.token}`;

      const campaign = await globalDb.campaign.findUnique({ where: { id: CID }, select: { candidateName: true, name: true } });
      const candidateName = campaign?.candidateName ?? campaign?.name ?? "nossa campanha";

      const message = buildCompleteProfileMessage(collaborator.name, inviteUrl, candidateName);
      await zapiSendText(CID, zapiPhone, message);
      whatsappStatus = "SENT";
    } catch (err) {
      whatsappStatus = "FAILED";
      whatsappError = err instanceof ZapiNotConfiguredError
        ? "WhatsApp não configurado"
        : err instanceof Error ? err.message : "Falha ao enviar WhatsApp";
      console.error("[churches/quick-collaborator] falha ao notificar:", err);
    }

    return NextResponse.json({ id: collaborator.id, name: collaborator.name, whatsappStatus, whatsappError });
  } catch (err) {
    console.error("[churches/quick-collaborator POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
