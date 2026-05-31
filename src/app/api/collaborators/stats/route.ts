import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * GET /api/collaborators/stats
 *
 * KPIs do CRM para o topo de /colaboradores:
 *   total              — todos os colaboradores
 *   confirmados        — supportStatus=CONFIRMADO + status=ACTIVE
 *   negociando         — supportStatus=NEGOCIANDO
 *   neutros            — supportStatus=NEUTRO
 *   adversarios        — supportStatus=ADVERSARIO
 *   leads              — status=LEAD
 *   inativos           — status=INACTIVE
 *   scoreMedio         — média de mobilizationScore (ACTIVE)
 *   contactadosHoje    — count(lastContactedAt >= start_of_today_BRT)
 *
 * Deltas semanais (vs últimos 7d): retorna +/- número absoluto e % de variação
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { db, cid: campaignId } = getCampaignContext(session);

    // Datas em BRT
    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const startOfTodayBRT = new Date(nowBRT); startOfTodayBRT.setHours(0, 0, 0, 0);
    const startOfTodayUTC = new Date(startOfTodayBRT.getTime() + 3 * 60 * 60 * 1000);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      total,
      confirmados, negociando, neutros, adversarios,
      leads, inativos,
      activeWithScore,
      contactadosHoje,
      newLast7d, newPrev7d,
      confirmados7d, confirmadosPrev7d,
    ] = await Promise.all([
      db.collaborator.count({ where: { campaignId } }),
      db.collaborator.count({ where: { campaignId, status: "ACTIVE", supportStatus: "CONFIRMADO" } }),
      db.collaborator.count({ where: { campaignId, supportStatus: "NEGOCIANDO" } }),
      db.collaborator.count({ where: { campaignId, supportStatus: "NEUTRO" } }),
      db.collaborator.count({ where: { campaignId, supportStatus: "ADVERSARIO" } }),
      db.collaborator.count({ where: { campaignId, status: "LEAD" } }),
      db.collaborator.count({ where: { campaignId, status: "INACTIVE" } }),
      db.collaborator.aggregate({
        where: { campaignId, status: "ACTIVE", mobilizationScore: { not: null } },
        _avg: { mobilizationScore: true },
      }),
      db.collaborator.count({ where: { campaignId, lastContactedAt: { gte: startOfTodayUTC } } }),
      db.collaborator.count({ where: { campaignId, createdAt: { gte: sevenDaysAgo } } }),
      db.collaborator.count({ where: { campaignId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      db.collaborator.count({ where: { campaignId, supportStatus: "CONFIRMADO", updatedAt: { gte: sevenDaysAgo } } }),
      db.collaborator.count({ where: { campaignId, supportStatus: "CONFIRMADO", updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    ]);

    function deltaPct(curr: number, prev: number): number {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    }

    return NextResponse.json({
      total,
      confirmados,
      negociando,
      neutros,
      adversarios,
      leads,
      inativos,
      scoreMedio: Math.round(activeWithScore._avg.mobilizationScore ?? 0),
      contactadosHoje,
      delta: {
        newCollaboratorsPct: deltaPct(newLast7d, newPrev7d),
        newCollaboratorsAbs: newLast7d - newPrev7d,
        confirmadosPct: deltaPct(confirmados7d, confirmadosPrev7d),
      },
    });
  } catch (err) {
    console.error("[collaborators/stats]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
