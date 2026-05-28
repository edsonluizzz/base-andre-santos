"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Users, MapPin, Loader2, Star, LayoutGrid, List, Swords } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import depEstaduais from "@/data/eleitos-2022/dep-estaduais.json";
import depFederais from "@/data/eleitos-2022/dep-federais.json";
import senadores from "@/data/eleitos-2022/senadores.json";
import governadorData from "@/data/eleitos-2022/governador.json";
import presidenteData from "@/data/eleitos-2022/presidente.json";

type Candidate = {
  id: number;
  nomeUrna: string;
  nomeCompleto?: string;
  partido: string;
  votos: number;
  cargo: string;
  estado: string;
  turno: number;
  ano: number;
  percentual?: number;
  mandato?: string;
  suplentes?: string[];
};

type Municipio = { codigo: string; municipio: string; votos: number };

type TabKey = "estadual" | "federal" | "senador" | "governador" | "presidente";

const PARTY_COLORS: Record<string, string> = {
  PT:            "#C0392B",
  PSD:           "#1E40AF",
  PL:            "#1E3A5F",
  União:         "#1565C0",
  PP:            "#C2410C",
  MDB:           "#92400E",
  PDT:           "#7F1D1D",
  Republicanos:  "#EA580C",
  PSDB:          "#0369A1",
  Podemos:       "#166534",
  Cidadania:     "#0F766E",
  PSB:           "#B45309",
  Solidariedade: "#15803D",
  Pros:          "#9A3412",
  PV:            "#15803D",
};

function partyColor(partido: string) {
  return PARTY_COLORS[partido] ?? "#6B7280";
}

function fmtVotes(n: number) {
  return n.toLocaleString("pt-BR");
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const TABS: { key: TabKey; label: string; count: number | null }[] = [
  { key: "estadual",   label: "Dep. Estadual", count: depEstaduais.length },
  { key: "federal",    label: "Dep. Federal",  count: depFederais.length  },
  { key: "senador",    label: "Senador",        count: senadores.length    },
  { key: "governador", label: "Governador",     count: null                },
  { key: "presidente", label: "Presidente",     count: null                },
];

export function EleitoralPanel() {
  const [activeTab, setActiveTab]     = useState<TabKey>("estadual");
  const [search, setSearch]           = useState("");
  const [partido, setPartido]         = useState("");
  const [selected, setSelected]       = useState<Candidate | null>(null);
  const [munData, setMunData]         = useState<Municipio[]>([]);
  const [munLoading, setMunLoading]   = useState(false);
  const [munSearch, setMunSearch]     = useState("");
  const [favorites, setFavorites]     = useState<string[]>([]);
  const [onlyFavs, setOnlyFavs]       = useState(false);
  const [viewMode, setViewMode]       = useState<"grid" | "list">("grid");

  const hasMunicipios = activeTab === "estadual" || activeTab === "federal";

  // Load favorites + viewMode from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("eleitos-favoritos");
      if (stored) setFavorites(JSON.parse(stored));
      const vm = localStorage.getItem("eleitos-view") as "grid" | "list" | null;
      if (vm === "list" || vm === "grid") setViewMode(vm);
    } catch {}
  }, []);

  function favKey(c: Candidate) {
    return `${activeTab}:${c.nomeUrna}`;
  }

  function isFav(c: Candidate) {
    return favorites.includes(favKey(c));
  }

  function toggleFav(c: Candidate, e?: React.MouseEvent) {
    e?.stopPropagation();
    const key = favKey(c);
    const next = favorites.includes(key)
      ? favorites.filter((f) => f !== key)
      : [...favorites, key];
    setFavorites(next);
    try { localStorage.setItem("eleitos-favoritos", JSON.stringify(next)); } catch {}
  }

  // Fetch municipality breakdown when a dep. estadual/federal is selected
  useEffect(() => {
    if (!selected || !hasMunicipios) {
      setMunData([]);
      return;
    }
    let cancelled = false;
    setMunLoading(true);
    setMunData([]);
    const cargo = activeTab === "federal" ? "federal" : "estadual";
    fetch(`/api/eleitos/municipios?cargo=${cargo}&nome=${encodeURIComponent(selected.nomeUrna)}`)
      .then((r) => r.json())
      .then((d: Municipio[]) => { if (!cancelled) setMunData(d ?? []); })
      .catch(() => { if (!cancelled) setMunData([]); })
      .finally(() => { if (!cancelled) setMunLoading(false); });
    return () => { cancelled = true; };
  }, [selected, activeTab, hasMunicipios]);

  function closeModal() {
    setSelected(null);
    setMunData([]);
    setMunSearch("");
  }

  const candidates = useMemo<Candidate[]>(() => {
    if (activeTab === "estadual") return depEstaduais as Candidate[];
    if (activeTab === "federal")  return depFederais  as Candidate[];
    if (activeTab === "senador")  return senadores    as Candidate[];
    return [];
  }, [activeTab]);

  const parties = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.partido))).sort(),
    [candidates]
  );

  const filtered = useMemo(
    () => candidates.filter((c) => {
      const q = search.toLowerCase();
      const okSearch = !q || c.nomeUrna.toLowerCase().includes(q);
      const okParty  = !partido || c.partido === partido;
      const okFav    = !onlyFavs || favorites.includes(`${activeTab}:${c.nomeUrna}`);
      return okSearch && okParty && okFav;
    }),
    [candidates, search, partido, onlyFavs, favorites, activeTab]
  );

  const filteredMun = useMemo(
    () =>
      !munSearch
        ? munData
        : munData.filter((m) => m.municipio.toLowerCase().includes(munSearch.toLowerCase())),
    [munData, munSearch]
  );

  const maxVotos = munData[0]?.votos ?? 1;

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setSearch("");
    setPartido("");
    setSelected(null);
    setOnlyFavs(false);
  }

  const isGrid = activeTab === "estadual" || activeTab === "federal" || activeTab === "senador";

  return (
    <div className="space-y-5">
      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              "flex-1 min-w-max px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === t.key
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {t.label}
            {t.count !== null && (
              <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Grid view (estadual / federal / senador) ── */}
      {isGrid && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar candidato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/[0.03] border-white/10"
              />
            </div>
            {parties.length > 1 && (
              <select
                value={partido}
                onChange={(e) => setPartido(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/10 text-foreground min-w-[150px]"
              >
                <option value="">Todos os partidos</option>
                {parties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setOnlyFavs((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all",
                onlyFavs
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
              )}
            >
              <Star className={cn("h-3.5 w-3.5", onlyFavs && "fill-amber-400")} />
              Favoritos
              {favorites.filter((f) => f.startsWith(activeTab + ":")).length > 0 && (
                <span className="text-xs opacity-70">
                  ({favorites.filter((f) => f.startsWith(activeTab + ":")).length})
                </span>
              )}
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{filtered.length} eleito{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            {/* Toggle grade/lista */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5 bg-white/[0.03]">
              <button
                onClick={() => { setViewMode("grid"); try { localStorage.setItem("eleitos-view", "grid"); } catch {} }}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Vista grade"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setViewMode("list"); try { localStorage.setItem("eleitos-view", "list"); } catch {} }}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Vista lista"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Nenhum candidato encontrado</div>
          ) : viewMode === "grid" ? (
            /* ── Vista grade ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "text-left p-4 rounded-xl border transition-all group relative",
                    isFav(c)
                      ? "bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                  )}
                >
                  <button
                    onClick={(e) => toggleFav(c, e)}
                    className="absolute top-3 right-3 p-0.5 text-muted-foreground/40 hover:text-amber-400 transition-colors"
                    title={isFav(c) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star className={cn("h-3.5 w-3.5", isFav(c) && "fill-amber-400 text-amber-400")} />
                  </button>
                  <div className="flex items-center gap-3 mb-3 pr-5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md"
                      style={{ backgroundColor: partyColor(c.partido) }}
                    >
                      {initials(c.nomeUrna)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate leading-tight">{c.nomeUrna}</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: partyColor(c.partido) }}>{c.partido}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtVotes(c.votos)} votos</div>
                  {hasMunicipios && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/60">
                      <MapPin className="h-3 w-3" /><span>ver por município</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* ── Vista lista ── */
            <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/[0.05]">
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group",
                    isFav(c) && "bg-amber-500/[0.03]"
                  )}
                >
                  {/* Posição */}
                  <span className="text-xs text-muted-foreground/50 w-5 text-right flex-shrink-0">{i + 1}</span>

                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: partyColor(c.partido) }}
                  >
                    {initials(c.nomeUrna)}
                  </div>

                  {/* Nome + partido */}
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-left w-full"
                      onClick={() => setSelected(c)}
                    >
                      <span className="text-sm font-medium text-foreground truncate block">{c.nomeUrna}</span>
                    </button>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: partyColor(c.partido) }}>{c.partido}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{fmtVotes(c.votos)} votos</span>

                  {/* Botão "Usar como rival nas Metas" */}
                  {(activeTab === "estadual") && (
                    <Link
                      href="/metas"
                      onClick={() => {
                        try { localStorage.setItem("metas-rival", c.nomeUrna); } catch {}
                      }}
                      className="flex-shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors px-1.5 py-1 rounded border border-transparent hover:border-primary/20"
                      title="Usar como adversário nas Metas"
                    >
                      <Swords className="h-3 w-3" />
                      <span className="hidden sm:inline">Usar nas metas</span>
                    </Link>
                  )}

                  {/* Fav */}
                  <button
                    onClick={(e) => toggleFav(c, e)}
                    className="flex-shrink-0 p-0.5 text-muted-foreground/30 hover:text-amber-400 transition-colors"
                  >
                    <Star className={cn("h-3.5 w-3.5", isFav(c) && "fill-amber-400 text-amber-400")} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Governador ── */}
      {activeTab === "governador" && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-wrap items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg"
                style={{ backgroundColor: partyColor(governadorData.eleito.partido) }}
              >
                {initials(governadorData.eleito.nomeUrna)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{governadorData.eleito.nomeUrna}</h2>
                  <Badge className="text-xs text-white" style={{ backgroundColor: partyColor(governadorData.eleito.partido) }}>
                    {governadorData.eleito.partido}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">ELEITO 1º TURNO</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{governadorData.eleito.nomeCompleto}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Vice: <span className="text-foreground font-medium">{governadorData.vice.nomeUrna}</span>
                  <span className="ml-1 opacity-60 text-xs">({governadorData.vice.partido})</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-foreground">{fmtVotes(governadorData.eleito.votos)}</div>
                <div className="text-xs text-muted-foreground">votos</div>
                <div className="text-lg font-semibold text-green-400 mt-0.5">{governadorData.eleito.percentual}%</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resultado — 1º Turno</h3>
            <div className="space-y-2">
              {governadorData.candidatos.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    c.situacao === "ELEITO" ? "bg-green-500/5 border-green-500/20" : "bg-white/[0.02] border-white/10"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: partyColor(c.partido) }}
                  >
                    {initials(c.nomeUrna)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{c.nomeUrna}</span>
                      <span className="text-xs text-muted-foreground">{c.partido}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${c.percentual}%`,
                          backgroundColor: c.situacao === "ELEITO" ? "#22c55e" : partyColor(c.partido),
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold">{c.percentual}%</div>
                    <div className="text-xs text-muted-foreground">{fmtVotes(c.votos)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Presidente ── */}
      {activeTab === "presidente" && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-wrap items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg"
                style={{ backgroundColor: partyColor(presidenteData.eleito.partido) }}
              >
                {initials(presidenteData.eleito.nomeUrna)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{presidenteData.eleito.nomeUrna}</h2>
                  <Badge className="text-xs text-white" style={{ backgroundColor: partyColor(presidenteData.eleito.partido) }}>
                    {presidenteData.eleito.partido}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">ELEITO 2º TURNO</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{presidenteData.eleito.nomeCompleto}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Vice: <span className="text-foreground font-medium">{presidenteData.vice.nomeUrna}</span>
                  <span className="ml-1 opacity-60 text-xs">({presidenteData.vice.partido})</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-foreground">{fmtVotes(presidenteData.eleito.votosNacional)}</div>
                <div className="text-xs text-muted-foreground">votos nacionais</div>
                <div className="text-lg font-semibold text-green-400 mt-0.5">{presidenteData.eleito.percentualNacional}%</div>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-4">Resultado no Paraná — 2º Turno</h3>
            <div className="space-y-4">
              {presidenteData.resultadoPR.candidatos.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: partyColor(c.partido) }}
                  >
                    {initials(c.nomeUrna)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">{c.nomeUrna}</span>
                      <span className="text-xs text-muted-foreground">{c.partido}</span>
                      <span className="text-xs opacity-60">{c.situacao}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.percentual}%`, backgroundColor: partyColor(c.partido) }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[80px]">
                    <div className="text-sm font-bold">{c.percentual}%</div>
                    <div className="text-xs text-muted-foreground">{fmtVotes(c.votos)}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{presidenteData.resultadoPR.nota}</p>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      <Dialog open={!!selected} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-2xl bg-background border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: partyColor(selected.partido) }}
                >
                  {initials(selected.nomeUrna)}
                </div>
              )}
              <span className="truncate flex-1">{selected?.nomeUrna}</span>
              {selected && isGrid && (
                <button
                  onClick={() => selected && toggleFav(selected)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors flex-shrink-0"
                  title={isFav(selected) ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isFav(selected) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    )}
                  />
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 mt-2">
              {/* Info cells */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCell label="Partido">
                  <span style={{ color: partyColor(selected.partido) }} className="font-semibold">{selected.partido}</span>
                </InfoCell>
                <InfoCell label="Cargo">
                  <span className="text-sm font-medium">{selected.cargo}</span>
                </InfoCell>
                <InfoCell label="Total de votos">
                  <span className="text-lg font-bold">{fmtVotes(selected.votos)}</span>
                </InfoCell>
                <InfoCell label="Eleição">
                  <span className="font-medium">{selected.ano} — {selected.turno}º turno</span>
                </InfoCell>
              </div>

              {selected.nomeCompleto && selected.nomeCompleto !== selected.nomeUrna && (
                <InfoCell label="Nome completo">
                  <span className="text-sm">{selected.nomeCompleto}</span>
                </InfoCell>
              )}

              {selected.mandato && (
                <InfoCell label="Mandato">
                  <span className="font-medium">{selected.mandato}</span>
                </InfoCell>
              )}

              {selected.suplentes && selected.suplentes.length > 0 && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
                  <div className="text-xs text-muted-foreground mb-2">Suplentes</div>
                  {selected.suplentes.map((s, i) => (
                    <div key={i} className="text-sm">{i + 1}º — {s}</div>
                  ))}
                </div>
              )}

              {/* Municipality breakdown */}
              {hasMunicipios && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      Votos por Município
                    </div>
                    {munData.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {munData.length} municípios · {fmtVotes(selected.votos)} votos
                      </span>
                    )}
                  </div>

                  {munLoading && (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  )}

                  {!munLoading && munData.length > 0 && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Filtrar município..."
                          value={munSearch}
                          onChange={(e) => setMunSearch(e.target.value)}
                          className="pl-8 h-8 text-sm bg-white/[0.03] border-white/10"
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                        {filteredMun.map((m, i) => (
                          <div key={m.codigo} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                            <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">{i + 1}</span>
                            <span className="text-sm flex-1 truncate">{m.municipio}</span>
                            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round((m.votos / maxVotos) * 100)}%`,
                                  backgroundColor: partyColor(selected.partido),
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-right w-16 flex-shrink-0">{fmtVotes(m.votos)}</span>
                          </div>
                        ))}
                        {filteredMun.length === 0 && (
                          <div className="text-center py-4 text-sm text-muted-foreground">Nenhum município encontrado</div>
                        )}
                      </div>
                    </>
                  )}

                  {!munLoading && munData.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">Dados não disponíveis</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 py-2 rounded-lg border border-green-500/30 bg-green-500/5">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Eleito nas Eleições 2022</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
