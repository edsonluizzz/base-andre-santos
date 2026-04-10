"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Users, CalendarDays, Pencil, Trash2, ChevronRight } from "lucide-react";
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
import Link from "next/link";
import { usePermissions } from "@/context/permissions-context";
import { PlanGate } from "@/components/plan-gate";

const COLORS = [
  { label: "Índigo", value: "#6366f1" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Âmbar", value: "#f59e0b" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Ciano", value: "#06b6d4" },
  { label: "Laranja", value: "#f97316" },
  { label: "Violeta", value: "#8b5cf6" },
  { label: "Vermelho", value: "#ef4444" },
];

type Ministry = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: { members: number; events: number };
};

export default function MinisteriosPage() {
  const { data: session } = useSession();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);

  const isLeaderOrAdmin = ["ADMIN", "LEADER"].includes(session?.user?.role ?? "");

  const fetchMinistries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/ministries");
    if (res.ok) setMinistries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchMinistries(); }, [fetchMinistries]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(m: Ministry) {
    setEditing(m);
    setDialogOpen(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o ministério "${name}"? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/ministries/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ministério excluído");
      fetchMinistries();
    } else {
      toast.error("Erro ao excluir");
    }
  }

  return (
    <PlanGate feature="Módulo de Ministérios">
      <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Ministérios</h1>
          <p className="text-muted-foreground text-sm mt-1">Grupos e equipes da congregação</p>
        </div>
        {isLeaderOrAdmin && canCreate("MINISTRIES") && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Ministério
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && ministries.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum ministério cadastrado</p>
          <p className="text-sm mt-1">Crie o primeiro ministério da congregação</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ministries.map((m) => (
          <div
            key={m.id}
            className="glass-card p-5 flex flex-col gap-3 group hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: `${m.color ?? "#6366f1"}20` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color ?? "#6366f1" }} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{m.name}</p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.description}</p>
                  )}
                </div>
              </div>
              {isLeaderOrAdmin && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canEdit("MINISTRIES") && (
                    <button
                      onClick={() => openEdit(m)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete("MINISTRIES") && (
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {m._count.members} membro{m._count.members !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {m._count.events} evento{m._count.events !== 1 ? "s" : ""}
              </span>
            </div>

            <Link
              href={`/ministerios/${m.id}`}
              className="mt-auto flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver detalhes
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      <MinistryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => { fetchMinistries(); setDialogOpen(false); }}
      />
      </div>
    </PlanGate>
  );
}

function MinistryDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Ministry | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, description: editing.description ?? "", color: editing.color ?? "#6366f1" });
    } else {
      setForm({ name: "", description: "", color: "#6366f1" });
    }
  }, [editing, open]);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editing ? `/api/ministries/${editing.id}` : "/api/ministries";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(editing ? "Ministério atualizado!" : "Ministério criado!");
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Ministério" : "Novo Ministério"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Louvor, Jovens, Intercessão..."
              required
              className="bg-background border-border text-foreground focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descreva brevemente o ministério..."
              className="bg-background border-border text-foreground focus-visible:ring-primary resize-none"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => set("color", c.value)}
                  className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
                  style={{
                    backgroundColor: c.value,
                    borderColor: form.color === c.value ? "white" : "transparent",
                    transform: form.color === c.value ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
