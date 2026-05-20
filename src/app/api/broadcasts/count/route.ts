import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const audience = req.nextUrl.searchParams.get("audience") ?? "ALL";

    const where: Record<string, unknown> = { campaignId: CID };

    if (audience === "LEAD") {
      where.status = "LEAD";
    } else if (audience === "ACTIVE") {
      where.status = "ACTIVE";
    } else if (audience.startsWith("ROLE:")) {
      where.campaignRole = audience.replace("ROLE:", "");
      where.status = "ACTIVE";
    } else if (audience.startsWith("CITY:")) {
      where.city = audience.replace("CITY:", "");
      where.status = "ACTIVE";
    } else {
      // ALL
      where.status = { in: ["ACTIVE", "LEAD"] };
    }

    const count = await db.collaborator.count({ where });
    return NextResponse.json({ count });
  } catch (err) {
    console.error("[broadcasts/count]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
