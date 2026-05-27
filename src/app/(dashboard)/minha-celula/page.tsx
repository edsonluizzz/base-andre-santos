"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Star, Users, UserCheck, UserX, Copy, Check, Phone, MapPin, ChevronDown, MessageCircle, ClipboardList, Plus, Trash2, Circle, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIER_LABEL, TIER_THRESHOLDS } from "@/lib/contribution";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIER_COLOR: Record<string, string> = {
  APOIADOR:    "text-slate-400 border-slate-500/30 bg-slate-500/10",
  ATIVISTA:    "text-blue-400 border-blue-500/30 bg-blue-500/10",
  LIDER_CELULA:"text-green-400 border-green-500/30 bg-green-500/10",
  COORDENADOR: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "bg-green-500/15 text-green-400 border-green-500/30",
  LEAD:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  INACTIVE: "bg-red-500/10 text-red-400 border-red-500/20",
};

type CellStats = { tier: string; total: number; active: number; leads: number; inactive: number; userId: string };

type Collaborator = {
  id: string; name: string; phone?: string; city?: string; neighborhood?: string;
  status: string; campaignRole: string; contributionTypes?: string[];
};

type Task = {
  id: string; title: string; description?: string | null;
  dueDate?: string | null; status: "PENDING" | "DONE"; priority: "LOW" | "NORMAL" | "HIGH";
  createdAt: string;
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH: "bg-red-400", NORMAL: "bg-amber-400", LOW: "bg-slate-500",
};
const PRIORITY_LABEL: Record<string, string> = { HIGH: "Alta", NORMAL: "Normal", LOW: "Baixa" };

export default function MinhaCelulaPage() {
  const [stats, setStats] = useState<CellStats | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", priority: "NORMAL" });
  const [taskSaving, setTaskSaving] = useState(false);

  const referralLink =
    typeof window !== "undefined" && stats?.userId
      ? `${window.location.origin}/cadastro?ref=${stats.userId}`
      : "";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sr, cr, tr] = await Promise.all([
      fetch("/api/my-cell"),
      fetch("/api/collaborators?mine=true&status=ALL"),
      fetch("/api/tasks"),
    ]);
    if (sr.ok) setStats(await sr.json());
    if (cr.ok) { const j = await cr.json(); setCollaborators(j.data ?? j); }
    if (tr.ok) setTasks(await tr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/collaborators/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCollaborators((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      fetchAll(); // recalc stats
      toast.success("Status atualizado");
    } else {
      toast.error("Erro ao atualizar");
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) {
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    }
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function createTask() {
    if (!taskForm.title.trim()) { toast.error("Título obrigatório"); return; }
    setTaskSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskForm.title, description: taskForm.description || null, dueDate: taskForm.dueDate || null, priority: taskForm.priority }),
    });
    setTaskSaving(false);
    if (res.ok) {
      const t: Task = await res.json();
      setTasks((prev) => [t, ...prev]);
      setTaskDialog(false);
      setTaskForm({ title: "", description: "", dueDate: "", priority: "NORMAL" });
      toast.success("Tarefa criada");
    } else toast.error("Erro ao criar tarefa");
  }

  function dueDateLabel(dateStr: string | null | undefined): { label: string; color: string } | null {
    if (!dateStr) return null;
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return { label: `${Math.abs(days)}d atrasado`, color: "text-red-400" };
    if (days === 0) return { label: "Hoje", color: "text-amber-400" };
    if (days <= 3) return { label: `${days}d`, color: "text-amber-400" };
    return { label: format(new Date(dateStr), "dd/MM", { locale: ptBR }), color: "text-muted-foreground" };
  }

  const tier = stats?.tier ?? "APOIADOR";
  function nextTierInfo() {
    if (tier === "APOIADOR") return { label: "Ativista", needed: Math.max(0, TIER_THRESHOLDS.ATIVISTA - (stats?.active ?? 0)) };
    if (tier === "ATIVISTA") return { label: "Líder de Célula", needed: Math.max(0, TIER_THRESHOLDS.LIDER_CELULA - (stats?.active ?? 0)) };
    return null;
  }
  const next = nextTierInfo();

  const whatsappHref = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> Minha Célula
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pessoas que você cadastrou na base de apoio</p>
      </div>

      {loading && !stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 border border-white/[0.08] animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-white/[0.06] rounded" />
                  <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0,1,2].map((j) => (
                    <div key={j} className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                      <div className="h-6 bg-white/[0.06] rounded w-2/3 mx-auto" />
                      <div className="h-2 bg-white/[0.04] rounded w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Tier + Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card tier */}
            <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Seu nível</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${TIER_COLOR[tier]}`}>
                  {TIER_LABEL[tier]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Users,     label: "Total",  value: stats?.total  ?? 0, color: "text-primary"   },
                  { icon: UserCheck, label: "Ativos", value: stats?.active ?? 0, color: "text-green-400" },
                  { icon: UserX,     label: "Leads",  value: stats?.leads  ?? 0, color: "text-amber-400" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl p-2 sm:p-3 bg-white/[0.03] border border-white/[0.06]">
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto mb-1 ${color}`} />
                    <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {next && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Próximo nível: {next.label}</span>
                    <span className="text-primary">{stats?.active ?? 0}/{tier === "APOIADOR" ? TIER_THRESHOLDS.ATIVISTA : TIER_THRESHOLDS.LIDER_CELULA}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((stats?.active ?? 0) / (tier === "APOIADOR" ? TIER_THRESHOLDS.ATIVISTA : TIER_THRESHOLDS.LIDER_CELULA)) * 100)}%` }}
                    />
                  </div>
                  {next.needed > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Faltam {next.needed} ativo{next.needed !== 1 ? "s" : ""} para {next.label}
                    </p>
                  )}
                </div>
              )}
              {tier === "LIDER_CELULA" && (
                <p className="text-xs text-muted-foreground text-center">Coordenador é atribuído pelo administrador</p>
              )}
            </div>

            {/* Link de convite */}
            <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4 flex flex-col">
              <h2 className="text-sm font-semibold text-foreground">Seu link de cadastro</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compartilhe este link. Quem se cadastrar por ele ficará vinculado à sua célula e contará para sua progressão de nível.
              </p>
              {referralLink && (
                <div className="mt-auto space-y-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-xl bg-white p-1.5">
                      <QRCodeSVG
                        value={referralLink}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#070a10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] overflow-hidden">
                    <span className="flex-1 min-w-0 text-xs text-muted-foreground font-mono truncate">{referralLink}</span>
                    <button onClick={copyLink} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Olá! Faça parte da base de apoio do André Santos 2026, pré-candidato a Deputado Estadual pelo PR. Cadastre-se por este link: ${referralLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Compartilhar no WhatsApp
                  </a>
                  <p className="text-[10px] text-muted-foreground">Clique no ícone para copiar o link</p>
                </div>
              )}
            </div>
          </div>

          {/* Tarefas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Minhas Tarefas</h2>
                {tasks.filter((t) => t.status === "PENDING").length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                    {tasks.filter((t) => t.status === "PENDING").length}
                  </span>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setTaskDialog(true)}>
                <Plus className="w-3 h-3" /> Nova
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center border border-white/[0.08]">
                <ClipboardList className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t) => {
                  const due = dueDateLabel(t.dueDate);
                  return (
                    <div key={t.id} className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors", t.status === "DONE" ? "border-white/[0.04] bg-white/[0.01] opacity-50" : "border-white/[0.08] bg-white/[0.03]")}>
                      <button onClick={() => toggleTask(t.id)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                        {t.status === "DONE" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm text-foreground", t.status === "DONE" && "line-through text-muted-foreground")}>{t.title}</p>
                        {t.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[t.priority])} title={PRIORITY_LABEL[t.priority]} />
                          {due && (
                            <span className={cn("flex items-center gap-0.5 text-[10px]", due.color)}>
                              <Calendar className="w-2.5 h-2.5" /> {due.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="shrink-0 text-muted-foreground/40 hover:text-red-400 transition-colors mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal nova tarefa */}
          <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título *</Label>
                  <Input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Recrutar 5 apoiadores em Colombo" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detalhes opcionais..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prazo</Label>
                    <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((f) => ({ ...f, priority: v }))}>
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
                  <Button variant="outline" size="sm" onClick={() => setTaskDialog(false)}>Cancelar</Button>
                  <Button size="sm" onClick={createTask} disabled={taskSaving} className="bg-primary text-primary-foreground">
                    {taskSaving ? "Criando..." : "Criar Tarefa"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Lista de cadastrados */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {collaborators.length} pessoa{collaborators.length !== 1 ? "s" : ""} cadastrada{collaborators.length !== 1 ? "s" : ""}
            </h2>

            {collaborators.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-white/[0.08]">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Você ainda não cadastrou ninguém</p>
                <p className="text-xs text-muted-foreground mt-1">Compartilhe seu link de cadastro para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="glass-card rounded-xl border border-white/[0.08]">
                    <div
                      className="p-4 flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{c.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{c.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                            {STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        {(c.city || c.phone) && (
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                            {c.phone && (
                              <a href={whatsappHref(c.phone)} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-green-400 transition-colors"
                              >
                                <Phone className="w-3 h-3" />{c.phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Select value={c.status} onValueChange={(v) => changeStatus(c.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LEAD">Lead</SelectItem>
                            <SelectItem value="ACTIVE">Ativo</SelectItem>
                            <SelectItem value="INACTIVE">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expanded === c.id && c.contributionTypes && c.contributionTypes.length > 0 && (
                      <div className="border-t border-white/[0.06] px-4 pb-3 pt-2">
                        <p className="text-[10px] text-muted-foreground">
                          Formas de contribuição: {c.contributionTypes.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
