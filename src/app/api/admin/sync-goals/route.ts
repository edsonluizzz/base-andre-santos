import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCityGoal } from "@/lib/municipality-goals";

const CID = "andre-santos-2026";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rows = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    let created = 0;
    for (const { city } of rows) {
      const before = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      await ensureCityGoal(city);
      const after = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      if (after > before) created++;
    }

    return NextResponse.json({ ok: true, created, total: rows.length });
  } catch (err) {
    console.error("[sync-goals]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
