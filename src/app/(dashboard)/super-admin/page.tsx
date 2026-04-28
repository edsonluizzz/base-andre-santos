"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLE_COLOR: Record<string, string> = {
  ADMIN:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LEADER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  MEMBER: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

type UCRecord = {
  id: string; userId: string | null; pendingEmail: string | null;
  role: string; tier: string; inviteStatus: string; registeredCount: number;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

export default function SuperAdminPage() {
  const [records, setRecords] = useState<UCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
      setInviteOpen(false); setInviteEmail(""); setInviteRole("MEMBER");
      fetchUsers();
    } else { const e = await res.json(); toast.error(e.error ?? "Erro"); }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Super Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de acesso ao sistema</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Conceder Acesso
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs">
        {[
          { label: "Com acesso", value: accepted.length, color: "text-primary" },
          { label: "Pendentes",  value: pending.length,  color: "text-amber-400" },
          { label: "Total",      value: records.length,  color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-3 border border-white/[0.08] text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {accepted.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Com acesso ({accepted.length})</h2>
              <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="divide-y divide-white/[0.05]">
                  {accepted.map((uc) => (
                    <div key={uc.id} className="flex items-center gap-3 p-4 flex-wrap sm:flex-nowrap">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={uc.user?.image ?? ""} referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {uc.user?.name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{uc.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{uc.user?.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{uc.registeredCount} cadastro{uc.registeredCount !== 1 ? "s" : ""} registrados</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Select value={uc.role} onValueChange={(v) => uc.userId && updateUser(uc.userId, { role: v })}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Colaborador</SelectItem>
                            <SelectItem value="LEADER">Coordenador</SelectItem>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={uc.tier ?? "APOIADOR"} onValueChange={(v) => uc.userId && updateUser(uc.userId, { tier: v })}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="APOIADOR">Apoiador</SelectItem>
                            <SelectItem value="ATIVISTA">Ativista</SelectItem>
                            <SelectItem value="LIDER_CELULA">Líder de Célula</SelectItem>
                            <SelectItem value="COORDENADOR">Coordenador</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => revoke(uc)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Aguardando login ({pending.length})
              </h2>
              <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="divide-y divide-white/[0.05]">
                  {pending.map((uc) => (
                    <div key={uc.id} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{uc.pendingEmail}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLOR[uc.role]}`}>
                            {uc.role === "ADMIN" ? "Administrador" : uc.role === "LEADER" ? "Coordenador" : "Colaborador"}
                          </span>
                          <span className="text-[10px] text-amber-400">Aguardando login com Google</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revoke(uc)}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Conceder Acesso ao Sistema</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Gmail *</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@gmail.com" type="email" autoComplete="off" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
