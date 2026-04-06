"use client";

import { useState, useEffect } from "react";
import { Crown, Zap, AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

type BillingData = {
  plan: string;
  stripeStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

export function PlanCard({ isAdmin }: { isAdmin: boolean }) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then(setBilling)
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setActionLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setActionLoading(false);
  }

  async function handlePortal() {
    setActionLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-5 w-32 bg-muted/40 rounded mb-3" />
        <div className="h-8 w-20 bg-muted/40 rounded" />
      </div>
    );
  }

  if (!billing) return null;

  const isPro = billing.plan === "PRO";
  const isTrialing = billing.stripeStatus === "trialing";
  const isPastDue = billing.stripeStatus === "past_due";
  const isCanceling = billing.cancelAtPeriodEnd;

  const trialDaysLeft = billing.trialEndsAt
    ? Math.max(0, differenceInDays(new Date(billing.trialEndsAt), new Date()))
    : null;

  const periodEnd = billing.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {isPro ? (
            <Crown className="w-5 h-5 text-amber-400" />
          ) : (
            <Zap className="w-5 h-5 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-foreground">Plano</h3>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          isPro
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-muted/30 text-muted-foreground border-border"
        }`}>
          {isPro ? "PRO" : "FREE"}
        </span>
      </div>

      {/* Status banners */}
      {isTrialing && trialDaysLeft !== null && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <p className="text-sm text-indigo-300">
            {trialDaysLeft > 0
              ? `Trial ativo — ${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}`
              : "Trial expirando hoje"}
          </p>
        </div>
      )}

      {isPastDue && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Pagamento pendente. Atualize seu método de pagamento para continuar no Pro.
          </p>
        </div>
      )}

      {isCanceling && periodEnd && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            Assinatura cancelada — acesso Pro até {periodEnd}
          </p>
        </div>
      )}

      {/* Features */}
      <div className="space-y-2 mb-5">
        {isPro ? (
          <>
            <Feature ok>Membros ilimitados</Feature>
            <Feature ok>Relatórios PDF</Feature>
            <Feature ok>Módulo Ministérios</Feature>
            <Feature ok>Camisetas e Congressos</Feature>
            <Feature ok>Suporte prioritário</Feature>
            {periodEnd && !isCanceling && (
              <p className="text-xs text-muted-foreground pt-1">Próxima cobrança: {periodEnd}</p>
            )}
          </>
        ) : (
          <>
            <Feature ok>Até 10 membros</Feature>
            <Feature ok>Chamada e eventos</Feature>
            <Feature ok>Financeiro básico</Feature>
            <Feature ok>Aniversários</Feature>
            <Feature>Relatórios PDF</Feature>
            <Feature>Módulo Ministérios</Feature>
            <Feature>Camisetas e Congressos</Feature>
            <Feature>Suporte prioritário</Feature>
          </>
        )}
      </div>

      {/* Action */}
      {isAdmin && (
        isPro ? (
          <Button
            variant="outline"
            className="w-full border-border text-muted-foreground"
            onClick={handlePortal}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Gerenciar assinatura
          </Button>
        ) : (
          <Button
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            onClick={handleUpgrade}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Crown className="w-4 h-4 mr-2" />
            )}
            Fazer upgrade — R$ 19,90/mês
          </Button>
        )
      )}
    </div>
  );
}

function Feature({ children, ok = false }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? "text-foreground" : "text-muted-foreground/50"}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${ok ? "text-emerald-400" : "text-muted-foreground/30"}`} />
      {children}
    </div>
  );
}
