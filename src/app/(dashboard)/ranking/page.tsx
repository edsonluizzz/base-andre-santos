"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TIER_LABEL: Record<string, string> = {
  APOIADOR: "Apoiador", ATIVISTA: "Ativista", LIDER_CELULA: "Líder de Célula", COORDENADOR: "Coordenador",
};
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
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : leaders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum dado de ranking ainda</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-2.5 border-b border-white/[0.08] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ background: "rgba(13,27,42,0.5)" }}>
            <span>#</span>
            <span>Líder</span>
            <span className="text-center">Cadastros</span>
            <span className="text-center text-green-400/80">Ativos</span>
            <span className="text-center text-amber-400/80">Leads</span>
            <span className="text-center">Conversão</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {leaders.map((l, i) => (
              <div
                key={l.id}
                className={`grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-3 items-center transition-colors hover:bg-white/[0.02] ${i < 3 ? "bg-primary/[0.02]" : ""}`}
              >
                {/* Posição */}
                <span className="text-sm font-bold text-center">
                  {MEDAL[i] ?? <span className="text-muted-foreground text-xs">{i + 1}</span>}
                </span>

                {/* Líder */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="w-8 h-8 shrink-0">
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

                {/* Stats */}
                <span className="text-center text-sm font-semibold text-foreground">{l.total}</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-bold text-green-400">{l.active}</span>
                  <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${Math.min(100, (l.active / maxActive) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-center text-sm text-amber-400">{l.leads}</span>
                <span className={`text-center text-sm font-semibold ${l.conv >= 50 ? "text-green-400" : l.conv >= 25 ? "text-yellow-400" : "text-slate-400"}`}>
                  {l.conv}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
