"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Building2, Users, CalendarDays, Shield, Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  suspended: boolean;
  createdAt: string;
  memberCount: number;
  userCount: number;
  eventCount: number;
  ministryCount: number;
};

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

      {/* Establishments list */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {establishments.map((est) => {
            const isProtected = est.id === "default-porto-belo";
            const isActioning = actionLoading === est.id;
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
                        {est.suspended && (
                          <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-medium">Suspenso</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{est.id}</p>
                      {est.pixKey && <p className="text-xs text-muted-foreground mt-0.5">PIX: {est.pixKey}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-xs text-muted-foreground text-right mr-3">
                      <p>Criado em</p>
                      <p className="text-foreground font-medium">
                        {format(new Date(est.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {!isProtected && (
                      <>
                        <button
                          onClick={() => handleSuspend(est)}
                          disabled={isActioning}
                          aria-label={est.suspended ? `Reativar ${est.name}` : `Suspender ${est.name}`}
                          className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${est.suspended ? "text-emerald-400 hover:bg-emerald-500/10" : "text-yellow-400 hover:bg-yellow-500/10"}`}
                        >
                          {est.suspended ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(est)}
                          disabled={isActioning}
                          aria-label={`Excluir ${est.name}`}
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

      <CreateEstablishmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => { fetchEstablishments(); setCreateOpen(false); }}
      />
    </div>
  );
}

function CreateEstablishmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ id: "", name: "", pixKey: "" });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // Auto-generate ID from name
  function handleNameChange(value: string) {
    const autoId = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
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
        <DialogHeader>
          <DialogTitle>Novo Estabelecimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome da Igreja *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: UMADC Itapema"
              required
              className="bg-background border-border text-foreground focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">ID único *</Label>
            <Input
              value={form.id}
              onChange={(e) => set("id", e.target.value)}
              placeholder="ex: umadc-itapema"
              required
              className="bg-background border-border text-foreground focus-visible:ring-primary font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Gerado automaticamente. Não pode ser alterado depois.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Chave PIX</Label>
            <Input
              value={form.pixKey}
              onChange={(e) => set("pixKey", e.target.value)}
              placeholder="CNPJ, e-mail ou telefone"
              className="bg-background border-border text-foreground focus-visible:ring-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
