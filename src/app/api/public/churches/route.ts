import { NextRequest, NextResponse } from "next/server";
import { resolvePublicTenant } from "@/lib/tenant-resolver";

export async function GET(req: NextRequest) {
  try {
    const { db, cid: CID } = await resolvePublicTenant(req);

    const churches = await db.church.findMany({
      where: { campaignId: CID },
      select: { id: true, name: true, regional: true },
      orderBy: [{ regional: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      { churches },
      {
        // Lista muda raramente (importação manual pela equipe) — cache de 5min tolera atraso.
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (err) {
    console.error("[public/churches]", err);
    return NextResponse.json({ churches: [] });
  }
}
