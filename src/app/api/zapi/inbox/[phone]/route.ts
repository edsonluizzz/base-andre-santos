import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiSendText, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET: mensagens da conversa (ordem cronológica) + marca as recebidas como lidas.
// O parâmetro [phone] é o phoneNormalized (últimos 8 dígitos) usado para agrupar.
export async function GET(_req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);

    const pNorm = params.phone.replace(/\D/g, "").slice(-8);

    const messages = await db.whatsappMessage.findMany({
      where: { campaignId: cid, phoneNormalized: pNorm, isGroup: false },
      orderBy: { timestamp: "asc" },
      take: 200,
    });

    // Marca as recebidas (não minhas) como lidas.
    await db.whatsappMessage.updateMany({
      where: { campaignId: cid, phoneNormalized: pNorm, fromMe: false, read: false },
      data: { read: true },
    }).catch(() => {});

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[zapi/inbox/[phone] GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST: responde à conversa. Envia via Z-API e grava a mensagem (fromMe) para o
// thread ficar coerente (a Z-API não reenvia o que nós mandamos).
export async function POST(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);

    const { message } = (await req.json().catch(() => ({}))) as { message?: string };
    const text = message?.trim();
    if (!text) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Mensagem longa demais" }, { status: 400 });

    const pNorm = params.phone.replace(/\D/g, "").slice(-8);

    // Recupera o telefone completo (com DDI) da última mensagem da conversa.
    const last = await db.whatsappMessage.findFirst({
      where: { campaignId: cid, phoneNormalized: pNorm, isGroup: false },
      orderBy: { timestamp: "desc" },
      select: { phone: true },
    });
    if (!last?.phone) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    const to = toZapiPhone(last.phone) ?? last.phone.replace(/\D/g, "");
    const result = await zapiSendText(cid, to, text);
    if (!result?.messageId) {
      return NextResponse.json({ error: "Z-API não enfileirou a mensagem" }, { status: 502 });
    }

    const saved = await db.whatsappMessage.create({
      data: {
        campaignId: cid,
        phone: last.phone,
        phoneNormalized: normalizePhone(last.phone),
        fromMe: true,
        senderName: null,
        type: "text",
        body: text,
        zapiMessageId: result.messageId,
        isGroup: false,
        read: true,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: saved });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/inbox/[phone] POST]", err);
    return NextResponse.json({ error: "Falha ao enviar" }, { status: 502 });
  }
}
