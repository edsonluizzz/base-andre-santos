import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leaders = await db.user.findMany({
      where: {
        registeredCollaborators: { some: { campaignId: CID } },
      },
      select: {
        id: true, name: true, email: true, image: true,
        userCampaigns: {
          where: { campaignId: CID },
          select: { tier: true, role: true },
        },
        registeredCollaborators: {
          where: { campaignId: CID },
          select: { id: true, name: true, status: true, city: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const result = leaders
      .map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        image: l.image,
        tier: l.userCampaigns[0]?.tier ?? "APOIADOR",
        role: l.userCampaigns[0]?.role ?? "MEMBER",
        total: l.registeredCollaborators.length,
        active: l.registeredCollaborators.filter((c) => c.status === "ACTIVE").length,
        leads: l.registeredCollaborators.filter((c) => c.status === "LEAD").length,
        members: l.registeredCollaborators,
      }))
      .sort((a, b) => b.active - a.active);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[celulas GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
