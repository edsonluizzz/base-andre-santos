import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const goals = await db.municipalityGoal.findMany({
      where: { campaignId: CID },
      orderBy: { city: "asc" },
    });

    return NextResponse.json(goals);
  } catch (err) {
    console.error("[municipality-goals GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { city, targetVotes, targetLeaders } = await req.json();
    if (!city?.trim()) return NextResponse.json({ error: "Cidade obrigatória" }, { status: 400 });

    const goal = await db.municipalityGoal.upsert({
      where: { campaignId_city: { campaignId: CID, city: city.trim() } },
      update: {
        targetVotes: Number(targetVotes) || 0,
        targetLeaders: Number(targetLeaders) || 0,
      },
      create: {
        campaignId: CID,
        city: city.trim(),
        targetVotes: Number(targetVotes) || 0,
        targetLeaders: Number(targetLeaders) || 0,
      },
    });

    return NextResponse.json(goal);
  } catch (err) {
    console.error("[municipality-goals PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { city } = await req.json();
    if (!city) return NextResponse.json({ error: "Cidade obrigatória" }, { status: 400 });

    await db.municipalityGoal.deleteMany({ where: { campaignId: CID, city } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[municipality-goals DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
