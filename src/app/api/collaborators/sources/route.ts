import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const IMPORT_SOURCES = ["IMPORTACAO_CSV", "IMPORTACAO_XLSX"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const rows = await db.collaborator.findMany({
      where: {
        campaignId: cid,
        source: { not: null, notIn: IMPORT_SOURCES },
      },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
    });

    const sources = rows
      .map((r) => r.source)
      .filter((s): s is string => Boolean(s));

    return NextResponse.json(sources);
  } catch (err) {
    console.error("[collaborators/sources GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
