import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const [apoiadores, cityRows, grupos] = await Promise.all([
      db.collaborator.count({ where: { campaignId: CID, status: { not: "INACTIVE" } } }),
      db.collaborator.findMany({
        where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
        select: { city: true },
        distinct: ["city"],
      }),
      db.whatsAppGroup.count({ where: { campaignId: CID } }),
    ]);

    return NextResponse.json({
      apoiadores,
      municipios: cityRows.length,
      grupos,
    });
  } catch (err) {
    console.error("[public/stats]", err);
    return NextResponse.json({ apoiadores: 0, municipios: 0, grupos: 0 });
  }
}
