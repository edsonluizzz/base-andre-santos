import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { sendBroadcastEmails, isEmailConfigured } from "@/lib/email";
import { sendTelegram, buildBroadcastMessage, isTelegramConfigured } from "@/lib/telegram";
import type { CollaboratorRole, CollaboratorStatus } from "@prisma/client";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const broadcasts = await db.broadcast.findMany({
      where: { campaignId: CID },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(broadcasts);
  } catch (err) {
    console.error("[broadcasts GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function audienceWhere(audience: string) {
  if (audience === "LEAD")   return { status: "LEAD" as CollaboratorStatus };
  if (audience === "ACTIVE") return { status: "ACTIVE" as CollaboratorStatus };
  if (audience.startsWith("ROLE:")) return { campaignRole: audience.replace("ROLE:", "") as CollaboratorRole, status: "ACTIVE" as CollaboratorStatus };
  if (audience.startsWith("CITY:")) return { city: audience.replace("CITY:", ""), status: "ACTIVE" as CollaboratorStatus };
  return { status: { in: ["ACTIVE", "LEAD"] as CollaboratorStatus[] } };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, message, audience } = await req.json();
    if (!title?.trim() || !message?.trim()) return NextResponse.json({ error: "Título e mensagem obrigatórios" }, { status: 400 });

    const aud = audience ?? "ALL";

    // Busca destinatários com email
    const emailSent = isEmailConfigured();
    let emailsSent = 0;

    if (emailSent) {
      const recipients = await db.collaborator.findMany({
        where: { campaignId: CID, email: { not: null }, ...audienceWhere(aud) },
        select: { email: true, name: true },
      });
      const list = recipients.filter((r) => r.email).map((r) => ({ email: r.email!, name: r.name }));
      emailsSent = await sendBroadcastEmails(list, title.trim(), message.trim());
    }

    // Envia para Telegram (não aguarda resposta para não travar)
    const telegramSent = isTelegramConfigured();
    if (telegramSent) {
      sendTelegram(buildBroadcastMessage(title.trim(), message.trim())).catch(() => {});
    }

    const broadcast = await db.broadcast.create({
      data: {
        campaignId: CID,
        title: title.trim(),
        message: message.trim(),
        audience: aud,
        sentCount: emailsSent,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ ...broadcast, emailsSent, telegramSent }, { status: 201 });
  } catch (err) {
    console.error("[broadcasts POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
