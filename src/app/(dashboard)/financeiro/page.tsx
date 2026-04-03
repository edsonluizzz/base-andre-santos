"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Lock, Landmark, Settings2, X, Printer } from "lucide-react";
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
type BankAccount = { id: string; name: string; description?: string; isDefault: boolean };

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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [offeringDialogOpen, setOfferingDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [analyticModal, setAnalyticModal] = useState<"offerings" | "expenses" | null>(null);
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

  const fetchBankAccounts = useCallback(async () => {
    const res = await fetch("/api/bank-accounts");
    if (res.ok) setBankAccounts(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetchBankAccounts(),
    ]).then(([membersData, eventsData]) => {
      setMembers((membersData as Member[]).filter((m) => m.status === "ACTIVE"));
      setEvents(eventsData);
    });
  }, [fetchBankAccounts]);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBankAccountDialogOpen(true)}
            className="border-border text-muted-foreground hover:text-gold hover:border-gold/30 gap-2"
          >
            <Landmark className="w-4 h-4" />
            <span className="hidden sm:inline">Contas</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setExpenseDialogOpen(true)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60 font-semibold gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Despesa</span>
            <span className="sm:hidden">Despesa</span>
          </Button>
          <Button
            onClick={() => setOfferingDialogOpen(true)}
            className="bg-gold hover:bg-gold-light text-black font-semibold gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Entrada</span>
            <span className="sm:hidden">Entrada</span>
          </Button>
        </div>
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
        <button
          onClick={() => setAnalyticModal("offerings")}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-success/40 hover:bg-success/5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entradas</p>
          </div>
          <p className="text-2xl font-bold text-success" style={{ fontFamily: "var(--font-heading)" }}>
            R$ {offeringsTotal.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1 group-hover:text-success/60 transition-colors">clique para ver detalhes</p>
        </button>
        <button
          onClick={() => setAnalyticModal("expenses")}
          className="bg-card border border-border rounded-xl p-5 text-left hover:border-destructive/40 hover:bg-destructive/5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saídas</p>
          </div>
          <p className="text-2xl font-bold text-destructive" style={{ fontFamily: "var(--font-heading)" }}>
            R$ {expensesTotal.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1 group-hover:text-destructive/60 transition-colors">clique para ver detalhes</p>
        </button>
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
              <button
                onClick={() => setOfferingDialogOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
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

      {/* Analytic Modal */}
      {analyticModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">
                  {analyticModal === "offerings" ? "Entradas do mês" : "Saídas do mês"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {analyticModal === "offerings"
                    ? `Total: R$ ${offeringsTotal.toFixed(2).replace(".", ",")}`
                    : `Total: R$ ${expensesTotal.toFixed(2).replace(".", ",")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button onClick={() => setAnalyticModal(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {analyticModal === "offerings" && (
                offerings.length === 0
                  ? <p className="text-center text-muted-foreground text-sm py-8">Nenhum lançamento neste mês</p>
                  : offerings.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{o.member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(o.date), "dd/MM/yyyy")}
                          {o.event && ` · ${o.event.title}`}
                          {" · "}{o.method === "PIX" ? "PIX" : "Dinheiro"}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-success">R$ {o.amount.toFixed(2).replace(".", ",")}</p>
                    </div>
                  ))
              )}
              {analyticModal === "expenses" && (
                expenses.length === 0
                  ? <p className="text-center text-muted-foreground text-sm py-8">Nenhuma despesa neste mês</p>
                  : expenses.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(e.date), "dd/MM/yyyy")}
                          {" · "}{CATEGORY_LABELS[e.category] ?? e.category}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-destructive">− R$ {e.amount.toFixed(2).replace(".", ",")}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      <AddOfferingDialog
        open={offeringDialogOpen}
        onOpenChange={setOfferingDialogOpen}
        members={members}
        events={events}
        bankAccounts={bankAccounts}
        onSuccess={() => { fetchOfferings(); setOfferingDialogOpen(false); }}
      />

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        bankAccounts={bankAccounts}
        onSuccess={() => { fetchExpenses(); setExpenseDialogOpen(false); }}
      />

      <BankAccountDialog
        open={bankAccountDialogOpen}
        onOpenChange={setBankAccountDialogOpen}
        accounts={bankAccounts}
        onSuccess={fetchBankAccounts}
      />
    </div>
  );
}

// ─── Add Offering Dialog ──────────────────────────────────────────────────────

function AddOfferingDialog({
  open, onOpenChange, members, events, bankAccounts, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
  events: Event[];
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}) {
  const defaultBankId = useMemo(
    () => bankAccounts.find((b) => b.isDefault)?.id ?? "",
    [bankAccounts]
  );
  const [form, setForm] = useState({
    memberId: "", eventId: "", bankAccountId: "", amount: "", method: "CASH", notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Sincroniza conta padrão quando bankAccounts carrega
  useEffect(() => {
    if (defaultBankId && !form.bankAccountId) {
      setForm((p) => ({ ...p, bankAccountId: defaultBankId }));
    }
  }, [defaultBankId]); // eslint-disable-line react-hooks/exhaustive-deps
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
      body: JSON.stringify({ ...form, eventId: form.eventId || null, bankAccountId: form.bankAccountId || null }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Oferta registrada!");
      setForm({ memberId: "", eventId: "", bankAccountId: defaultBankId, amount: "", method: "CASH", notes: "", date: new Date().toISOString().slice(0, 10), });
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
          {bankAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Conta de destino</Label>
              <Select value={form.bankAccountId} onValueChange={(v: string | null) => set("bankAccountId", v ?? "")}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="">Nenhuma</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.isDefault ? " ★" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
  open, onOpenChange, bankAccounts, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}) {
  const defaultBankId = useMemo(
    () => bankAccounts.find((b) => b.isDefault)?.id ?? "",
    [bankAccounts]
  );
  const [form, setForm] = useState({
    description: "", amount: "", category: "OUTRO", bankAccountId: "", notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Sincroniza conta padrão quando bankAccounts carrega
  useEffect(() => {
    if (defaultBankId && !form.bankAccountId) {
      setForm((p) => ({ ...p, bankAccountId: defaultBankId }));
    }
  }, [defaultBankId]); // eslint-disable-line react-hooks/exhaustive-deps
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
      setForm({ description: "", amount: "", category: "OUTRO", bankAccountId: defaultBankId, notes: "", date: new Date().toISOString().slice(0, 10), });
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
          {bankAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Conta de saída</Label>
              <Select value={form.bankAccountId} onValueChange={(v: string | null) => set("bankAccountId", v ?? "")}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="">Nenhuma</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.isDefault ? " ★" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

// ─── Bank Account Dialog ──────────────────────────────────────────────────────

function BankAccountDialog({
  open, onOpenChange, accounts, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: BankAccount[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);
    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, isDefault }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Conta criada!");
      setName(""); setDescription(""); setIsDefault(false);
      onSuccess();
    } else {
      toast.error("Erro ao criar conta");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/bank-accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Conta removida"); onSuccess(); }
    else toast.error("Erro ao remover");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold-light flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <Landmark className="w-4 h-4" /> Contas Bancárias / Caixas
          </DialogTitle>
        </DialogHeader>

        {accounts.length > 0 && (
          <div className="space-y-2 mb-4">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-background rounded-xl px-4 py-3 border border-border group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {a.name}{a.isDefault && <span className="ml-2 text-[10px] text-gold uppercase tracking-wider">Padrão</span>}
                  </p>
                  {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> Nova conta
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Caixa Geral, Bradesco, Espécie..."
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              Definir como conta padrão
            </label>
            <Button type="submit" disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-black font-semibold">
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
