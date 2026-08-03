import { NextRequest, NextResponse } from "next/server";
import { db as globalDb } from "@/lib/db";
import { getCalendarClient } from "@/lib/google-calendar";
import { getCampaignContext } from "@/lib/campaign-context";
import { decrypt } from "@/lib/crypto";
import { cronSecretMatches } from "@/lib/api-auth";
import { syncGoogleCalendar, type GcalSyncResult } from "@/lib/gcal-sync";

// Itera todas as campanhas ativas. Apenas processa as que têm Google Calendar conectado.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronSecretMatches(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await globalDb.campaign.findMany({
      where: { active: true },
      select: { id: true, dbUrl: true },
    });

    const summary: Array<({ campaignId: string; skipped?: string }) & Partial<GcalSyncResult>> = [];

    for (const camp of campaigns) {
      try {
        const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });

        const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
        const refreshToken = decrypt(settings?.googleRefreshToken ?? null);
        if (!refreshToken) {
          summary.push({ campaignId: camp.id, skipped: "no-token" });
          continue;
        }

        const calendar = await getCalendarClient(refreshToken);
        const result = await syncGoogleCalendar(db, calendar, camp.id);
        summary.push({ campaignId: camp.id, ...result });
      } catch (err) {
        console.error(`[gcal-sync] erro na campanha ${camp.id}:`, err);
        summary.push({ campaignId: camp.id, skipped: "error" });
      }
    }

    console.log(`[cron/gcal-sync] campanhas=${summary.length}`, summary);
    return NextResponse.json({ ok: true, campaigns: summary });
  } catch (err) {
    console.error("[cron/gcal-sync]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}
