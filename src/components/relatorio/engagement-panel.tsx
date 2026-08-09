import type { PrismaClient } from "@prisma/client";
import { Trophy, AlertTriangle } from "lucide-react";

interface EngagementPanelProps {
  db: PrismaClient;
  cid: string;
}

export async function EngagementPanel({ db, cid: CID }: EngagementPanelProps) {
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Atendances precisam ser filtradas pelo tenant — só conta presenças de collaborators desta campanha
  const tenantCollabs = await db.collaborator.findMany({
    where: { campaignId: CID },
    select: { id: true },
  });
  const tenantCollabIds = tenantCollabs.map((c) => c.id);

  const [topAttendance, staleActive] = await Promise.all([
    // Top 5 por presenças confirmadas — restrito aos collaborators do tenant
    tenantCollabIds.length === 0
      ? Promise.resolve([] as Array<{ collaboratorId: string | null; _count: { id: number } }>)
      : db.attendance.groupBy({
          by: ["collaboratorId"],
          where: {
            status: "PRESENT",
            collaboratorId: { in: tenantCollabIds },
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
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

  if (topAttendance.length === 0 && staleActive.length === 0) return null;

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
