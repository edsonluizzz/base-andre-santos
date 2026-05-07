"use client";

import { useState, useEffect } from "react";
import { Network, ChevronDown, ChevronRight, Users, UserCheck, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TIER_LABEL } from "@/lib/contribution";
const TIER_COLOR: Record<string, string> = {
  APOIADOR: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  ATIVISTA: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  LIDER_CELULA: "text-green-400 border-green-500/30 bg-green-500/10",
  COORDENADOR: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
};
const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-green-500", LEAD: "bg-amber-400", INACTIVE: "bg-slate-500",
};

type Member = { id: string; name: string; status: string; city: string | null; createdAt: string };
type Leader = {
  id: string; name: string | null; email: string | null; image: string | null;
  tier: string; total: number; active: number; leads: number; members: Member[];
};

export default function CelulasPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/celulas")
      .then((r) => r.json())
      .then((d) => { setLeaders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const totalAtivos = leaders.reduce((s, l) => s + l.active, 0);
  const totalLeads  = leaders.reduce((s, l) => s + l.leads, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Network className="w-6 h-6 text-primary" /> Painel de Células
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Hierarquia de líderes e seus cadastros</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Líderes ativos",   value: leaders.length, color: "text-primary"   },
          { label: "Total ativos",     value: totalAtivos,    color: "text-green-400" },
          { label: "Leads em aberto",  value: totalLeads,     color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-3 sm:p-4 border border-white/[0.08]">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{s.label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : leaders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Network className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma célula formada ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader) => {
            const open = expanded.has(leader.id);
            return (
              <div key={leader.id} className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                {/* Cabeçalho do líder */}
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() => toggle(leader.id)}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={leader.image ?? ""} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {leader.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{leader.name ?? "—"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TIER_COLOR[leader.tier]}`}>
                        {TIER_LABEL[leader.tier]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{leader.email}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 font-medium">{leader.active}</span>
                      <span className="hidden sm:inline"> ativos</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {leader.total} total
                    </span>
                    {open
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </div>
                </button>

                {/* Membros da célula */}
                {open && (
                  <div className="border-t border-white/[0.06]">
                    {leader.members.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-3">Nenhum cadastro ainda</p>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {leader.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 pl-8 sm:pl-14">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[m.status] ?? "bg-slate-500"}`} />
                            <span className="text-sm text-foreground flex-1 min-w-0 truncate">{m.name}</span>
                            {m.city && (
                              <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                                <MapPin className="w-3 h-3" />{m.city}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline shrink-0">
                              {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
