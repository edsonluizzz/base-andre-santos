"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TIER_LABEL } from "@/lib/contribution";
const TIER_COLOR: Record<string, string> = {
  APOIADOR: "text-slate-400", ATIVISTA: "text-blue-400", LIDER_CELULA: "text-green-400", COORDENADOR: "text-yellow-400",
};
const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

type Leader = {
  id: string; name: string | null; image: string | null;
  tier: string; total: number; active: number; leads: number; conv: number;
};

export default function RankingPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((d) => { setLeaders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxActive = leaders[0]?.active ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" /> Ranking de Líderes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Quem mais está movimentando a base de apoio</p>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.08]" style={{ background: "rgba(13,27,42,0.5)" }}>
            <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-white/[0.04] animate-pulse">
              <div className="w-6 h-6 rounded bg-white/[0.06] shrink-0" />
              <div className="w-7 h-7 rounded-full bg-white/[0.06] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                <div className="h-2 bg-white/[0.04] rounded w-1/5" />
              </div>
              <div className="h-4 w-8 bg-white/[0.04] rounded hidden sm:block" />
              <div className="h-4 w-8 bg-white/[0.04] rounded hidden sm:block" />
              <div className="h-4 w-8 bg-white/[0.04] rounded hidden sm:block" />
            </div>
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum dado de ranking ainda</p>
        </div>
      ) : (
        <>
          {/* ─── Mobile: cards verticais com todas as métricas ─── */}
          <div className="lg:hidden space-y-2">
            {leaders.map((l, i) => (
              <div
                key={l.id}
                className={`glass-card rounded-xl border border-white/[0.08] p-3 ${i < 3 ? "bg-primary/[0.02]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 text-center shrink-0">
                    {MEDAL[i] ? (
                      <span className="text-2xl">{MEDAL[i]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={l.image ?? ""} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {l.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{l.name ?? "—"}</p>
                    <p className={`text-[10px] uppercase tracking-wider ${TIER_COLOR[l.tier]}`}>{TIER_LABEL[l.tier]}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-green-500/[0.06] border border-green-500/15 py-1.5">
                    <p className="text-base font-bold text-green-400 leading-none">{l.active}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Ativos</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-1.5">
                    <p className="text-base font-bold text-foreground leading-none">{l.total}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Cadastros</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 py-1.5">
                    <p className="text-base font-bold text-amber-400 leading-none">{l.leads}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Leads</p>
                  </div>
                  <div className={`rounded-lg border py-1.5 ${l.conv >= 50 ? "bg-green-500/[0.06] border-green-500/15" : l.conv >= 25 ? "bg-yellow-500/[0.06] border-yellow-500/15" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <p className={`text-base font-bold leading-none ${l.conv >= 50 ? "text-green-400" : l.conv >= 25 ? "text-yellow-400" : "text-slate-400"}`}>{l.conv}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Conv.</p>
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-green-500/70 rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (l.active / maxActive) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ─── Desktop: tabela grid ─── */}
          <div className="hidden lg:block glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="grid grid-cols-[1.5rem_1fr_4.5rem_4.5rem_4.5rem_4.5rem] gap-2 px-4 py-2.5 border-b border-white/[0.08] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ background: "rgba(13,27,42,0.5)" }}>
              <span>#</span>
              <span>Líder</span>
              <span className="text-center text-green-400/80">Ativos</span>
              <span className="text-center">Cadastros</span>
              <span className="text-center text-amber-400/80">Leads</span>
              <span className="text-center">Conv.</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {leaders.map((l, i) => (
                <div
                  key={l.id}
                  className={`grid grid-cols-[1.5rem_1fr_4.5rem_4.5rem_4.5rem_4.5rem] gap-2 px-4 py-3 items-center transition-colors hover:bg-white/[0.02] ${i < 3 ? "bg-primary/[0.02]" : ""}`}
                >
                  <span className="text-sm font-bold text-center">
                    {MEDAL[i] ?? <span className="text-muted-foreground text-xs">{i + 1}</span>}
                  </span>

                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={l.image ?? ""} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {l.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.name ?? "—"}</p>
                      <p className={`text-[10px] ${TIER_COLOR[l.tier]}`}>{TIER_LABEL[l.tier]}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-bold text-green-400">{l.active}</span>
                    <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${Math.min(100, (l.active / maxActive) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-center text-sm font-semibold text-foreground">{l.total}</span>
                  <span className="text-center text-sm text-amber-400">{l.leads}</span>
                  <span className={`text-center text-sm font-semibold ${l.conv >= 50 ? "text-green-400" : l.conv >= 25 ? "text-yellow-400" : "text-slate-400"}`}>
                    {l.conv}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
