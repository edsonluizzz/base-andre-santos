import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const audience = req.nextUrl.searchParams.get("audience") ?? "ALL";

    let where: Record<string, unknown> = { campaignId: CID };

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
