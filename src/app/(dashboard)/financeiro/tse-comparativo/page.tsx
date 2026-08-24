"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, TrendingUp, ExternalLink } from "lucide-react";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

const ANDRE_NUMERO = 30777;

type Row = {
  numero: number;
  nome: string;
  situacao?: string | null;
  totalRecebido: number;
  qtdRecebido?: number;
  totalReceitaPF?: number;
  totalReceitaPJ?: number;
  totalPartidos?: number;
  dataUltimaAtualizacaoContas?: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ComparativoContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financeiro/tse-comparativo?uf=PR&cargo=7&partido=30");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao consultar");
      const sorted = [...(j.data as Row[])].sort((a, b) => (b.totalRecebido ?? 0) - (a.totalRecebido ?? 0));
      setRows(sorted);
      setFetchedAt(j.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao consultar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxRecebido = Math.max(1, ...rows.map((r) => r.totalRecebido ?? 0));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-4">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparativo de receitas declaradas ao TSE — Deputado Estadual PR, Partido NOVO
        </p>
      </div>

      <FinanceNav />

      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Ranking de receitas — snapshot do DivulgaCandContas (TSE)</h2>
          </div>
          <a
            href="https://divulgacandcontas.tse.jus.br/divulga/#/candidato/regiao/SUL/20322002026"
            target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            Ver no site do TSE <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          A API pública da TSE bloqueia consultas automáticas de servidor, então esses dados não são
          ao vivo — são um retrato de quando alguém buscou manualmente e salvou. Peça uma atualização
          quando quiser um número mais recente.
        </p>

        {error && (
          <p className="text-xs text-amber-400">
            {error === "Nenhum snapshot salvo ainda para esse cargo/partido/UF."
              ? "Ainda não há nenhum snapshot salvo. Peça pra buscar e salvar o comparativo."
              : error}
          </p>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? null : (
          <div className="space-y-1.5">
            {rows.map((r, i) => {
              const total = r.totalRecebido ?? 0;
              const pct = Math.round((total / maxRecebido) * 100);
              const destaque = r.numero === ANDRE_NUMERO;
              return (
                <div
                  key={r.numero}
                  className={`rounded-xl border p-3 ${destaque ? "border-primary/40 bg-primary/5" : "border-white/[0.06]"}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground w-6 shrink-0">{i + 1}º</span>
                      <p className={`text-sm truncate ${destaque ? "font-bold text-primary" : "font-medium"}`}>
                        {r.nome} <span className="text-muted-foreground font-normal">— {r.numero}</span>
                      </p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${destaque ? "text-primary" : ""}`}>{fmt(total)}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${destaque ? "bg-primary" : "bg-white/20"}`} style={{ width: `${pct}%` }} />
                  </div>
                  {(r.qtdRecebido != null || r.totalReceitaPF != null) && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {r.qtdRecebido ?? 0} doação(ões) · PF {fmt(r.totalReceitaPF ?? 0)} · PJ {fmt(r.totalReceitaPJ ?? 0)} · Fundo partidário/FEFC {fmt(r.totalPartidos ?? 0)}
                      {r.dataUltimaAtualizacaoContas && ` · Última prestação: ${r.dataUltimaAtualizacaoContas}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {fetchedAt && (
          <p className="text-[10px] text-muted-foreground/70">
            Snapshot buscado em {new Date(fetchedAt).toLocaleString("pt-BR")}.
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
