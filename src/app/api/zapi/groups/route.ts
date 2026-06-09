import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { zapiListGroups, ZapiNotConfiguredError } from "@/lib/zapi";

export const dynamic = "force-dynamic";

/**
 * Lista os grupos REAIS do WhatsApp da campanha (via Z-API) com a config de
 * roteamento regional de cada um (registro WhatsAppGroup espelhado), além dos
 * registros órfãos (cadastros manuais antigos sem grupo real vinculado).
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

    const [zapiGroups, records] = await Promise.all([
      zapiListGroups(CID),
      db.whatsAppGroup.findMany({
        where: { campaignId: CID },
        select: { id: true, name: true, region: true, isFallback: true, inviteLink: true, zapiGroupId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const byZapiId = new Map(records.filter((r) => r.zapiGroupId).map((r) => [r.zapiGroupId!, r]));

    return NextResponse.json({
      groups: zapiGroups.map((g) => {
        const rec = byZapiId.get(g.id);
        return {
          id: g.id,
          name: g.name,
          record: rec
            ? { id: rec.id, region: rec.region, isFallback: rec.isFallback, inviteLink: rec.inviteLink }
            : null,
        };
      }),
      // Cadastros manuais antigos — sem vínculo com grupo real (candidatos a exclusão)
      orphans: records
        .filter((r) => !r.zapiGroupId)
        .map((r) => ({ id: r.id, name: r.name, region: r.region, isFallback: r.isFallback })),
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
