"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, RefreshCw, TrendingUp, ExternalLink } from "lucide-react";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type Row = {
  numero: number;
  nome: string;
  situacao: string | null;
  destaque: boolean;
  contas: {
    dataUltimaAtualizacaoContas: string | null;
    totalRecebido: number;
    qtdRecebido: number;
    totalReceitaPF: number;
    totalReceitaPJ: number;
    totalPartidos: number;
    totalProprios: number;
  } | null;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ComparativoContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financeiro/tse-comparativo?uf=PR&cargo=7&partido=30&destaque=30777");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao consultar");
      setRows(j.data ?? []);
      setAtualizadoEm(j.atualizadoEm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar TSE");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxRecebido = Math.max(1, ...rows.map((r) => r.contas?.totalRecebido ?? 0));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-4">
      <div className="flex items-end justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comparativo de receitas declaradas ao TSE — Deputado Estadual PR, Partido NOVO
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      <FinanceNav />

      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Ranking de receitas — direto do DivulgaCandContas (TSE)</h2>
          </div>
          <a
            href="https://divulgacandcontas.tse.jus.br/divulga/#/candidato/regiao/SUL/20322002026"
            target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            Ver no site do TSE <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {error && (
          <p className="text-xs text-red-400">
            {error} — o site do TSE pode estar bloqueando a consulta automática ou fora do ar. Tente de novo em alguns minutos.
          </p>
        )}

        {loading && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Consultando o TSE ao vivo...</p>
        ) : rows.length === 0 && !error ? (
          <p className="text-xs text-muted-foreground">Nenhum candidato encontrado.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => {
              const total = r.contas?.totalRecebido ?? 0;
              const pct = Math.round((total / maxRecebido) * 100);
              return (
                <div
                  key={r.numero}
                  className={`rounded-xl border p-3 ${
                    r.destaque ? "border-primary/40 bg-primary/5" : "border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground w-5 shrink-0">{i + 1}º</span>
                      <p className={`text-sm truncate ${r.destaque ? "font-bold text-primary" : "font-medium"}`}>
                        {r.nome} <span className="text-muted-foreground font-normal">— {r.numero}</span>
                      </p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${r.destaque ? "text-primary" : ""}`}>{fmt(total)}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.destaque ? "bg-primary" : "bg-white/20"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {r.contas && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {r.contas.qtdRecebido} doação(ões) · PF {fmt(r.contas.totalReceitaPF)} · PJ {fmt(r.contas.totalReceitaPJ)} · Fundo partidário/FEFC {fmt(r.contas.totalPartidos)}
                      {r.contas.dataUltimaAtualizacaoContas && ` · Última prestação: ${r.contas.dataUltimaAtualizacaoContas}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {atualizadoEm && (
          <p className="text-[10px] text-muted-foreground/70">
            Consultado agora ({new Date(atualizadoEm).toLocaleTimeString("pt-BR")}) direto na API pública do TSE — os valores
            refletem a última prestação de contas que cada candidato entregou, não necessariamente hoje.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ComparativoTsePage() {
  return (
    <FinanceGuard>
      <ComparativoContent />
    </FinanceGuard>
  );
}
