"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Send, CheckCircle2, XCircle, Clock } from "lucide-react";

interface ConversionData {
  period: number;
  curr: { sent: number; converted: number; optedOut: number; noResponse: number; conversionRate: number };
  prev: { sent: number; converted: number; optedOut: number; noResponse: number; conversionRate: number };
  delta: { sent: number; converted: number; conversionRate: number };
}

const PERIODS = [7, 30, 90] as const;

export function ConversionPanel() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [period, setPeriod] = useState<number>(7);

  useEffect(() => {
    fetch(`/api/dashboard/conversion?period=${period}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, [period]);

  if (data === null) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] h-48 animate-pulse" />
    );
  }

  const { curr, delta } = data;

  const periodLabel = period === 7 ? "7 dias" : period === 30 ? "30 dias" : "90 dias";

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Funil de Conversão</h2>
          <span className="text-[10px] text-muted-foreground">últimos {periodLabel}</span>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                period === p
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {curr.sent === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Nenhum convite enviado no período. Vai em /colaboradores → marcar leads → Enviar convite.
        </p>
      ) : (
        <>
          {/* Funil */}
          <div className="space-y-2 mb-4">
            <FunnelRow
              icon={Send}
              label="Convites enviados"
              value={curr.sent}
              pct={100}
              color="text-blue-400"
              barColor="bg-blue-400/60"
            />
            <FunnelRow
              icon={CheckCircle2}
              label="Confirmaram apoio (SIM)"
              value={curr.converted}
              pct={curr.sent > 0 ? Math.round((curr.converted / curr.sent) * 100) : 0}
              color="text-green-400"
              barColor="bg-green-400/60"
            />
            <FunnelRow
              icon={XCircle}
              label="Optaram por não participar (NÃO)"
              value={curr.optedOut}
              pct={curr.sent > 0 ? Math.round((curr.optedOut / curr.sent) * 100) : 0}
              color="text-red-400"
              barColor="bg-red-400/60"
            />
            <FunnelRow
              icon={Clock}
              label="Sem resposta"
              value={curr.noResponse}
              pct={curr.sent > 0 ? Math.round((curr.noResponse / curr.sent) * 100) : 0}
              color="text-slate-400"
              barColor="bg-slate-400/40"
            />
          </div>

          {/* Taxa + delta */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa de conversão</p>
              <p className="text-2xl font-bold text-primary">{curr.conversionRate}%</p>
            </div>
            <DeltaIndicator value={delta.conversionRate} label="vs período anterior" suffix="%" />
          </div>
        </>
      )}
    </div>
  );
}

function FunnelRow({
  icon: Icon, label, value, pct, color, barColor,
}: {
  icon: typeof Send; label: string; value: number; pct: number; color: string; barColor: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 ${color}`} />
          <span className="text-foreground">{label}</span>
        </span>
        <span className="font-semibold">
          <span className={color}>{value.toLocaleString("pt-BR")}</span>
          <span className="text-muted-foreground ml-1.5">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DeltaIndicator({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const color = positive ? "text-green-400" : negative ? "text-red-400" : "text-muted-foreground";
  return (
    <div className="text-right">
      <p className={`flex items-center justify-end gap-1 text-sm font-semibold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {positive ? "+" : ""}{value.toFixed(1)}{suffix ?? ""}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
