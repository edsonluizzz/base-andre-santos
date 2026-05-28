"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, Phone, MapPin, ChevronDown, Upload, UserCheck, ExternalLink, CheckSquare, Square, X, ArrowUpCircle, UserMinus, ThumbsUp, PhoneCall, AlertTriangle, SlidersHorizontal, Download } from "lucide-react";
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollaboratorDialog } from "@/components/collaborators/collaborator-dialog";
import { DeleteConfirm } from "@/components/collaborators/delete-confirm";
import { ImportCsvDialog } from "@/components/collaborators/import-csv-dialog";
import { CONTRIBUTION_OPTIONS } from "@/lib/contribution";
import { ROLE_LABEL, PROFILE_LABEL, CHANNEL_LABEL, SUPPORT_LABEL, PROFILE_ORDER, CHANNEL_ORDER, SUPPORT_ORDER } from "@/lib/labels";

const ROLE_COLOR: Record<string, string> = {
  COORD_GERAL:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  COORD_REGIONAL:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  LIDER_MUNICIPAL: "bg-green-500/15 text-green-400 border-green-500/30",
  LIDER_BAIRRO:    "bg-purple-500/15 text-purple-400 border-purple-500/30",
  VOLUNTARIO:      "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const CONTRIBUTION_LABEL = Object.fromEntries(CONTRIBUTION_OPTIONS.map((o) => [o.value, o.label]));

type Collaborator = {
  id: string; name: string; email?: string; phone?: string; city?: string;
  neighborhood?: string; campaignRole: string; status: string; supportStatus?: string; notes?: string;
  birthday?: string; contributionTypes?: string[]; lastContactedAt?: string | null; source?: string;
  registeredBy?: { name: string | null; email: string | null } | null;
  zones: { zone: { id: string; name: string } }[];
  whatsappGroups: { group: { id: string; name: string } }[];
};

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 80;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [filterMine, setFilterMine] = useState(false);
  const [filterLeader, setFilterLeader] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSourceType, setFilterSourceType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterProfile, setFilterProfile] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterSupportStatus, setFilterSupportStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [leaders, setLeaders] = useState<{ id: string; name: string; count: number }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [waGroupLink, setWaGroupLink] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [deleting, setDeleting] = useState<Collaborator | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetch("/api/leaders").then((r) => r.ok ? r.json() : []).then(setLeaders).catch(() => {});
    fetch("/api/cities").then((r) => r.ok ? r.json() : []).then(setCities).catch(() => {});
    fetch("/api/collaborators/sources").then((r) => r.ok ? r.json() : []).then(setSources).catch(() => {});
    fetch("/api/settings").then((r) => r.ok ? r.json() : {}).then((s) => {
      if (s.whatsappGroupLink) setWaGroupLink(s.whatsappGroupLink);
    }).catch(() => {});
  }, []);

  const buildParams = useCallback((off: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterRole) params.set("role", filterRole);
    params.set("status", filterStatus || "ALL");
    if (filterMine) params.set("mine", "true");
    if (filterLeader) params.set("registeredBy", filterLeader);
    if (filterCity) params.set("city", filterCity);
    if (filterSourceType) params.set("sourceType", filterSourceType);
    if (filterSource) params.set("source", filterSource);
    if (filterProfile) params.set("profile", filterProfile);
    if (filterChannel) params.set("channel", filterChannel);
    if (filterSupportStatus) params.set("supportStatus", filterSupportStatus);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    params.set("limit", String(LIMIT));
    params.set("offset", String(off));
    return params;
  }, [search, filterRole, filterStatus, filterMine, filterLeader, filterCity, filterSourceType, filterSource, filterProfile, filterChannel, filterSupportStatus, filterDateFrom, filterDateTo]);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    const res = await fetch(`/api/collaborators?${buildParams(0).toString()}`);
    if (res.ok) {
      const json = await res.json();
      setCollaborators(json.data ?? json);
      setTotal(json.total ?? json.length ?? 0);
    }
    setLoading(false);
    setSelected(new Set());
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    const newOffset = offset + LIMIT;
    setLoadingMore(true);
    const res = await fetch(`/api/collaborators?${buildParams(newOffset).toString()}`);
    if (res.ok) {
      const json = await res.json();
      setCollaborators((prev) => [...prev, ...(json.data ?? json)]);
      setOffset(newOffset);
    }
    setLoadingMore(false);
  }, [offset, buildParams]);

  useEffect(() => {
    const t = setTimeout(fetchCollaborators, 300);
    return () => clearTimeout(t);
  }, [fetchCollaborators]);

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === collaborators.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(collaborators.map((c) => c.id)));
    }
  }

  async function bulkUpdate(status: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const res = await fetch("/api/collaborators/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], status }),
    });
    setBulkLoading(false);
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.updated} colaborador${d.updated !== 1 ? "es" : ""} atualizado${d.updated !== 1 ? "s" : ""}`);
      fetchCollaborators();
    } else {
      toast.error("Erro ao atualizar em massa");
    }
  }

  async function bulkSupportStatus(supportStatus: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const res = await fetch("/api/collaborators/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], supportStatus }),
    });
    setBulkLoading(false);
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.updated} colaborador${d.updated !== 1 ? "es" : ""} atualizado${d.updated !== 1 ? "s" : ""}`);
      fetchCollaborators();
    } else {
      toast.error("Erro ao atualizar em massa");
    }
  }

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(c: Collaborator) { setEditing(c); setDialogOpen(true); }

  function handleExport() {
    const params = buildParams(0);
    params.delete("limit");
    params.delete("offset");
    window.open(`/api/collaborators/export?${params.toString()}`, "_blank");
  }

  const waInviteHref = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    const firstName = name.split(" ")[0];
    const text = `Olá ${firstName}! Aqui é a equipe do André Santos 👋\n\nConvidamos você para fazer parte do nosso grupo exclusivo de apoiadores no WhatsApp!\n\n👉 ${waGroupLink}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/collaborators/${deleting.id}`, { method: "DELETE" });
    if (res.ok) { setDeleting(null); fetchCollaborators(); toast.success("Colaborador removido"); }
    else toast.error("Erro ao excluir");
  }

  function handleSuccess() {
    setDialogOpen(false);
    fetchCollaborators();
    toast.success(editing ? "Colaborador atualizado" : "Colaborador adicionado");
  }

  async function markContact(id: string) {
    const res = await fetch(`/api/collaborators/${id}/contact`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCollaborators((prev) =>
        prev.map((c) => c.id === id ? { ...c, lastContactedAt: data.lastContactedAt } : c)
      );
      toast.success("Contato registrado hoje");
    } else {
      toast.error("Erro ao registrar contato");
    }
  }

  function daysSince(date: string | null | undefined): number | null {
    if (!date) return null;
    return differenceInDays(new Date(), new Date(date));
  }

  const whatsappHref = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
  };

  const allSelected = collaborators.length > 0 && selected.size === collaborators.length;
  const someSelected = selected.size > 0 && !allSelected;

  const staleLeads = collaborators.filter((c) => {
    if (c.status !== "LEAD") return false;
    const d = daysSince(c.lastContactedAt);
    return d === null || d > 30;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > collaborators.length
              ? `Exibindo ${collaborators.length} de ${total}`
              : `${total} encontrado${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2 hidden sm:flex">
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 hidden sm:flex">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {(() => {
        const advancedActive = [filterSourceType, filterSource, filterProfile, filterChannel, filterSupportStatus, filterLeader, filterCity, filterDateFrom, filterDateTo].filter(Boolean).length;
        function FilterLabel({ children }: { children: string }) {
          return <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 pl-0.5 mb-0.5">{children}</p>;
        }
        return (
        <div className="space-y-2">
          {/* Busca */}
          <div>
            <FilterLabel>Buscar</FilterLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, telefone, cidade, origem..." className="pl-9" />
            </div>
          </div>

          {/* Filtros principais */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-end">
            <div>
              <FilterLabel>Cargo</FilterLabel>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os cargos</SelectItem>
                  {Object.entries(ROLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FilterLabel>Status</FilterLabel>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="LEAD">Leads</SelectItem>
                  <SelectItem value="INACTIVE">Inativos</SelectItem>
                  <SelectItem value="">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => setFilterMine((v) => !v)}
              className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-colors self-end ${
                filterMine
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              Meus cadastros
            </button>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-colors self-end ${
                showAdvanced || advancedActive > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              Mais filtros
              {advancedActive > 0 && (
                <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {advancedActive}
                </span>
              )}
            </button>
          </div>

          {/* Filtros avançados */}
          {showAdvanced && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Filtros avançados</p>
                {advancedActive > 0 && (
                  <button
                    onClick={() => { setFilterSourceType(""); setFilterSource(""); setFilterProfile(""); setFilterChannel(""); setFilterSupportStatus(""); setFilterLeader(""); setFilterCity(""); setFilterDateFrom(""); setFilterDateTo(""); }}
                    className="text-xs text-destructive/70 hover:text-destructive flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar tudo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-3">
                <div>
                  <FilterLabel>Forma de entrada</FilterLabel>
                  <Select value={filterSourceType} onValueChange={(v) => { setFilterSourceType(v); if (v) setFilterSource(""); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Qualquer origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Qualquer origem</SelectItem>
                      <SelectItem value="IMPORTADO">Importado (planilha)</SelectItem>
                      <SelectItem value="MANUAL">Cadastro manual</SelectItem>
                      <SelectItem value="PUBLICO">Formulário público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sources.length > 0 && (
                  <div>
                    <FilterLabel>Origem específica</FilterLabel>
                    <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); if (v) setFilterSourceType(""); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todas as origens" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as origens</SelectItem>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <FilterLabel>Perfil</FilterLabel>
                  <Select value={filterProfile} onValueChange={setFilterProfile}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os perfis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os perfis</SelectItem>
                      {PROFILE_ORDER.map((v) => (
                        <SelectItem key={v} value={v}>{PROFILE_LABEL[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FilterLabel>Canal</FilterLabel>
                  <Select value={filterChannel} onValueChange={setFilterChannel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os canais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os canais</SelectItem>
                      {CHANNEL_ORDER.map((v) => (
                        <SelectItem key={v} value={v}>{CHANNEL_LABEL[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FilterLabel>Apoio</FilterLabel>
                  <Select value={filterSupportStatus} onValueChange={setFilterSupportStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Qualquer apoio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Qualquer apoio</SelectItem>
                      {SUPPORT_ORDER.map((v) => (
                        <SelectItem key={v} value={v}>{SUPPORT_LABEL[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {leaders.length > 0 && (
                  <div>
                    <FilterLabel>Cadastrado por</FilterLabel>
                    <Select value={filterLeader} onValueChange={(v) => { setFilterLeader(v); setFilterMine(false); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Qualquer líder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer líder</SelectItem>
                        {leaders.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {cities.length > 0 && (
                  <div>
                    <FilterLabel>Cidade</FilterLabel>
                    <Select value={filterCity} onValueChange={setFilterCity}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as cidades</SelectItem>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <FilterLabel>Cadastrado de</FilterLabel>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <FilterLabel>Cadastrado até</FilterLabel>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Banner leads sem contato */}
      {!loading && staleLeads.length > 0 && filterStatus !== "ACTIVE" && (
        <button
          onClick={() => setFilterStatus("LEAD")}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-amber-500/30 bg-amber-500/[0.07] hover:bg-amber-500/[0.12] transition-colors text-left"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              {staleLeads.length} lead{staleLeads.length !== 1 ? "s" : ""} sem contato há 30+ dias
            </p>
            <p className="text-xs text-amber-400/70">Clique para filtrar e registrar contato</p>
          </div>
        </button>
      )}

      {/* Header de seleção em massa */}
      {!loading && collaborators.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : someSelected ? (
              <CheckSquare className="w-4 h-4 text-primary/60" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allSelected ? "Desmarcar todos" : `Selecionar todos (${collaborators.length})`}
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl border border-white/[0.08] p-4 flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 rounded bg-white/[0.06] shrink-0" />
              <div className="w-9 h-9 rounded-full bg-white/[0.06] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-white/[0.06] rounded w-2/5" />
                <div className="h-2.5 bg-white/[0.04] rounded w-3/5" />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="h-7 w-16 bg-white/[0.04] rounded-md hidden sm:block" />
                <div className="h-7 w-14 bg-white/[0.04] rounded-md hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      ) : collaborators.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Adicionar primeiro
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <div key={c.id}
                className={`glass-card rounded-xl border transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-white/[0.08] hover:border-primary/20"
                }`}
              >
                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelect(c.id, e)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>

                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">{c.name[0].toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      {c.status === "LEAD" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30">Lead</span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLOR[c.campaignRole]}`}>
                          {ROLE_LABEL[c.campaignRole]}
                        </span>
                      )}
                      {c.status === "INACTIVE" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">Inativo</span>
                      )}
                      {c.supportStatus === "CONFIRMADO" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">✓ Confirmado</span>
                      )}
                      {c.supportStatus === "ADVERSARIO" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">Adversário</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {c.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.city}{c.neighborhood ? ` · ${c.neighborhood}` : ""}
                        </span>
                      )}
                      {c.phone && (
                        <a href={whatsappHref(c.phone)} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-green-400 transition-colors"
                        >
                          <Phone className="w-3 h-3" /> {c.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/colaboradores/${c.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hidden sm:flex" aria-label="Ver perfil do colaborador">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="h-7 text-xs hidden sm:flex"
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 hidden sm:flex"
                      onClick={(e) => { e.stopPropagation(); setDeleting(c); }}>
                      Excluir
                    </Button>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {c.email && <div><span className="text-foreground/60">E-mail:</span> {c.email}</div>}
                      {c.birthday && <div><span className="text-foreground/60">Aniversário:</span> {new Date(c.birthday + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
                      {c.source && !["IMPORTACAO_CSV", "IMPORTACAO_XLSX"].includes(c.source) && (
                        <div><span className="text-foreground/60">Origem:</span> {c.source}</div>
                      )}
                      {c.registeredBy && (
                        <div><span className="text-foreground/60">Cadastrado por:</span> {c.registeredBy.name ?? c.registeredBy.email}</div>
                      )}
                      {/* Último contato */}
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/60">Último contato:</span>
                        {c.lastContactedAt ? (
                          <span className={daysSince(c.lastContactedAt)! > 30 ? "text-amber-400" : "text-green-400"}>
                            {daysSince(c.lastContactedAt) === 0 ? "Hoje" : `${daysSince(c.lastContactedAt)}d atrás`}
                          </span>
                        ) : (
                          <span className="text-red-400/80">Nunca registrado</span>
                        )}
                      </div>
                      {c.contributionTypes && c.contributionTypes.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="text-foreground/60">Contribuições:</span>{" "}
                          {c.contributionTypes.map((t) => CONTRIBUTION_LABEL[t] ?? t).join(", ")}
                        </div>
                      )}
                      {c.zones.length > 0 && (
                        <div><span className="text-foreground/60">Zonas:</span> {c.zones.map((z) => z.zone.name).join(", ")}</div>
                      )}
                      {c.whatsappGroups.length > 0 && (
                        <div><span className="text-foreground/60">Grupos WA:</span> {c.whatsappGroups.map((g) => g.group.name).join(", ")}</div>
                      )}
                      {c.notes && <div className="sm:col-span-2"><span className="text-foreground/60">Obs:</span> {c.notes}</div>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {c.phone && (
                        <a
                          href={whatsappHref(c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-green-600/40 text-green-400 bg-green-600/[0.08] hover:bg-green-600/20 transition-colors"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.514 5.832L.057 23.986l6.305-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.979 1-3.642-.235-.374A9.818 9.818 0 1112 21.818z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {c.phone && waGroupLink && (
                        <a
                          href={waInviteHref(c.phone, c.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-green-500/50 text-green-300 bg-green-500/[0.12] hover:bg-green-500/25 transition-colors"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.514 5.832L.057 23.986l6.305-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.979 1-3.642-.235-.374A9.818 9.818 0 1112 21.818z"/></svg>
                          Convidar p/ grupo WA
                        </a>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => markContact(c.id)}>
                        <PhoneCall className="w-3 h-3" /> Registrar contato
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs sm:hidden" onClick={() => openEdit(c)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 sm:hidden" onClick={() => setDeleting(c)}>Excluir</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Carregar mais */}
      {!loading && collaborators.length < total && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
            {loadingMore ? "Carregando..." : `Carregar mais (${total - collaborators.length} restantes)`}
          </Button>
        </div>
      )}

      {/* Barra de ação em massa — scroll horizontal em mobile */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl shadow-2xl rounded-2xl border border-white/[0.12]"
          style={{ background: "rgba(13,27,42,0.97)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-2 px-3 py-3 overflow-x-auto scrollbar-none">
            <span className="text-sm font-semibold text-foreground shrink-0">{selected.size} sel.</span>
            <div className="w-px h-4 bg-white/[0.15] shrink-0" />
            <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("ACTIVE")}
              className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white border-0 shrink-0">
              <ArrowUpCircle className="w-3.5 h-3.5" />Ativo
            </Button>
            <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("LEAD")}
              variant="outline" className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />Lead
            </Button>
            <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("INACTIVE")}
              variant="outline" className="h-8 gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0">
              <UserMinus className="w-3.5 h-3.5" />Inativar
            </Button>
            <div className="w-px h-4 bg-white/[0.15] shrink-0" />
            <Button size="sm" disabled={bulkLoading} onClick={() => bulkSupportStatus("CONFIRMADO")}
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 shrink-0">
              <ThumbsUp className="w-3.5 h-3.5" />Confirmado
            </Button>
            <div className="w-px h-4 bg-white/[0.15] shrink-0" />
            <button onClick={() => setSelected(new Set())}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0 ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <CollaboratorDialog open={dialogOpen} onOpenChange={setDialogOpen} collaborator={editing} onSuccess={handleSuccess} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={() => { fetchCollaborators(); toast.success("CSV importado com sucesso!"); }} />
      {deleting && <DeleteConfirm name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
    </div>
  );
}
