import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json([], { status: 200 });

    const rows = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    });

    return NextResponse.json(rows.map((r) => r.city).filter(Boolean));
  } catch {
    return NextResponse.json([]);
  }
}
