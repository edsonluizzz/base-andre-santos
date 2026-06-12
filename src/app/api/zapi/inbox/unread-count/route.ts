import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export const dynamic = "force-dynamic";

// Total de mensagens recebidas não lidas (para o badge global do menu WhatsApp).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ count: 0 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ count: 0 });
    const { db, cid } = getCampaignContext(session);

    const count = await db.whatsappMessage.count({
      where: { campaignId: cid, isGroup: false, fromMe: false, read: false },
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("[zapi/inbox/unread-count]", err);
    return NextResponse.json({ count: 0 });
  }
}
