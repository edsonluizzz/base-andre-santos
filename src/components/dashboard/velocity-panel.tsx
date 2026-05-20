import { db } from "@/lib/db";

const CID = "andre-santos-2026";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";


export async function VelocityPanel() {
  const now        = new Date();
  const weekStart  = new Date(now); weekStart.setDate(weekStart.getDate() - 7);  weekStart.setHours(0, 0, 0, 0);
  const week2Start = new Date(now); week2Start.setDate(week2Start.getDate() - 14); week2Start.setHours(0, 0, 0, 0);

  const [thisWeekRaw, lastWeekRaw] = await Promise.all([
    db.collaborator.groupBy({
      by: ["city"],
      where: { campaignId: CID, createdAt: { gte: weekStart }, city: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    db.collaborator.groupBy({
      by: ["city"],
      where: { campaignId: CID, createdAt: { gte: week2Start, lt: weekStart }, city: { not: null } },
      _count: { id: true },
    }),
  ]);

  const lastWeekMap = Object.fromEntries(lastWeekRaw.map((r) => [r.city!, r._count.id]));
  const thisWeekMap = Object.fromEntries(thisWeekRaw.map((r) => [r.city!, r._count.id]));

  const thisWeekTotal = thisWeekRaw.reduce((s, r) => s + r._count.id, 0);
  const lastWeekTotal = lastWeekRaw.reduce((s, r) => s + r._count.id, 0);
  const weekDelta     = thisWeekTotal - lastWeekTotal;

  // Top crescendo: cidades com atividade esta semana, ordenadas por delta
  const growing = thisWeekRaw
    .map((r) => ({
      city: r.city!,
      thisWeek: r._count.id,
      lastWeek: lastWeekMap[r.city!] ?? 0,
      delta: r._count.id - (lastWeekMap[r.city!] ?? 0),
    }))
    .sort((a, b) => b.thisWeek - a.thisWeek)
    .slice(0, 6);

  // Estagnadas: tinham atividade semana passada, zero esta semana
  const stagnating = lastWeekRaw
    .filter((r) => !thisWeekMap[r.city!])
    .map((r) => ({ city: r.city!, lastWeek: r._count.id }))
    .sort((a, b) => b.lastWeek - a.lastWeek)
    .slice(0, 4);

  if (growing.length === 0 && stagnating.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Velocidade por Município</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Esta semana vs semana anterior</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">{thisWeekTotal}</span>
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            weekDelta > 0 ? "text-green-400" : weekDelta < 0 ? "text-red-400" : "text-muted-foreground"
          }`}>
            {weekDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : weekDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {weekDelta > 0 ? `+${weekDelta}` : weekDelta}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Crescendo */}
        {growing.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Crescendo</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {growing.map(({ city, thisWeek, lastWeek, delta }) => (
                <div key={city} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.06]">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{city}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lastWeek > 0 ? `era ${lastWeek}` : "novo"}
                    </p>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <p className="text-sm font-bold text-green-400">+{thisWeek}</p>
                    {delta > 0 && (
                      <p className="text-[9px] text-green-400/60">↑{delta}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estagnadas */}
        {stagnating.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Estagnadas (0 novos esta semana)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stagnating.map(({ city, lastWeek }) => (
                <div key={city} className="flex items-center justify-between rounded-xl px-3 py-2 bg-amber-500/[0.04] border border-amber-500/20">
                  <p className="text-xs text-foreground truncate flex-1">{city}</p>
                  <p className="text-[10px] text-amber-400/70 ml-1 shrink-0">{lastWeek} ant.</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
