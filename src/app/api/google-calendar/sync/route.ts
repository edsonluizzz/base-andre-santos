import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCalendarClient } from "@/lib/google-calendar";
import { decrypt } from "@/lib/crypto";
import { syncGoogleCalendar } from "@/lib/gcal-sync";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
    const refreshToken = decrypt(settings?.googleRefreshToken ?? null);
    if (!refreshToken) {
      return NextResponse.json({ error: "Google Calendar não conectado" }, { status: 400 });
    }

    const calendar = await getCalendarClient(refreshToken);
    const result = await syncGoogleCalendar(db, calendar, CID);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[gcal/sync]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db } = getCampaignContext(session);
    await db.settings.update({ where: { id: "singleton" }, data: { googleRefreshToken: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[gcal/sync DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
