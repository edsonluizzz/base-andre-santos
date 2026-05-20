import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { calcMobilizationScore } from "@/lib/mobilization";


export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const event = await db.event.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const attendances = await db.attendance.findMany({
      where: { eventId: params.id, collaboratorId: { not: null } },
      include: {
        collaborator: { select: { id: true, name: true, city: true, campaignRole: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(attendances);
  } catch (err) {
    console.error("[attendance GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await db.event.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { attendances } = (await req.json()) as {
      attendances: { collaboratorId: string; status: string; justification?: string }[];
    };

    if (!Array.isArray(attendances)) {
      return NextResponse.json({ error: "attendances deve ser um array" }, { status: 400 });
    }

    const collaboratorIds = attendances.map((a) => a.collaboratorId);

    await db.$transaction(
      async (tx) => {
        if (collaboratorIds.length > 0) {
          await tx.attendance.deleteMany({
            where: { eventId: params.id, collaboratorId: { in: collaboratorIds } },
          });
        }
        if (attendances.length > 0) {
          await tx.attendance.createMany({
            data: attendances.map((a) => ({
              eventId: params.id,
              collaboratorId: a.collaboratorId,
              status: a.status as "PRESENT" | "ABSENT" | "JUSTIFIED",
              justification: a.justification ?? null,
            })),
          });
        }
      },
      { timeout: 30000 },
    );

    // Recalculate mobilization scores for affected collaborators
    const collaborators = await db.collaborator.findMany({
      where: { id: { in: collaboratorIds }, campaignId: CID },
      select: { id: true, profile: true, supportStatus: true, status: true, contributionTypes: true },
    });

    await Promise.all(
      collaborators.map(async (c) => {
        const attendanceCount = await db.attendance.count({
          where: { collaboratorId: c.id, status: "PRESENT" },
        });
        const score = calcMobilizationScore({
          profile: c.profile,
          supportStatus: c.supportStatus,
          status: c.status,
          contributionTypes: c.contributionTypes,
          attendanceCount,
        });
        await db.collaborator.update({ where: { id: c.id }, data: { mobilizationScore: score } });
      }),
    );

    return NextResponse.json({ ok: true, saved: attendances.length });
  } catch (err) {
    console.error("[attendance POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
