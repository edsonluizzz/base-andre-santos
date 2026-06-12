import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export const dynamic = "force-dynamic";

// Lista as conversas (1:1) do inbox de WhatsApp, agrupadas por telefone, com a
// última mensagem, contagem de não-lidas e o nome do colaborador (se houver).
// MVP: agrupa em memória sobre as últimas mensagens (suficiente para o volume atual).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);

    const recent = await db.whatsappMessage.findMany({
      where: { campaignId: cid, isGroup: false },
      orderBy: { timestamp: "desc" },
      take: 500,
    });

    type Conv = {
      key: string;
      phone: string;
      name: string | null;
      collaboratorId: string | null;
      lastBody: string | null;
      lastType: string;
      lastFromMe: boolean;
      lastTimestamp: Date;
      unread: number;
    };
    const map = new Map<string, Conv>();
    for (const m of recent) {
      const key = m.phoneNormalized ?? m.phone;
      if (!map.has(key)) {
        map.set(key, {
          key,
          phone: m.phone,
          name: null,
          collaboratorId: null,
          lastBody: m.body,
          lastType: m.type,
          lastFromMe: m.fromMe,
          lastTimestamp: m.timestamp,
          unread: 0,
        });
      }
      if (!m.read && !m.fromMe) map.get(key)!.unread++;
    }

    const keys = [...map.keys()];
    if (keys.length > 0) {
      const collabs = await db.collaborator.findMany({
        where: { campaignId: cid, phoneNormalized: { in: keys } },
        select: { id: true, name: true, phoneNormalized: true },
      });
      for (const c of collabs) {
        const conv = c.phoneNormalized ? map.get(c.phoneNormalized) : undefined;
        if (conv) { conv.name = c.name; conv.collaboratorId = c.id; }
      }
    }

    const conversations = [...map.values()].sort(
      (a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime(),
    );

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[zapi/inbox GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
