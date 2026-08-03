import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCalendarClient } from "@/lib/google-calendar";
import { decrypt } from "@/lib/crypto";
import { forceSyncFromGoogle } from "@/lib/gcal-sync";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);

    const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
    const refreshToken = decrypt(settings?.googleRefreshToken ?? null);
    if (!refreshToken) {
      return NextResponse.json({ error: "Google Calendar não conectado" }, { status: 400 });
    }

    const calendar = await getCalendarClient(refreshToken);
    const result = await forceSyncFromGoogle(db, calendar, cid);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[gcal/force-sync]", err);
    return NextResponse.json({ error: "Erro ao corrigir com o Google" }, { status: 500 });
  }
}
