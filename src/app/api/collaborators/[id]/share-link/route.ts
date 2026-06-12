import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiSendText, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

// Envia, pelo número da campanha (Z-API), o link de indicação do colaborador
// para o WhatsApp DELE, com uma mensagem motivacional — para ele repassar aos
// amigos e fazer a rede crescer. Só ADMIN (envio pelo número da campanha).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);

    const collab = await db.collaborator.findFirst({
      where: { id: params.id, campaignId: cid },
      select: { id: true, name: true, phone: true },
    });
    if (!collab) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    if (!collab.phone) return NextResponse.json({ error: "Colaborador sem telefone" }, { status: 400 });

    const to = toZapiPhone(collab.phone);
    if (!to) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });

    const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
    const url = `${base}/cadastro?refc=${collab.id}`;
    const firstName = collab.name.split(" ")[0] || "";

    const message =
      `Olá, ${firstName}! 🎉\n\n` +
      `Agora que você já faz parte do nosso time, compartilhe com seus amigos e ajude a nossa rede de apoio a crescer ainda mais! 💪\n\n` +
      `É só enviar este link para eles se cadastrarem — cada pessoa que entrar pelo seu link fica vinculada a você:\n${url}`;

    const result = await zapiSendText(cid, to, message);
    if (!result?.messageId) {
      return NextResponse.json({ error: "Z-API aceitou mas não enfileirou a mensagem" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[collaborators/share-link]", err);
    return NextResponse.json({ error: "Falha ao enviar o link pelo WhatsApp" }, { status: 502 });
  }
}
