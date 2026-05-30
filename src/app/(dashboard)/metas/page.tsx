import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { redirect } from "next/navigation";
import { MetasClient } from "./MetasClient";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { db, cid: CID } = getCampaignContext(session);
  const role = (session.user as { role?: string }).role ?? "MEMBER";
  if (!["LEADER", "ADMIN"].includes(role)) redirect("/dashboard");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [goals, cityRaw, recentGrowthRaw] = await Promise.all([
    db.municipalityGoal.findMany({ where: { campaignId: CID }, orderBy: { city: "asc" } }),
    db.collaborator.findMany({
      where: { campaignId: CID, status: "ACTIVE", city: { not: null } },
      select: { city: true, supportStatus: true, campaignRole: true },
    }),
    db.collaborator.groupBy({
      by: ["city"],
      where: { campaignId: CID, status: "ACTIVE", createdAt: { gte: thirtyDaysAgo }, city: { not: null } },
      _count: { id: true },
    }),
  ]);

  // Agregar ativos por cidade
  type CityAgg = { ativos: number; confirmados: number; hasLeader: boolean };
  const cityAgg: Record<string, CityAgg> = {};
  for (const c of cityRaw) {
    const city = c.city!;
    if (!cityAgg[city]) cityAgg[city] = { ativos: 0, confirmados: 0, hasLeader: false };
    cityAgg[city].ativos++;
    if (c.supportStatus === "CONFIRMADO") cityAgg[city].confirmados++;
    if (["COORD_GERAL", "COORD_REGIONAL", "LIDER_MUNICIPAL", "LIDER_BAIRRO"].includes(c.campaignRole)) {
      cityAgg[city].hasLeader = true;
    }
  }

  // Crescimento semanal médio (últimos 30 dias / 4,3 semanas) por cidade
  const weeklyGrowthMap = Object.fromEntries(
    recentGrowthRaw.map((r) => [r.city!, +(r._count.id / 4.3).toFixed(1)])
  );

  // Serializar para o client component (sem instâncias Prisma)
  const serializedGoals = goals.map((g) => ({
    id: g.id,
    city: g.city,
    targetVotes: g.targetVotes,
    targetLeaders: g.targetLeaders,
  }));

  return (
    <MetasClient
      goals={serializedGoals}
      cityAgg={cityAgg}
      weeklyGrowthMap={weeklyGrowthMap}
    />
  );
}
