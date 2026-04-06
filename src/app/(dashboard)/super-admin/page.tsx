"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Building2, Users, CalendarDays, Shield, Trash2,
  PauseCircle, PlayCircle, Search, ArrowUpDown, Pencil,
  Eye, StickyNote, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Establishment = {
  id: string;
  name: string;
  pixKey: string | null;
  plan: string;
  adminNote: string | null;
  suspended: boolean;
  createdAt: string;
  memberCount: number;
  userCount: number;
  eventCount: number;
  ministryCount: number;
};

type EstUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  inviteStatus: string;
  invitedAt: string;
  acceptedAt: string | null;
};

type SortKey = "name" | "createdAt" | "memberCount";

export default function SuperAdminPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEst, setEditEst] = useState<Establishment | null>(null);
  const [usersEst, setUsersEst] = useState<Establishment | null>(null);
  const [estUsers, setEstUsers] = useState<EstUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.isSuperAdmin;

  const fetchEstablishments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/establishments");
    if (res.ok) setEstablishments(await res.json());
    else toast.error("Acesso negado");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchEstablishments();
    else setLoading(false);
  }, [isSuperAdmin, fetchEstablishments]);

  async function handleSuspend(est: Establishment) {
    setActionLoading(est.id);
    const res = await fetch(`/api/super-admin/establishments/${est.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !est.suspended }),
    });
    setActionLoading(null);
    if (res.ok) {
      toast.success(est.suspended ? "Acesso reativado" : "Estabelecimento suspenso");
      fetchEstablishments();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao atualizar");
    }
  }

  async function handleDelete(est: Establishment) {
    if (!confirm(`Tem certeza que deseja EXCLUIR "${est.name}"? Esta ação apagará todos os dados e não pode ser desfeita.`)) return;
    setActionLoading(est.id);
    const res = await fetch(`/api/super-admin/establishments/${est.id}`, { method: "DELETE" });
    setActionLoading(null);
    if (res.ok) {
      toast.success("Estabelecimento excluído");
      fetchEstablishments();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao excluir");
    }
  }

  async function handleImpersonate(est: Establishment) {
    await update({ impersonateId: est.id });
    router.push("/dashboard");
    router.refresh();
  }

  async function openUsers(est: Establishment) {
    setUsersEst(est);
    setEstUsers([]);
    setUsersLoading(true);
    const res = await fetch(`/api/super-admin/establishments/${est.id}/users`);
    if (res.ok) setEstUsers(await res.json());
    else toast.error("Erro ao carregar usuários");
    setUsersLoading(false);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = establishments
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.name.localeCompare(b.name);
      else if (sortKey === "createdAt") diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "memberCount") diff = a.memberCount - b.memberCount;
      return sortAsc ? diff : -diff;
    });

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Esta área é exclusiva para Super Administradores do sistema.
        </p>
      </div>
    );
  }

  const totalMembers = establishments.reduce((s, e) => s + e.memberCount, 0);
  const totalUsers = establishments.reduce((s, e) => s + e.userCount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Super Admin</h1>
          </div>
          <p className="text-muted-foreground text-sm">Visão global de todos os estabelecimentos</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Estabelecimento
        </Button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Estabelecimentos", value: establishments.length, icon: Building2 },
          { label: "Total de Membros", value: totalMembers, icon: Users },
          { label: "Total de Usuários", value: totalUsers, icon: Users },
          { label: "Total de Ministérios", value: establishments.reduce((s, e) => s + e.ministryCount, 0), icon: CalendarDays },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou ID..."
            className="pl-9 bg-background border-border text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {(["name", "createdAt", "memberCount"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs border transition-colors ${
                sortKey === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              {key === "name" ? "Nome" : key === "createdAt" ? "Data" : "Membros"}
              {sortKey === key && (sortAsc ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
      </div>

      {/* Establishments list */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "Nenhum estabelecimento encontrado para essa busca." : "Nenhum estabelecimento cadastrado."}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map((est) => {
            const isProtected = est.id === "default-porto-belo";
            const isActioning = actionLoading === est.id;
            const isPro = est.plan === "PRO";
            return (
              <div key={est.id} className={`glass-card p-5 transition-opacity ${est.suspended ? "opacity-60 border-destructive/30" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{est.name}</p>
                        {isProtected && (
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">Principal</span>
                        )}
                        {isPro ? (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> PRO
                          </span>
                        ) : (
                          <span className="text-[10px] bg-muted/50 text-muted-foreground border border-border px-2 py-0.5 rounded-full font-medium">FREE</span>
                        )}
                        {est.suspended && (
                          <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-medium">Suspenso</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{est.id}</p>
                      {est.pixKey && <p className="text-xs text-muted-foreground mt-0.5">PIX: {est.pixKey}</p>}
                      {est.adminNote && (
                        <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> {est.adminNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-xs text-muted-foreground text-right mr-2">
                      <p>Criado em</p>
                      <p className="text-foreground font-medium">
                        {format(new Date(est.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {/* Impersonate */}
                    <button
                      onClick={() => handleImpersonate(est)}
                      disabled={isActioning}
                      aria-label={`Visualizar como ${est.name}`}
                      title="Visualizar como este estabelecimento"
                      className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* Users */}
                    <button
                      onClick={() => openUsers(est)}
                      disabled={isActioning}
                      aria-label={`Usuários de ${est.name}`}
                      title="Ver usuários"
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => setEditEst(est)}
                      disabled={isActioning}
                      aria-label={`Editar ${est.name}`}
                      title="Editar"
                      className="p-2 rounded-lg text-muted-foreground hover:bg-muted/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!isProtected && (
                      <>
                        <button
                          onClick={() => handleSuspend(est)}
                          disabled={isActioning}
                          aria-label={est.suspended ? `Reativar ${est.name}` : `Suspender ${est.name}`}
                          title={est.suspended ? "Reativar" : "Suspender"}
                          className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${est.suspended ? "text-emerald-400 hover:bg-emerald-500/10" : "text-yellow-400 hover:bg-yellow-500/10"}`}
                        >
                          {est.suspended ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(est)}
                          disabled={isActioning}
                          aria-label={`Excluir ${est.name}`}
                          title="Excluir"
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
                  {[
                    { label: "Membros", value: est.memberCount },
                    { label: "Usuários", value: est.userCount },
                    { label: "Eventos", value: est.eventCount },
                    { label: "Ministérios", value: est.ministryCount },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <CreateEstablishmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => { fetchEstablishments(); setCreateOpen(false); }}
      />

      {/* Edit dialog */}
      {editEst && (
        <EditEstablishmentDialog
          est={editEst}
          onOpenChange={(v) => { if (!v) setEditEst(null); }}
          onSuccess={() => { fetchEstablishments(); setEditEst(null); }}
        />
      )}

      {/* Users modal */}
      <Dialog open={!!usersEst} onOpenChange={(v) => { if (!v) setUsersEst(null); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Usuários — {usersEst?.name}</DialogTitle>
          </DialogHeader>
          {usersLoading && <div className="space-y-2 mt-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted/30 animate-pulse" />)}</div>}
          {!usersLoading && estUsers.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário encontrado.</p>
          )}
          {!usersLoading && estUsers.length > 0 && (
            <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
              {estUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.image} alt={u.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      u.role === "ADMIN" ? "bg-primary/10 text-primary border-primary/20"
                      : u.role === "LEADER" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      : "bg-muted/30 text-muted-foreground border-border"
                    }`}>
                      {u.role}
                    </span>
                    {u.inviteStatus === "PENDING" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Pendente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateEstablishmentDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ id: "", name: "", pixKey: "" });
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    const autoId = value
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    setForm((p) => ({ ...p, name: value, id: autoId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/super-admin/establishments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Estabelecimento criado!");
      setForm({ id: "", name: "", pixKey: "" });
      onSuccess();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao criar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader><DialogTitle>Novo Estabelecimento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome da Igreja *</Label>
            <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: UMADC Itapema" required className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">ID único *</Label>
            <Input value={form.id} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} placeholder="ex: umadc-itapema" required className="bg-background border-border text-foreground focus-visible:ring-primary font-mono text-sm" />
            <p className="text-[11px] text-muted-foreground">Gerado automaticamente. Não pode ser alterado depois.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Chave PIX</Label>
            <Input value={form.pixKey} onChange={(e) => setForm((p) => ({ ...p, pixKey: e.target.value }))} placeholder="CNPJ, e-mail ou telefone" className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "Criando..." : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEstablishmentDialog({
  est, onOpenChange, onSuccess,
}: {
  est: Establishment;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: est.name,
    pixKey: est.pixKey ?? "",
    plan: est.plan,
    adminNote: est.adminNote ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/super-admin/establishments/${est.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        pixKey: form.pixKey,
        plan: form.plan,
        adminNote: form.adminNote,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Estabelecimento atualizado");
      onSuccess();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader><DialogTitle>Editar — {est.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome da Igreja *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Chave PIX</Label>
            <Input value={form.pixKey} onChange={(e) => setForm((p) => ({ ...p, pixKey: e.target.value }))} placeholder="CNPJ, e-mail ou telefone" className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Plano</Label>
            <div className="flex gap-2">
              {["FREE", "PRO"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, plan: p }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.plan === p
                      ? p === "PRO"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {p === "PRO" && <Crown className="w-3 h-3 inline mr-1" />}{p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nota interna (visível só para você)</Label>
            <Textarea
              value={form.adminNote}
              onChange={(e) => setForm((p) => ({ ...p, adminNote: e.target.value }))}
              placeholder="Ex: cliente em período de teste, inadimplente..."
              rows={3}
              className="bg-background border-border text-foreground focus-visible:ring-primary resize-none text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
