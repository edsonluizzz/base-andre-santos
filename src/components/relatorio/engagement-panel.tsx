import { db } from "@/lib/db";

const CID = "andre-santos-2026";
import { Trophy, Zap, AlertTriangle } from "lucide-react";


export async function EngagementPanel() {
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [topAttendance, topScores, staleActive] = await Promise.all([
    // Top 5 por presenças confirmadas
    db.attendance.groupBy({
      by: ["collaboratorId"],
      where: { status: "PRESENT", collaboratorId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    // Top 5 por score de mobilização
    db.collaborator.findMany({
      where: { campaignId: CID, status: "ACTIVE", mobilizationScore: { not: null } },
      select: { id: true, name: true, city: true, mobilizationScore: true, campaignRole: true },
      orderBy: { mobilizationScore: "desc" },
      take: 5,
    }),
    // Inativos: ACTIVE mas sem interação há 30d+ (sem lastContactedAt ou antigo)
    db.collaborator.findMany({
      where: {
        campaignId: CID,
        status: "ACTIVE",
        OR: [
          { lastContactedAt: null },
          { lastContactedAt: { lt: thirtyDaysAgo } },
        ],
      },
      select: { id: true, name: true, city: true, lastContactedAt: true },
      orderBy: { lastContactedAt: "asc" },
      take: 6,
    }),
  ]);

  // Enriquece top attendance com nome dos colaboradores
  const collabIds = topAttendance.map((a) => a.collaboratorId!);
  const collabNames = collabIds.length > 0
    ? await db.collaborator.findMany({
        where: { id: { in: collabIds } },
        select: { id: true, name: true, city: true },
      })
    : [];
  const collabMap = Object.fromEntries(collabNames.map((c) => [c.id, c]));

  const ROLE_SHORT: Record<string, string> = {
    COORD_GERAL: "C.Geral", COORD_REGIONAL: "C.Regional",
    LIDER_MUNICIPAL: "L.Municipal", LIDER_BAIRRO: "L.Bairro", VOLUNTARIO: "Vol.",
  };

  if (topAttendance.length === 0 && topScores.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-6">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> Engajamento
      </h2>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* Top presenças */}
        {topAttendance.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
              Mais presentes em eventos
            </p>
            <div className="space-y-2">
              {topAttendance.map((a, i) => {
                const c = collabMap[a.collaboratorId!];
                if (!c) return null;
                return (
                  <div key={a.collaboratorId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/50 w-4 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      {c.city && <p className="text-[10px] text-muted-foreground">{c.city}</p>}
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0">{a._count.id}×</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top scores */}
        {topScores.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Maior score de mobilização
            </p>
            <div className="space-y-2">
              {topScores.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/50 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_SHORT[c.campaignRole] ?? c.campaignRole}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-primary">{c.mobilizationScore}</span>
                    <div className="w-12 h-1 bg-white/[0.06] rounded-full mt-0.5">
                      <div className="h-full bg-primary/50 rounded-full" style={{ width: `${c.mobilizationScore!}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas reativação */}
        {staleActive.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Sem contato há 30d+
            </p>
            <div className="space-y-2">
              {staleActive.map((c) => {
                const days = c.lastContactedAt
                  ? Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000)
                  : null;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      {c.city && <p className="text-[10px] text-muted-foreground">{c.city}</p>}
                    </div>
                    <span className="text-[10px] text-amber-400/80 shrink-0">
                      {days !== null ? `${days}d` : "nunca"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
