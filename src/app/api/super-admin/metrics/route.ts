import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET() {
  try {
    const session = await auth();
    const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid } = getCampaignContext(session!);

    const [users, collaborators, zones, groups] = await Promise.all([
      db.user.count(),
      db.collaborator.count({ where: { campaignId: cid } }),
      db.zone.count({ where: { campaignId: cid } }),
      db.whatsAppGroup.count({ where: { campaignId: cid } }),
    ]);

    return NextResponse.json({ users, collaborators, zones, groups });
  } catch (err) {
    console.error("[super-admin metrics]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
