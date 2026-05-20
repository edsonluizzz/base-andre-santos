import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { calcMobilizationScore } from "@/lib/mobilization";


export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const collaborators = await db.collaborator.findMany({
      where: { campaignId: CID },
      select: { id: true, profile: true, supportStatus: true, status: true, contributionTypes: true },
    });

    // Count PRESENT attendances per collaborator in one query
    const attendanceCounts = await db.attendance.groupBy({
      by: ["collaboratorId"],
      where: { collaboratorId: { not: null }, status: "PRESENT" },
      _count: { id: true },
    });
    const attendanceMap = Object.fromEntries(
      attendanceCounts.map((a) => [a.collaboratorId!, a._count.id]),
    );

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
                attendanceCount: attendanceMap[c.id] ?? 0,
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
