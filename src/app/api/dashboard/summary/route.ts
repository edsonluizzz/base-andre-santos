import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const [total, byRole, byCityRaw, groups, upcomingEvents] = await Promise.all([
      db.collaborator.count({ where: { campaignId: CID, status: "ACTIVE" } }),
      db.collaborator.groupBy({ by: ["campaignRole"], where: { campaignId: CID, status: "ACTIVE" }, _count: { id: true } }),
      db.collaborator.groupBy({ by: ["city"], where: { campaignId: CID, status: "ACTIVE", city: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
      db.whatsAppGroup.count({ where: { campaignId: CID } }),
      db.event.findMany({ where: { campaignId: CID, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 5, select: { id: true, title: true, type: true, date: true, location: true } }),
    ]);

    const roleMap = Object.fromEntries(byRole.map((r) => [r.campaignRole, r._count.id]));
    const topCities = byCityRaw.map((c) => ({ city: c.city, count: c._count.id }));

    return NextResponse.json({ total, roleMap, topCities, groups, upcomingEvents });
  } catch (err) {
    console.error("[dashboard/summary]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
