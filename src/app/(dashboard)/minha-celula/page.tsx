"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Users, UserCheck, UserX, Copy, Check, Phone, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIER_LABEL, TIER_THRESHOLDS } from "@/lib/contribution";

const TIER_COLOR: Record<string, string> = {
  APOIADOR:    "text-slate-400 border-slate-500/30 bg-slate-500/10",
  ATIVISTA:    "text-blue-400 border-blue-500/30 bg-blue-500/10",
  LIDER_CELULA:"text-green-400 border-green-500/30 bg-green-500/10",
  COORDENADOR: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
};

const STATUS_LABEL: Record<string, string> = { LEAD: "Lead", ACTIVE: "Ativo", INACTIVE: "Inativo" };
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "bg-green-500/15 text-green-400 border-green-500/30",
  LEAD:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  INACTIVE: "bg-red-500/10 text-red-400 border-red-500/20",
};

type CellStats = { tier: string; total: number; active: number; leads: number; inactive: number; userId: string };

type Collaborator = {
  id: string; name: string; phone?: string; city?: string; neighborhood?: string;
  status: string; campaignRole: string; contributionTypes?: string[];
};

export default function MinhaCelulaPage() {
  const [stats, setStats] = useState<CellStats | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const referralLink =
    typeof window !== "undefined" && stats?.userId
      ? `${window.location.origin}/cadastro?ref=${stats.userId}`
      : "";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sr, cr] = await Promise.all([
      fetch("/api/my-cell"),
      fetch("/api/collaborators?mine=true&status=ALL"),
    ]);
    if (sr.ok) setStats(await sr.json());
    if (cr.ok) setCollaborators(await cr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/collaborators/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCollaborators((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      fetchAll(); // recalc stats
      toast.success("Status atualizado");
    } else {
      toast.error("Erro ao atualizar");
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tier = stats?.tier ?? "APOIADOR";
  function nextTierInfo() {
    if (tier === "APOIADOR") return { label: "Ativista", needed: Math.max(0, TIER_THRESHOLDS.ATIVISTA - (stats?.active ?? 0)) };
    if (tier === "ATIVISTA") return { label: "Líder de Célula", needed: Math.max(0, TIER_THRESHOLDS.LIDER_CELULA - (stats?.active ?? 0)) };
    return null;
  }
  const next = nextTierInfo();

  const whatsappHref = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> Minha Célula
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pessoas que você cadastrou na base de apoio</p>
      </div>

      {loading && !stats ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* Tier + Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card tier */}
            <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Seu nível</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${TIER_COLOR[tier]}`}>
                  {TIER_LABEL[tier]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Users,     label: "Total",    value: stats?.total    ?? 0, color: "text-primary"    },
                  { icon: UserCheck, label: "Ativos",   value: stats?.active   ?? 0, color: "text-green-400"  },
                  { icon: UserX,     label: "Leads",    value: stats?.leads    ?? 0, color: "text-amber-400"  },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {next && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Próximo nível: {next.label}</span>
                    <span className="text-primary">{stats?.active ?? 0}/{tier === "APOIADOR" ? TIER_THRESHOLDS.ATIVISTA : TIER_THRESHOLDS.LIDER_CELULA}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((stats?.active ?? 0) / (tier === "APOIADOR" ? TIER_THRESHOLDS.ATIVISTA : TIER_THRESHOLDS.LIDER_CELULA)) * 100)}%` }}
                    />
                  </div>
                  {next.needed > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Faltam {next.needed} ativo{next.needed !== 1 ? "s" : ""} para {next.label}
                    </p>
                  )}
                </div>
              )}
              {tier === "LIDER_CELULA" && (
                <p className="text-xs text-muted-foreground text-center">Coordenador é atribuído pelo administrador</p>
              )}
            </div>

            {/* Link de convite */}
            <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4 flex flex-col">
              <h2 className="text-sm font-semibold text-foreground">Seu link de cadastro</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compartilhe este link. Quem se cadastrar por ele ficará vinculado à sua célula e contará para sua progressão de nível.
              </p>
              {referralLink && (
                <div className="mt-auto">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-white/[0.04] border border-white/[0.08]">
                    <span className="flex-1 text-xs text-muted-foreground font-mono truncate">{referralLink}</span>
                    <button onClick={copyLink} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Clique no ícone para copiar</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de cadastrados */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {collaborators.length} pessoa{collaborators.length !== 1 ? "s" : ""} cadastrada{collaborators.length !== 1 ? "s" : ""}
            </h2>

            {collaborators.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-white/[0.08]">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Você ainda não cadastrou ninguém</p>
                <p className="text-xs text-muted-foreground mt-1">Compartilhe seu link de cadastro para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="glass-card rounded-xl border border-white/[0.08]">
                    <div
                      className="p-4 flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{c.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{c.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        {(c.city || c.phone) && (
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                            {c.phone && (
                              <a href={whatsappHref(c.phone)} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-green-400 transition-colors"
                              >
                                <Phone className="w-3 h-3" />{c.phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Select value={c.status} onValueChange={(v) => changeStatus(c.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LEAD">Lead</SelectItem>
                            <SelectItem value="ACTIVE">Ativo</SelectItem>
                            <SelectItem value="INACTIVE">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expanded === c.id && c.contributionTypes && c.contributionTypes.length > 0 && (
                      <div className="border-t border-white/[0.06] px-4 pb-3 pt-2">
                        <p className="text-[10px] text-muted-foreground">
                          Formas de contribuição: {c.contributionTypes.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
