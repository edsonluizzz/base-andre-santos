"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, Clock, CalendarClock, Landmark, AlertTriangle, ShieldCheck } from "lucide-react";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";
import { acctLabel } from "@/lib/ofx";

type FinanceAdmin = { email: string; name: string | null; image: string | null; hasAccount: boolean };

type Summary = {
  saldo: number;
  totalReceitasPago: number;
  totalDespesasPago: number;
  totalPendente: number;
  totalAgendado: number;
  totalLancamentos: number;
  byPayingEntity: { payingEntityId: string | null; name: string; despesas: number; receitas: number }[];
  byCategory: { category: string; despesas: number; receitas: number }[];
  bankAccounts: { acctId: string; balance: number; asOf: string }[];
  saldoContas: number;
  extratoNaoConciliado: number;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="text-foreground font-medium shrink-0 ml-2">{fmt(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DashboardContent() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<FinanceAdmin[]>([]);

  useEffect(() => {
    fetch("/api/financeiro/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/financeiro/admins")
      .then((r) => r.json())
      .then((j) => setAdmins(j.data ?? []))
      .catch(() => {});
  }, []);

  const cards = summary ? [
    { label: "Saldo", value: summary.saldo, icon: Wallet, color: summary.saldo >= 0 ? "text-green-400" : "text-red-400", bg: "bg-primary/10" },
    { label: "Receitas pagas", value: summary.totalReceitasPago, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Despesas pagas", value: summary.totalDespesasPago, icon: TrendingDown, color: "text-foreground", bg: "bg-red-500/10" },
    { label: "Pendente", value: summary.totalPendente, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Agendado", value: summary.totalAgendado, icon: CalendarClock, color: "text-blue-400", bg: "bg-blue-500/10" },
  ] : [];

  const maxEntity = summary ? Math.max(1, ...summary.byPayingEntity.map((e) => e.despesas + e.receitas)) : 1;
  const maxCategory = summary ? Math.max(1, ...summary.byCategory.map((c) => c.despesas + c.receitas)) : 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-4">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral das finanças da campanha</p>
      </div>

      <FinanceNav />

      {loading || !summary ? (
        <p className="text-sm text-muted-foreground px-1">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="glass-card rounded-2xl p-4 border border-white/[0.06]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${c.bg}`}>
                    <Icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{c.label}</p>
                  <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
                </div>
              );
            })}
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" /> Saldo em conta (extrato bancário)
              </h2>
              {summary.extratoNaoConciliado > 0 && (
                <Link href="/financeiro/extratos" className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:underline">
                  <AlertTriangle className="w-3.5 h-3.5" /> {summary.extratoNaoConciliado} transação(ões) do extrato aguardando conciliação
                </Link>
              )}
            </div>
            {summary.bankAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum extrato importado ainda. <Link href="/financeiro/extratos" className="text-primary hover:underline">Importar OFX →</Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {summary.bankAccounts.map((b) => (
                  <div key={b.acctId} className="rounded-xl border border-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{acctLabel(b.acctId)}</p>
                    <p className={`text-base font-bold ${b.balance >= 0 ? "text-foreground" : "text-red-400"}`}>{fmt(b.balance)}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      saldo em {new Date(b.asOf).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </p>
                  </div>
                ))}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total em conta</p>
                  <p className="text-base font-bold text-primary">{fmt(summary.saldoContas)}</p>
                </div>
              </div>
            )}
          </div>

          {admins.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Quem tem acesso ao Financeiro
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {admins.map((a) => (
                  <div key={a.email} className="flex items-center gap-2 rounded-xl border border-white/[0.06] p-2.5">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-medium text-primary">
                        {(a.name ?? a.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.name ?? a.email}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {a.name ? a.email : a.hasAccount ? "" : "nunca fez login"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Controlado por FINANCE_ADMIN_EMAILS na Vercel — separado do role Administrador da campanha.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
              <h2 className="text-sm font-semibold">Por fonte pagadora</h2>
              {summary.byPayingEntity.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum lançamento ainda.</p>
              ) : (
                <div className="space-y-3">
                  {summary.byPayingEntity.map((e) => (
                    <Bar key={e.payingEntityId ?? "default"} label={e.name} value={e.despesas + e.receitas} max={maxEntity} color="bg-primary" />
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
              <h2 className="text-sm font-semibold">Por categoria</h2>
              {summary.byCategory.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum lançamento ainda.</p>
              ) : (
                <div className="space-y-3">
                  {summary.byCategory.map((c) => (
                    <Bar key={c.category} label={c.category} value={c.despesas + c.receitas} max={maxCategory} color="bg-blue-400" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/financeiro/lancamentos" className="text-xs text-primary hover:underline">
              Ver todos os {summary.totalLancamentos} lançamentos →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function FinanceiroPage() {
  return (
    <FinanceGuard>
      <DashboardContent />
    </FinanceGuard>
  );
}
