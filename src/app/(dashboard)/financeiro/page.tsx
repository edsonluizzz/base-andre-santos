"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { usePermissions } from "@/context/permissions-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type Offering = {
  id: string;
  amount: number;
  method: "CASH" | "PIX";
  date: string;
  notes: string | null;
  member: { id: string; name: string };
  event: { id: string; title: string; type: string } | null;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
};

type Member = { id: string; name: string; status: string };
type Event = { id: string; title: string; type: string };

const METHOD_LABELS = { CASH: "Dinheiro", PIX: "PIX" };

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "Material",
  TRANSPORTE: "Transporte",
  ALIMENTACAO: "Alimentação",
  EVENTO: "Evento",
  OUTRO: "Outro",
};

export default function FinanceiroPage() {
  const { canView } = usePermissions();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(currentMonth);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [offeringsTotal, setOfferingsTotal] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [offeringDialogOpen, setOfferingDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchOfferings = useCallback(async () => {
    const res = await fetch(`/api/offerings?month=${month}`);
    const data = await res.json();
    setOfferings(data.offerings);
    setOfferingsTotal(data.total);
  }, [month]);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch(`/api/expenses?month=${month}`);
    const data = await res.json();
    setExpenses(data.expenses);
    setExpensesTotal(data.total);
  }, [month]);

  useEffect(() => {
    setPageLoading(true);
    Promise.all([fetchOfferings(), fetchExpenses()]).finally(() =>
      setPageLoading(false)
    );
  }, [fetchOfferings, fetchExpenses]);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) =>
      setMembers((d as Member[]).filter((m) => m.status === "ACTIVE"))
    );
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }, []);

  async function handleDeleteOffering(id: string) {
    const res = await fetch(`/api/offerings?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Registro removido"); fetchOfferings(); }
    else toast.error("Erro ao remover");
  }

  async function handleDeleteExpense(id: string) {
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Despesa removida"); fetchExpenses(); }
    else toast.error("Erro ao remover");
  }

  // Per-member totals
  const perMember: Record<string, { name: string; total: number; count: number }> = {};
  for (const o of offerings) {
    if (!perMember[o.member.id]) {
      perMember[o.member.id] = { name: o.member.name, total: 0, count: 0 };
    }
    perMember[o.member.id].total += o.amount;
    perMember[o.member.id].count++;
  }
  const sorted = Object.values(perMember).sort((a, b) => b.total - a.total);
  const saldo = offeringsTotal - expensesTotal;

  if (!canView("FINANCIAL")) {
    return (
      <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
        <Lock className="w-8 h-8 text-muted-foreground/50 mb-3" />
        <p className="text-foreground font-medium">Acesso restrito</p>
        <p className="text-muted-foreground text-sm mt-1">
          Você não tem permissão para acessar o módulo financeiro.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold text-gold-light"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Entradas e despesas do mês</p>
        </div>
        <Button
          onClick={() => setOfferingDialogOpen(true)}
          className="bg-gold hover:bg-gold-light text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Oferta
        </Button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3 mb-6">
        <Label className="text-muted-foreground text-sm whitespace-nowrap">Mês:</Label>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-44 bg-card border-border text-foreground focus-visible:ring-gold-muted"
        />
      </div>

      {/* Summary cards */}
      {pageLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!pageLoading && (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entradas</p>
          </div>
          <p className="text-2xl font-bold text-success" style={{ fontFamily: "var(--font-heading)" }}>
            R$ {offeringsTotal.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saídas</p>
          </div>
          <p className="text-2xl font-bold text-destructive" style={{ fontFamily: "var(--font-heading)" }}>
            R$ {expensesTotal.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Minus className="w-3.5 h-3.5 text-gold" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</p>
          </div>
          <p
            className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            R$ {saldo.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Contribuintes</p>
          <p className="text-2xl font-bold text-gold" style={{ fontFamily: "var(--font-heading)" }}>
            {Object.keys(perMember).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-member ranking */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-4 h-4 text-gold" />
            <span className="text-[11px] tracking-[3px] uppercase text-gold">Por participante</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {sorted.length === 0 && (
              <p className="text-muted-foreground text-sm py-8 text-center">Nenhum registro neste mês</p>
            )}
            {sorted.map((m, i) => (
              <div key={m.name} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <span className="text-muted-foreground text-xs font-bold w-5 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.count} contribuição{m.count !== 1 ? "ões" : ""}</p>
                </div>
                <p className="text-sm font-bold text-gold">
                  R$ {m.total.toFixed(2).replace(".", ",")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: lançamentos + despesas */}
        <div className="space-y-6">
          {/* Recent offerings */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] tracking-[3px] uppercase text-gold">Lançamentos</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {offerings.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhum lançamento</p>
              )}
              {offerings.slice(0, 12).map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{o.member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(o.date), "dd/MM/yyyy")}
                      {o.event && ` · ${o.event.title}`}
                      {" · "}
                      <span className={o.method === "PIX" ? "text-gold" : "text-muted-foreground"}>
                        {METHOD_LABELS[o.method]}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm font-bold text-success flex-shrink-0">
                    R$ {o.amount.toFixed(2).replace(".", ",")}
                  </p>
                  <button
                    onClick={() => handleDeleteOffering(o.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-[11px] tracking-[3px] uppercase text-destructive">Despesas</span>
              <div className="flex-1 h-px bg-border" />
              <button
                onClick={() => setExpenseDialogOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {expenses.length === 0 && (
                <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma despesa registrada</p>
              )}
              {expenses.map((e) => (
                <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.date), "dd/MM/yyyy")}
                      {" · "}
                      <span className="text-muted-foreground">{CATEGORY_LABELS[e.category] ?? e.category}</span>
                    </p>
                  </div>
                  <p className="text-sm font-bold text-destructive flex-shrink-0">
                    − R$ {e.amount.toFixed(2).replace(".", ",")}
                  </p>
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>)}

      <AddOfferingDialog
        open={offeringDialogOpen}
        onOpenChange={setOfferingDialogOpen}
        members={members}
        events={events}
        onSuccess={() => { fetchOfferings(); setOfferingDialogOpen(false); }}
      />

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={() => { fetchExpenses(); setExpenseDialogOpen(false); }}
      />
    </div>
  );
}

// ─── Add Offering Dialog ──────────────────────────────────────────────────────

function AddOfferingDialog({
  open, onOpenChange, members, events, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
  events: Event[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    memberId: "", eventId: "", amount: "", method: "CASH", notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberId || !form.amount) {
      toast.error("Participante e valor são obrigatórios");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventId: form.eventId || null }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Oferta registrada!");
      setForm({ memberId: "", eventId: "", amount: "", method: "CASH", notes: "", date: new Date().toISOString().slice(0, 10) });
      onSuccess();
    } else {
      toast.error("Erro ao registrar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold-light" style={{ fontFamily: "var(--font-heading)" }}>
            Registrar Oferta
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Participante *</Label>
            <Select value={form.memberId} onValueChange={(v: string | null) => v && set("memberId", v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-52">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} placeholder="0,00"
                className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Método</Label>
              <Select value={form.method} onValueChange={(v: string | null) => v && set("method", v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Data</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Evento (opcional)</Label>
              <Select value={form.eventId} onValueChange={(v: string | null) => set("eventId", v ?? "")}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-48">
                  <SelectItem value="">Nenhum</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-1 bg-gold hover:bg-gold-light text-black font-semibold">
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Expense Dialog ───────────────────────────────────────────────────────

function AddExpenseDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    description: "", amount: "", category: "OUTRO", notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) {
      toast.error("Descrição e valor são obrigatórios");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Despesa registrada!");
      setForm({ description: "", amount: "", category: "OUTRO", notes: "", date: new Date().toISOString().slice(0, 10) });
      onSuccess();
    } else {
      toast.error("Erro ao registrar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold-light" style={{ fontFamily: "var(--font-heading)" }}>
            Registrar Despesa
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Descrição *</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Ex: Compra de material..."
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} placeholder="0,00"
                className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Categoria</Label>
              <Select value={form.category} onValueChange={(v: string | null) => v && set("category", v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="TRANSPORTE">Transporte</SelectItem>
                  <SelectItem value="ALIMENTACAO">Alimentação</SelectItem>
                  <SelectItem value="EVENTO">Evento</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Data</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-1 bg-gold hover:bg-gold-light text-black font-semibold">
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
