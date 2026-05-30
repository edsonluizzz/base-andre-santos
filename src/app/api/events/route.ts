import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { sendTelegram, buildEventNotification } from "@/lib/telegram";


export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const events = await db.event.findMany({
      where: {
        campaignId: CID,
        ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
      },
      include: {
        zone: { select: { id: true, name: true } },
        _count: { select: { attendances: true, rsvps: true } },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(events);
  } catch (err) {
    console.error("[events GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, type, date, location, notes, zoneId } = await req.json();
    if (!title?.trim() || !date) return NextResponse.json({ error: "Título e data obrigatórios" }, { status: 400 });

    const event = await db.event.create({
      data: {
        campaignId: CID,
        title: title.trim(),
        type: type ?? "REUNIAO",
        date: new Date(date),
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        zoneId: zoneId || null,
      },
      include: { zone: { select: { id: true, name: true } } },
    });

    // Notifica Telegram se o evento for hoje
    const today = new Date();
    const evDate = new Date(date);
    const isToday = evDate.toDateString() === today.toDateString();
    if (isToday) {
      sendTelegram(CID, buildEventNotification("criado", { ...event, date: event.date.toISOString() })).catch(() => {});
    }

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("[events POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
