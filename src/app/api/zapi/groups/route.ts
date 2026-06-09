import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiListGroups, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

/**
 * Lista os grupos REAIS do WhatsApp da campanha (via Z-API) e indica quais
 * já estão vinculados a um registro WhatsAppGroup do roteamento regional.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores" }, { status: 403 });
    }
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const [zapiGroups, linkedRecords] = await Promise.all([
      zapiListGroups(CID),
      db.whatsAppGroup.findMany({
        where: { campaignId: CID, zapiGroupId: { not: null } },
        select: { id: true, name: true, zapiGroupId: true },
      }),
    ]);

    const linkedBy = new Map(linkedRecords.map((r) => [r.zapiGroupId!, { id: r.id, name: r.name }]));

    return NextResponse.json({
      groups: zapiGroups.map((g) => ({
        ...g,
        linkedTo: linkedBy.get(g.id) ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof ZapiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[zapi/groups GET]", err);
    return NextResponse.json(
      { error: "Falha ao consultar grupos na Z-API. Verifique a conexão da instância." },
      { status: 502 }
    );
  }
}
