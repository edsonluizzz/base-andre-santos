import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calcMobilizationScore } from "@/lib/mobilization";

const CID = "andre-santos-2026";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const collaborators = await db.collaborator.findMany({
      where: { campaignId: CID },
      select: { id: true, profile: true, supportStatus: true, status: true, contributionTypes: true },
    });

    let updated = 0;
    const BATCH = 50;
    for (let i = 0; i < collaborators.length; i += BATCH) {
      const batch = collaborators.slice(i, i + BATCH);
      await Promise.all(
        batch.map((c) =>
          db.collaborator.update({
            where: { id: c.id },
            data: {
              mobilizationScore: calcMobilizationScore({
                profile: c.profile,
                supportStatus: c.supportStatus,
                status: c.status,
                contributionTypes: c.contributionTypes,
              }),
            },
          })
        )
      );
      updated += batch.length;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("[recalc-scores]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
