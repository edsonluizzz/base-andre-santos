"use client";

import { useState, useEffect, useCallback } from "react";
import { Map, Phone, Search, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CollaboratorDialog } from "@/components/collaborators/collaborator-dialog";
import { ChoroplethMap, type CityData } from "@/components/mapa/choropleth-map";

const PROFILE_LABEL: Record<string, string> = {
  PASTOR: "Pastor",
  PRESIDENTE_ASSOCIACAO: "Pres. Associação",
  LIDER_POLITICO: "Líder Político",
  VEREADOR: "Vereador",
  EMPRESARIO: "Empresário",
  LIDERANCA_COMUNITARIA: "Liderança Comunit.",
  APOIADOR: "Apoiador",
};

const PROFILE_COLOR: Record<string, string> = {
  PASTOR: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  PRESIDENTE_ASSOCIACAO: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  LIDER_POLITICO: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  VEREADOR: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  EMPRESARIO: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  LIDERANCA_COMUNITARIA: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  APOIADOR: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const SUPPORT_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  CONFIRMADO: { label: "Confirmado", color: "bg-green-500/15 text-green-400 border-green-500/30", dot: "bg-green-500" },
  NEGOCIANDO: { label: "Negociando", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  NEUTRO: { label: "Neutro", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-500" },
  ADVERSARIO: { label: "Adversário", color: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-500" },
};

type Person = {
  id: string; name: string; city?: string; neighborhood?: string;
  phone?: string; profile: string; supportStatus: string; notes?: string;
  campaignRole: string;
};

type Stats = {
  total: number; confirmado: number; negociando: number; neutro: number; adversario: number; cidades: number;
};

export default function MapaPage() {
  const [byCity, setByCity] = useState<Record<string, Person[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [citySearch, setCitySearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterProfile, setFilterProfile] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [choroplethStats, setChoroplethStats] = useState<Record<string, CityData>>({});

  // Carrega dados do choropleth uma vez (não filtra por cidade/status)
  useEffect(() => {
    fetch("/api/mapa/stats")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, CityData> = {};
        for (const c of (d.cities ?? [])) {
          const key = c.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
          map[key] = { confirmado: c.confirmado, negociando: c.negociando, neutro: c.neutro, adversario: c.adversario };
        }
        setChoroplethStats(map);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (citySearch) params.set("city", citySearch);
    if (filterStatus !== "ALL") params.set("supportStatus", filterStatus);
    if (filterProfile !== "ALL") params.set("profile", filterProfile);
    const res = await fetch(`/api/mapa?${params}`);
    if (res.ok) {
      const data = await res.json();
      setByCity(data.byCity);
      setStats(data.stats);
    }
    setLoading(false);
  }, [citySearch, filterStatus, filterProfile]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  function openEdit(p: Person) {
    setEditing({ ...p });
    setDialogOpen(true);
  }

  function handleSuccess() {
    setDialogOpen(false);
    fetchData();
    toast.success("Atualizado");
  }

  const whatsappHref = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
  };

  const cities = Object.keys(byCity).sort();
  const totalShown = cities.reduce((acc, c) => acc + byCity[c].length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="w-6 h-6 text-primary" /> Mapa de Apoio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pastores, líderes e políticos por município</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Mapa choropleth do Paraná */}
      <div className="rounded-2xl p-4 border border-white/[0.12]" style={{ background: "#0d1f35" }}>
        <ChoroplethMap cityStats={choroplethStats} />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-white/[0.04]" },
            { label: "Confirmados", value: stats.confirmado, color: "text-green-400", bg: "bg-green-500/[0.07]" },
            { label: "Negociando", value: stats.negociando, color: "text-yellow-400", bg: "bg-yellow-500/[0.07]" },
            { label: "Neutros", value: stats.neutro, color: "text-slate-400", bg: "bg-white/[0.03]" },
            { label: "Adversários", value: stats.adversario, color: "text-red-400", bg: "bg-red-500/[0.07]" },
          ].map((s) => (
            <div key={s.label} className={`glass-card rounded-xl p-3 border border-white/[0.07] ${s.bg}`}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de progresso */}
      {stats && stats.total > 0 && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.07] space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.confirmado} confirmados de {stats.total} lideranças — {stats.cidades} municípios</span>
            <span className="text-green-400 font-medium">{Math.round((stats.confirmado / stats.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
            {stats.confirmado > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${(stats.confirmado / stats.total) * 100}%` }} />}
            {stats.negociando > 0 && <div className="h-full bg-yellow-500 transition-all" style={{ width: `${(stats.negociando / stats.total) * 100}%` }} />}
            {stats.adversario > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${(stats.adversario / stats.total) * 100}%` }} />}
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Confirmado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Negociando</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />Neutro</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Adversário</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Buscar município..." className="pl-9" />
        </div>
        <Select value={filterProfile} onValueChange={setFilterProfile}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os perfis</SelectItem>
            {Object.entries(PROFILE_LABEL).filter(([v]) => v !== "APOIADOR").map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="CONFIRMADO">Confirmados</SelectItem>
            <SelectItem value="NEGOCIANDO">Negociando</SelectItem>
            <SelectItem value="NEUTRO">Neutros</SelectItem>
            <SelectItem value="ADVERSARIO">Adversários</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : cities.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Map className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma liderança cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre colaboradores com perfil Pastor, Vereador, etc.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{totalShown} liderança{totalShown !== 1 ? "s" : ""} em {cities.length} município{cities.length !== 1 ? "s" : ""}</p>
          {cities.map((city) => {
            const people = byCity[city];
            const confirmed = people.filter((p) => p.supportStatus === "CONFIRMADO").length;
            return (
              <div key={city} className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                {/* Cabeçalho cidade */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]" style={{ background: "rgba(13,27,42,0.5)" }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{city}</span>
                    <span className="text-xs text-muted-foreground">{people.length} liderança{people.length !== 1 ? "s" : ""}</span>
                  </div>
                  {confirmed > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      {confirmed} confirmado{confirmed !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Lista de pessoas */}
                <div className="divide-y divide-white/[0.04]">
                  {people.map((p) => {
                    const sc = SUPPORT_CONFIG[p.supportStatus] ?? SUPPORT_CONFIG.NEUTRO;
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                        {/* Dot de status */}
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${PROFILE_COLOR[p.profile]}`}>
                              {PROFILE_LABEL[p.profile]}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sc.color}`}>
                              {sc.label}
                            </span>
                          </div>
                          {p.neighborhood && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.neighborhood}</p>
                          )}
                          {p.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate max-w-xs">{p.notes}</p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 shrink-0">
                          {p.phone && (
                            <a href={whatsappHref(p.phone)} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                              title="WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(p)}>
                            Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CollaboratorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collaborator={editing}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
