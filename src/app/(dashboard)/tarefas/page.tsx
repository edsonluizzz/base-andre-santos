"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Trash2, Circle, CheckCircle2, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Task = {
  id: string; title: string; description?: string | null;
  dueDate?: string | null; status: "PENDING" | "DONE"; priority: "LOW" | "NORMAL" | "HIGH";
  assignedToId: string; createdAt: string;
  assignedTo?: { name: string | null; email: string | null } | null;
};

type UserOption = { id: string; name: string | null; email: string | null };

const PRIORITY_DOT: Record<string, string> = { HIGH: "bg-red-400", NORMAL: "bg-amber-400", LOW: "bg-slate-500" };
const PRIORITY_LABEL: Record<string, string> = { HIGH: "Alta", NORMAL: "Normal", LOW: "Baixa" };

export default function TarefasPage() {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [users, setUsers]     = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState("PENDING");
  const [form, setForm]       = useState({ title: "", description: "", dueDate: "", priority: "NORMAL", assignedToId: "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tr, ur] = await Promise.all([
      fetch("/api/tasks?all=true"),
      fetch("/api/admin/users"),
    ]);
    if (tr.ok) setTasks(await tr.json());
    if (ur.ok) {
      const d = await ur.json();
      const list: UserOption[] = (d.users ?? d)
        .filter((u: { user?: { id: string; name: string | null; email: string | null } }) => u.user)
        .map((u: { user: { id: string; name: string | null; email: string | null } }) => u.user);
      setUsers(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function createTask() {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    if (!form.assignedToId) { toast.error("Selecione um responsável"); return; }
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, description: form.description || null, dueDate: form.dueDate || null, priority: form.priority, assignedToId: form.assignedToId }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Tarefa criada");
      setDialog(false);
      setForm({ title: "", description: "", dueDate: "", priority: "NORMAL", assignedToId: "" });
      fetchAll();
    } else toast.error("Erro ao criar");
  }

  async function toggleTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) {
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Excluir tarefa?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) { setTasks((prev) => prev.filter((t) => t.id !== id)); toast.success("Tarefa removida"); }
  }

  function dueDateLabel(d: string | null | undefined) {
    if (!d) return null;
    const days = differenceInDays(new Date(d), new Date());
    if (days < 0) return { label: `${Math.abs(days)}d atrasado`, color: "text-red-400" };
    if (days === 0) return { label: "Hoje", color: "text-amber-400" };
    if (days <= 3) return { label: `${days}d`, color: "text-amber-400" };
    return { label: format(new Date(d), "dd/MM", { locale: ptBR }), color: "text-muted-foreground" };
  }

  const filtered = tasks.filter((t) => filter === "ALL" ? true : t.status === filter);
  const pending  = tasks.filter((t) => t.status === "PENDING").length;
  const done     = tasks.filter((t) => t.status === "DONE").length;

  // Agrupa por usuário
  const byUser = new Map<string, Task[]>();
  for (const t of filtered) {
    const key = t.assignedToId;
    byUser.set(key, [...(byUser.get(key) ?? []), t]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Tarefas da Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pending} pendente{pending !== 1 ? "s" : ""} · {done} concluída{done !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setDialog(true)} className="bg-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {[["PENDING", "Pendentes"], ["DONE", "Concluídas"], ["ALL", "Todas"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", filter === v ? "bg-primary/10 text-primary border-primary/30" : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:border-white/[0.15]")}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, gi) => (
            <div key={gi} className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="h-3.5 w-3.5 animate-shimmer rounded" />
                <div className="h-4 animate-shimmer rounded w-32" />
                <div className="h-3 animate-shimmer rounded w-12 ml-auto" />
              </div>
              <div className="divide-y divide-white/[0.05]">
                {Array.from({ length: 3 }).map((_, ti) => (
                  <div key={ti} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-4 h-4 rounded-full animate-shimmer mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 animate-shimmer rounded w-3/5" />
                      <div className="h-2.5 animate-shimmer rounded w-1/3" />
                    </div>
                    <div className="h-5 w-14 animate-shimmer rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-primary/[0.07] border border-primary/[0.12] flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-primary/60" />
          </div>
          <p className="font-medium text-foreground mb-1">Nenhuma tarefa {filter === "PENDING" ? "pendente" : filter === "DONE" ? "concluída" : ""}</p>
          <p className="text-sm text-muted-foreground mb-4">Crie a primeira tarefa e delegue ações para a equipe da base</p>
          <Button onClick={() => setDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 mx-auto">
            <Plus className="w-4 h-4" /> Nova Tarefa
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {[...byUser.entries()].map(([userId, userTasks]) => {
            const userInfo = userTasks[0].assignedTo;
            const userName = userInfo?.name ?? userInfo?.email ?? userId.slice(0, 8);
            return (
              <div key={userId} className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{userTasks.length} tarefa{userTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {userTasks.map((t) => {
                    const due = dueDateLabel(t.dueDate);
                    return (
                      <div key={t.id} className={cn("flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]", t.status === "DONE" && "opacity-50")}>
                        <button onClick={() => toggleTask(t.id)} aria-label={t.status === "DONE" ? "Marcar como pendente" : "Marcar como concluída"} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                          {t.status === "DONE" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm text-foreground", t.status === "DONE" && "line-through text-muted-foreground")}>{t.title}</p>
                          {t.description && <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[t.priority])} title={PRIORITY_LABEL[t.priority]} />
                            {due && (
                              <span className={cn("flex items-center gap-0.5 text-[10px]", due.color)}>
                                <Calendar className="w-2.5 h-2.5" /> {due.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => deleteTask(t.id)} aria-label="Excluir tarefa" className="shrink-0 text-muted-foreground/40 hover:text-red-400 transition-colors mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog nova tarefa */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Responsável *</Label>
              <Select value={form.assignedToId} onValueChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar usuário..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Recrutar 5 apoiadores em Colombo" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detalhes opcionais..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="LOW">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button size="sm" onClick={createTask} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
