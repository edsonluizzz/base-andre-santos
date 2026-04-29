"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, Filter, Phone, MapPin, ChevronDown, Upload, UserCheck, ExternalLink, CheckSquare, Square, X, ArrowUpCircle, UserMinus, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollaboratorDialog } from "@/components/collaborators/collaborator-dialog";
import { DeleteConfirm } from "@/components/collaborators/delete-confirm";
import { ImportCsvDialog } from "@/components/collaborators/import-csv-dialog";
import { CONTRIBUTION_OPTIONS } from "@/lib/contribution";

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL:     "Coord. Geral",
  COORD_REGIONAL:  "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal",
  LIDER_BAIRRO:    "Líder de Bairro",
  VOLUNTARIO:      "Voluntário",
};

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
  neighborhood?: string; campaignRole: string; status: string; notes?: string;
  birthday?: string; contributionTypes?: string[];
  registeredBy?: { name: string | null; email: string | null } | null;
  zones: { zone: { id: string; name: string } }[];
  whatsappGroups: { group: { id: string; name: string } }[];
};

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [filterMine, setFilterMine] = useState(false);
  const [filterLeader, setFilterLeader] = useState("ALL");
  const [filterCity, setFilterCity] = useState("ALL");
  const [leaders, setLeaders] = useState<{ id: string; name: string; count: number }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
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
  }, []);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterRole !== "ALL") params.set("role", filterRole);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterMine) params.set("mine", "true");
    if (filterLeader !== "ALL") params.set("registeredBy", filterLeader);
    if (filterCity !== "ALL") params.set("city", filterCity);
    const res = await fetch(`/api/collaborators?${params.toString()}`);
    if (res.ok) setCollaborators(await res.json());
    setLoading(false);
    setSelected(new Set());
  }, [search, filterRole, filterStatus, filterMine, filterLeader, filterCity]);

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

  const whatsappHref = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
  };

  const allSelected = collaborators.length > 0 && selected.size === collaborators.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">{collaborators.length} encontrado{collaborators.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 hidden sm:flex">
            <Upload className="w-4 h-4" /> Importar CSV
          </Button>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone, cidade..." className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os cargos</SelectItem>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="LEAD">Leads</SelectItem>
            <SelectItem value="INACTIVE">Inativos</SelectItem>
            <SelectItem value="ALL">Todos</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setFilterMine((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            filterMine
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:border-white/[0.15]"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Meus cadastros
        </button>
        {leaders.length > 0 && (
          <Select value={filterLeader} onValueChange={(v) => { setFilterLeader(v); setFilterMine(false); }}>
            <SelectTrigger className="w-full sm:w-52">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Por líder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os líderes</SelectItem>
              {leaders.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name} ({l.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {cities.length > 0 && (
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-full sm:w-44">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Por cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as cidades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

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
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hidden sm:flex" title="Ver perfil">
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
                      {c.registeredBy && (
                        <div><span className="text-foreground/60">Cadastrado por:</span> {c.registeredBy.name ?? c.registeredBy.email}</div>
                      )}
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
                    <div className="flex gap-2 sm:hidden">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleting(c)}>Excluir</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de ação em massa — aparece quando há seleção */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center flex-wrap justify-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border border-white/[0.12] max-w-[calc(100vw-2rem)]"
          style={{ background: "rgba(13,27,42,0.97)", backdropFilter: "blur(16px)" }}>
          <span className="text-sm font-semibold text-foreground">
            {selected.size} sel.
          </span>
          <div className="w-px h-4 bg-white/[0.15]" />
          <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("ACTIVE")}
            className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white border-0">
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marcar como </span>Ativo
          </Button>
          <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("LEAD")}
            variant="outline" className="h-8 gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manter como </span>Lead
          </Button>
          <Button size="sm" disabled={bulkLoading} onClick={() => bulkUpdate("INACTIVE")}
            variant="outline" className="h-8 gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
            <UserMinus className="w-3.5 h-3.5" />
            Inativar
          </Button>
          <div className="w-px h-4 bg-white/[0.15]" />
          <Button size="sm" disabled={bulkLoading} onClick={() => bulkSupportStatus("CONFIRMADO")}
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0">
            <ThumbsUp className="w-3.5 h-3.5" />
            Confirmado
          </Button>
          <div className="w-px h-4 bg-white/[0.15]" />
          <button onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <CollaboratorDialog open={dialogOpen} onOpenChange={setDialogOpen} collaborator={editing} onSuccess={handleSuccess} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={() => { fetchCollaborators(); toast.success("CSV importado com sucesso!"); }} />
      {deleting && <DeleteConfirm name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
    </div>
  );
}
