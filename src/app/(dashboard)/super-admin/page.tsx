"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Shield, Plus, Trash2, Clock, Crown, Search, ChevronDown, ChevronUp, RefreshCw, Mail, GitMerge, AlertTriangle, MessageCircle, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Coordenador",
  MEMBER: "Colaborador",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LEADER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  MEMBER: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const ACTION_ICON: Record<string, string> = {
  GRANT_ACCESS: "✓",
  REVOKE_ACCESS: "✗",
  UPDATE_USER: "↺",
  IMPERSONATE_START: "👁",
  IMPERSONATE_END: "👁",
};

type UCRecord = {
  id: string; userId: string | null; pendingEmail: string | null;
  role: string; tier: string; inviteStatus: string; registeredCount: number;
  isSuperAdmin: boolean; invitedByName: string | null; lastSeen: string | null;
  invitedAt: string; acceptedAt: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null; createdAt: string } | null;
};

type AuditEntry = {
  id: string; action: string; actionLabel: string; createdAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string; name: string | null; email: string | null } | null;
  metadata: Record<string, unknown> | null;
};

type InviteLinkRecord = {
  id: string; token: string; role: string; useCount: number;
  createdAt: string; usedAt: string | null; expiresAt: string | null;
};

type DupPair = {
  keep: { id: string; name: string; email: string | null; phone: string | null; city: string | null; userId: string | null };
  merge: { id: string; name: string; email: string | null; phone: string | null; city: string | null; userId: string | null };
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;
  const currentIsSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;

  const [records, setRecords] = useState<UCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const [dupPairs, setDupPairs] = useState<DupPair[]>([]);
  const [ignoredDups, setIgnoredDups] = useState<Set<string>>(new Set());
  const [showDups, setShowDups] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);

  const [showUsers, setShowUsers] = useState(true);
  const [showPending, setShowPending] = useState(true);

  const [inviteLinks, setInviteLinks] = useState<InviteLinkRecord[]>([]);
  const [showInviteLinks, setShowInviteLinks] = useState(false);
  const [inviteLinksLoading, setInviteLinksLoading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkRole, setLinkRole] = useState("MEMBER");
  const [linkCreating, setLinkCreating] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setRecords(d.users ?? d);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function fetchAudit() {
    setAuditLoading(true);
    const res = await fetch("/api/admin/audit");
    if (res.ok) setAuditLogs(await res.json());
    setAuditLoading(false);
  }

  function toggleAudit() {
    if (!showAudit && auditLogs.length === 0) fetchAudit();
    setShowAudit((v) => !v);
  }

  async function fetchDups() {
    setDupLoading(true);
    const res = await fetch("/api/admin/collaborators/duplicates");
    if (res.ok) { const d = await res.json(); setDupPairs(d.pairs ?? []); }
    setDupLoading(false);
  }

  function toggleDups() {
    if (!showDups && dupPairs.length === 0) fetchDups();
    setShowDups((v) => !v);
  }

  async function fetchInviteLinks() {
    setInviteLinksLoading(true);
    const res = await fetch("/api/invite-links");
    if (res.ok) setInviteLinks(await res.json());
    setInviteLinksLoading(false);
  }

  function toggleInviteLinks() {
    if (!showInviteLinks && inviteLinks.length === 0) fetchInviteLinks();
    setShowInviteLinks((v) => !v);
  }

  async function createInviteLink() {
    setLinkCreating(true);
    const res = await fetch("/api/invite-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: linkRole }),
    });
    if (res.ok) {
      const link = await res.json();
      const url = `${window.location.origin}/entrar?token=${link.token}`;
      setNewLinkUrl(url);
      fetchInviteLinks();
    } else {
      toast.error("Erro ao gerar link");
    }
    setLinkCreating(false);
  }

  async function revokeInviteLink(id: string) {
    if (!confirm("Revogar este link? Ele não poderá mais ser usado.")) return;
    const res = await fetch(`/api/invite-links/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Link revogado"); setInviteLinks((prev) => prev.filter((l) => l.id !== id)); }
    else toast.error("Erro ao revogar");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Link copiado!"));
  }

  async function mergeDup(keepId: string, mergeId: string) {
    if (!confirm("Mesclar os dois registros? O registro sem conta de usuário será absorvido pelo que tem login.")) return;
    const res = await fetch("/api/admin/collaborators/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, mergeId }),
    });
    if (res.ok) {
      toast.success("Registros mesclados com sucesso");
      setDupPairs((prev) => prev.filter((p) => p.keep.id !== keepId || p.merge.id !== mergeId));
    } else {
      const e = await res.json();
      toast.error(e.error ?? "Erro ao mesclar");
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { toast.error("Informe o e-mail"); return; }
    setInviting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (res.ok) {
      const d = await res.json();
      toast.success(d.message);
      setInviteDone(true);
      fetchUsers();
    } else { const e = await res.json(); toast.error(e.error ?? "Erro"); }
  }

  async function resendInvite(email: string) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) toast.success("Convite reenviado");
    else toast.error("Erro ao reenviar");
  }

  async function updateUser(userId: string, data: { role?: string; tier?: string }) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { toast.success("Atualizado"); fetchUsers(); }
    else toast.error("Erro ao atualizar");
  }

  async function revoke(uc: UCRecord) {
    const label = uc.user?.name ?? uc.pendingEmail ?? "este usuário";
    if (!confirm(`Revogar acesso de ${label}?`)) return;
    const [url, method] = uc.userId
      ? [`/api/admin/users/${uc.userId}`, "DELETE"]
      : [`/api/admin/users/${uc.id}`, "PATCH"];
    const res = await fetch(url, { method });
    if (res.ok) { toast.success("Acesso revogado"); fetchUsers(); }
    else { const e = await res.json(); toast.error(e.error ?? "Erro"); }
  }

  const accepted = records.filter((r) => r.inviteStatus === "ACCEPTED");
  const pending  = records.filter((r) => r.inviteStatus === "PENDING");

  const filtered = accepted.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || r.role === roleFilter;
    return matchSearch && matchRole;
  });

  const byRole = {
    ADMIN:  accepted.filter((r) => r.role === "ADMIN").length,
    LEADER: accepted.filter((r) => r.role === "LEADER").length,
    MEMBER: accepted.filter((r) => r.role === "MEMBER").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
            <Shield className="w-6 h-6 text-primary" />
            Super Admin
            {currentIsSuperAdmin && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-normal">
                <Crown className="w-3 h-3" /> Proprietário
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de acesso e auditoria do sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="bg-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">Acesso</span>
            <span className="hidden sm:inline">Conceder Acesso</span>
          </Button>
        </div>
      </div>

      {/* Stats por role */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Administradores", value: byRole.ADMIN,  color: "text-yellow-400", bg: "bg-yellow-500/[0.06]" },
          { label: "Coordenadores",   value: byRole.LEADER, color: "text-blue-400",   bg: "bg-blue-500/[0.06]" },
          { label: "Colaboradores",   value: byRole.MEMBER, color: "text-slate-400",  bg: "bg-white/[0.04]" },
          { label: "Pendentes",       value: pending.length, color: "text-amber-400",  bg: "bg-amber-500/[0.06]" },
        ].map((s) => (
          <div key={s.label} className={`glass-card rounded-xl p-3 border border-white/[0.07] ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os níveis</SelectItem>
            <SelectItem value="ADMIN">Administradores</SelectItem>
            <SelectItem value="LEADER">Coordenadores</SelectItem>
            <SelectItem value="MEMBER">Colaboradores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08] text-muted-foreground text-sm animate-pulse">
            Carregando usuários...
          </div>
        )}
        {!loading && <div className="space-y-4">
          {/* Usuários com acesso */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setShowUsers((v) => !v)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Com acesso</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/[0.08]">
                  {filtered.length}{search || roleFilter !== "ALL" ? ` de ${accepted.length}` : ""}
                </span>
              </div>
              {showUsers ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showUsers && (
              <div className="border-t border-white/[0.06]">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {search || roleFilter !== "ALL" ? "Nenhum usuário encontrado" : "Nenhum usuário com acesso"}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {filtered.map((uc) => {
                      const isCurrent = uc.userId === currentUserId;
                      return (
                        <div key={uc.id} className={`flex items-start gap-3 p-4 flex-wrap sm:flex-nowrap ${isCurrent ? "bg-primary/[0.04]" : ""}`}>
                          <Avatar className="w-9 h-9 shrink-0 mt-0.5">
                            <AvatarImage src={uc.user?.image ?? ""} referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {uc.user?.name?.[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-foreground">{uc.user?.name ?? "—"}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Você</span>
                              )}
                              {uc.isSuperAdmin && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" /> Super Admin
                                </span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ROLE_COLOR[uc.role]}`}>
                                {ROLE_LABEL[uc.role]}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{uc.user?.email}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              <span className="text-[10px] text-muted-foreground/70">{uc.registeredCount} cadastro{uc.registeredCount !== 1 ? "s" : ""}</span>
                              {uc.acceptedAt && <span className="text-[10px] text-muted-foreground/70">Entrou {fmtDate(uc.acceptedAt)}</span>}
                              {uc.invitedByName && <span className="text-[10px] text-muted-foreground/70">Convidado por {uc.invitedByName}</span>}
                              {uc.lastSeen && <span className="text-[10px] text-muted-foreground/70">Visto {timeAgo(uc.lastSeen)}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 w-full sm:w-auto sm:shrink-0">
                            <div className="grid grid-cols-2 gap-1 flex-1 sm:flex sm:gap-2">
                              <Select value={uc.role} onValueChange={(v) => uc.userId && updateUser(uc.userId, { role: v })} disabled={isCurrent}>
                                <SelectTrigger className="h-7 w-full sm:w-36 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MEMBER">Colaborador</SelectItem>
                                  <SelectItem value="LEADER">Coordenador</SelectItem>
                                  <SelectItem value="ADMIN">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={uc.tier ?? "APOIADOR"} onValueChange={(v) => uc.userId && updateUser(uc.userId, { tier: v })}>
                                <SelectTrigger className="h-7 w-full sm:w-36 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="APOIADOR">Apoiador</SelectItem>
                                  <SelectItem value="ATIVISTA">Ativista</SelectItem>
                                  <SelectItem value="LIDER_CELULA">Líder de Célula</SelectItem>
                                  <SelectItem value="COORDENADOR">Coordenador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {!isCurrent && (
                              <Button size="sm" variant="ghost" onClick={() => revoke(uc)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0" title="Revogar acesso">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Convites pendentes */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setShowPending((v) => !v)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Aguardando login</span>
                {pending.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {pending.length}
                  </span>
                )}
              </div>
              {showPending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showPending && (
              <div className="border-t border-white/[0.06]">
                {pending.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <span className="text-green-400 text-lg">✓</span>
                    Todos os convites foram aceitos
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {pending.map((uc) => (
                      <div key={uc.id} className="flex items-start gap-3 p-4 flex-wrap sm:flex-nowrap">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{uc.pendingEmail}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLOR[uc.role]}`}>{ROLE_LABEL[uc.role]}</span>
                            <span className="text-[10px] text-amber-400">Aguardando login com Google</span>
                            {uc.invitedByName && <span className="text-[10px] text-muted-foreground/70">por {uc.invitedByName}</span>}
                            <span className="text-[10px] text-muted-foreground/70">{fmtDate(uc.invitedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                          {uc.pendingEmail && (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Olá! Você recebeu acesso ao sistema da Base de Apoio André Santos 2026.\n\nAcesse com seu Gmail (${uc.pendingEmail}) pelo link:\n${typeof window !== "undefined" ? window.location.origin : ""}/login`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Enviar convite via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => uc.pendingEmail && resendInvite(uc.pendingEmail)} className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1" title="Reenviar convite por email">
                            <Mail className="w-3 h-3" /> Reenviar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => revoke(uc)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Cancelar convite">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>}

      {/* Links de Convite */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          onClick={toggleInviteLinks}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Links de Convite</span>
            {inviteLinks.filter((l) => !l.usedAt).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                {inviteLinks.filter((l) => !l.usedAt).length} disponível{inviteLinks.filter((l) => !l.usedAt).length !== 1 ? "is" : ""}
              </span>
            )}
          </div>
          {showInviteLinks ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showInviteLinks && (
          <div className="border-t border-white/[0.06] p-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setLinkDialogOpen(true); setNewLinkUrl(null); }} className="gap-1.5 bg-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5" /> Gerar Link
              </Button>
            </div>
            {inviteLinksLoading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
            ) : inviteLinks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Nenhum link gerado ainda</div>
            ) : (
              <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
                {inviteLinks.map((link) => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/entrar?token=${link.token}`;
                  return (
                    <div key={link.id} className="flex items-center gap-3 p-3">
                      <div className="w-2 h-2 rounded-full shrink-0 bg-green-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLOR[link.role]}`}>
                            {ROLE_LABEL[link.role]}
                          </span>
                          <span className="text-[10px] text-green-400">
                            {link.useCount === 0 ? "Nunca usado" : `${link.useCount} uso${link.useCount !== 1 ? "s" : ""}`}
                          </span>
                          {link.usedAt && (
                            <span className="text-[10px] text-muted-foreground/60">último: {fmtDate(link.usedAt)}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground/40">{fmtDate(link.createdAt)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 font-mono">
                          /entrar?token={link.token.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(
                          <>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                              onClick={() => copyToClipboard(url)}
                              title="Copiar link"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para a Base de Apoio André Santos 2026!\n\nClique no link e entre com sua conta Google:\n${url}`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Enviar via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => revokeInviteLink(link.id)}
                          title="Revogar link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Duplicatas */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          onClick={toggleDups}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Cadastros Duplicados</span>
            {dupPairs.filter((p) => !ignoredDups.has(`${p.keep.id}:${p.merge.id}`)).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {dupPairs.filter((p) => !ignoredDups.has(`${p.keep.id}:${p.merge.id}`)).length} par{dupPairs.filter((p) => !ignoredDups.has(`${p.keep.id}:${p.merge.id}`)).length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          {showDups ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showDups && (
          <div className="border-t border-white/[0.06]">
            {dupLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Verificando...</div>
            ) : dupPairs.filter((p) => !ignoredDups.has(`${p.keep.id}:${p.merge.id}`)).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <span className="text-green-400 text-lg">✓</span>
                Nenhum cadastro duplicado detectado
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {dupPairs
                  .filter((p) => !ignoredDups.has(`${p.keep.id}:${p.merge.id}`))
                  .map((pair) => (
                    <div key={`${pair.keep.id}:${pair.merge.id}`} className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-amber-400">Possível duplicata detectada</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3 space-y-1 border border-green-500/20 bg-green-500/[0.04]">
                          <p className="text-[10px] text-green-400 font-medium">MANTER (com login)</p>
                          <p className="text-sm text-foreground font-medium truncate">{pair.keep.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{pair.keep.email ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{pair.keep.phone ?? "—"}</p>
                          {pair.keep.city && <p className="text-xs text-muted-foreground truncate">{pair.keep.city}</p>}
                        </div>
                        <div className="rounded-xl p-3 space-y-1 border border-amber-500/20 bg-amber-500/[0.04]">
                          <p className="text-[10px] text-amber-400 font-medium">ABSORVER (dados ricos)</p>
                          <p className="text-sm text-foreground font-medium truncate">{pair.merge.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{pair.merge.email ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{pair.merge.phone ?? "—"}</p>
                          {pair.merge.city && <p className="text-xs text-muted-foreground truncate">{pair.merge.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => setIgnoredDups((prev) => new Set([...prev, `${pair.keep.id}:${pair.merge.id}`]))}
                        >
                          Ignorar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                          onClick={() => mergeDup(pair.keep.id, pair.merge.id)}
                        >
                          <GitMerge className="w-3 h-3" /> Mesclar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auditoria */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        <button
          onClick={toggleAudit}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Log de Auditoria</span>
            {auditLogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/[0.08]">
                {auditLogs.length} registro{auditLogs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {showAudit ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showAudit && (
          <div className="border-t border-white/[0.06]">
            {auditLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum registro ainda</div>
            ) : (
              <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs w-4 text-center">{ACTION_ICON[log.action] ?? "•"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{log.actor.name ?? log.actor.email}</span>
                        {" "}{log.actionLabel}
                        {log.target && <span className="text-muted-foreground"> → {log.target.name ?? log.target.email}</span>}
                      </p>
                      {log.metadata && (log.metadata as Record<string, unknown>).role && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Nível: {ROLE_LABEL[(log.metadata as Record<string, unknown>).role as string] ?? (log.metadata as Record<string, unknown>).role as string}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Gerar Link de Convite */}
      <Dialog open={linkDialogOpen} onOpenChange={(v) => { setLinkDialogOpen(v); if (!v) { setLinkRole("MEMBER"); setNewLinkUrl(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar Link de Convite</DialogTitle></DialogHeader>
          {newLinkUrl ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 space-y-2">
                <p className="text-sm font-medium text-green-400 text-center">Link gerado com sucesso!</p>
                <p className="text-xs font-mono text-muted-foreground break-all bg-white/[0.04] rounded-lg p-2">{newLinkUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 bg-primary text-primary-foreground" onClick={() => copyToClipboard(newLinkUrl)}>
                  <Copy className="w-4 h-4" /> Copiar Link
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Você foi convidado para a Base de Apoio André Santos 2026!\n\nClique no link e entre com sua conta Google:\n${newLinkUrl}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
                  title="Enviar via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setLinkDialogOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nível de acesso</Label>
                <Select value={linkRole} onValueChange={setLinkRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Colaborador — gerencia próprios cadastros</SelectItem>
                    <SelectItem value="LEADER">Coordenador — gerencia colaboradores e zonas</SelectItem>
                    <SelectItem value="ADMIN">Administrador — acesso total</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  O link é reutilizável — qualquer pessoa pode usá-lo para entrar. Revogue manualmente quando quiser desativar.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
                <Button onClick={createInviteLink} disabled={linkCreating} className="bg-primary text-primary-foreground">
                  {linkCreating ? "Gerando..." : "Gerar Link"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      </div>{/* end space-y-4 wrapper */}

      {/* Dialog: Conceder Acesso */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) { setInviteEmail(""); setInviteRole("MEMBER"); setInviteDone(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Conceder Acesso ao Sistema</DialogTitle></DialogHeader>
          {inviteDone ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 text-center space-y-1">
                <p className="text-sm font-medium text-green-400">Convite criado com sucesso!</p>
                <p className="text-xs text-muted-foreground">{inviteEmail}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Avise a pessoa para fazer login com esse Gmail. Ou envie o convite agora pelo WhatsApp:
              </p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Olá! Você recebeu acesso ao sistema da Base de Apoio André Santos 2026.\n\nAcesse com seu Gmail (${inviteEmail}) pelo link:\n${typeof window !== "undefined" ? window.location.origin : ""}/login`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
              >
                <Mail className="w-4 h-4" /> Enviar convite via WhatsApp
              </a>
              <Button variant="outline" className="w-full" onClick={() => { setInviteOpen(false); setInviteEmail(""); setInviteRole("MEMBER"); setInviteDone(false); }}>
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Gmail *</Label>
                <Input
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@gmail.com" type="email" autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  A pessoa faz login com esse Gmail e o acesso é ativado automaticamente.
                </p>
              </div>
              <div>
                <Label>Nível de acesso</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Colaborador — gerencia próprios cadastros</SelectItem>
                    <SelectItem value="LEADER">Coordenador — gerencia colaboradores e zonas</SelectItem>
                    <SelectItem value="ADMIN">Administrador — acesso total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting} className="bg-primary text-primary-foreground">
                  {inviting ? "Processando..." : "Conceder Acesso"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
