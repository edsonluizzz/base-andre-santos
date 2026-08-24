"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";
import { TSE_BOOKMARKLET_HREF, TSE_SNAPSHOT_MARKER } from "@/lib/tse-bookmarklet";

const CARGOS = [
  { cargo: 7, label: "Deputado Estadual", destaque: [30777] },
  { cargo: 6, label: "Deputado Federal", destaque: [3003, 3000] },
] as const;

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
  const [cargoIdx, setCargoIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingBookmarklet, setApplyingBookmarklet] = useState(false);
  const [bookmarkletMsg, setBookmarkletMsg] = useState<string | null>(null);
  const appliedBookmarklet = useRef(false);

  const { cargo, label, destaque: destaqueNumeros } = CARGOS[cargoIdx];

  const load = useCallback(async (cargoCodigo: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financeiro/tse-comparativo?uf=PR&cargo=${cargoCodigo}&partido=30`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao consultar");
      const sorted = [...(j.data as Row[])].sort((a, b) => (b.totalRecebido ?? 0) - (a.totalRecebido ?? 0));
      setRows(sorted);
      setFetchedAt(j.fetchedAt);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Erro ao consultar");
    } finally {
      setLoading(false);
    }
  }, []);

  // Recebe o resultado do bookmarklet "Atualizar TSE" (rodado na aba da própria TSE, que grava o
  // payload em window.name antes de navegar de volta pra cá — window.name sobrevive a navegação
  // cross-origin same-tab, o que dá pra usar como transporte já que fetch direto pra TSE é bloqueado
  // por CORS a partir desse domínio).
  useEffect(() => {
    if (appliedBookmarklet.current) return;
    const raw = window.name;
    if (!raw.startsWith(TSE_SNAPSHOT_MARKER)) return;
    appliedBookmarklet.current = true;
    window.name = "";
    (async () => {
      setApplyingBookmarklet(true);
      setBookmarkletMsg(null);
      try {
        const payload = JSON.parse(raw.slice(TSE_SNAPSHOT_MARKER.length)) as Record<string, Row[]>;
        const entries = Object.entries(payload).filter(([, data]) => Array.isArray(data) && data.length > 0);
        if (entries.length === 0) throw new Error("O favorito não trouxe nenhum candidato.");
        for (const [cargoStr, data] of entries) {
          const res = await fetch("/api/financeiro/tse-comparativo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uf: "PR", cargo: Number(cargoStr), partido: 30, data }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error ?? `Erro ao salvar cargo ${cargoStr}`);
        }
        setBookmarkletMsg(`Snapshot atualizado agora (${entries.length} cargo(s)).`);
        load(cargo);
      } catch (e) {
        setBookmarkletMsg(e instanceof Error ? `Erro ao aplicar atualização: ${e.message}` : "Erro ao aplicar atualização.");
      } finally {
        setApplyingBookmarklet(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(cargo); }, [load, cargo]);

  const maxRecebido = Math.max(1, ...rows.map((r) => r.totalRecebido ?? 0));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-4">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparativo de receitas declaradas ao TSE — {label} PR, Partido NOVO
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

        <div className="flex gap-1.5">
          {CARGOS.map((c, i) => (
            <button
              key={c.cargo}
              onClick={() => setCargoIdx(i)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                i === cargoIdx
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          A API pública da TSE bloqueia consultas automáticas de servidor (e também bloqueia chamada
          direta daqui por CORS), então esses dados não são ao vivo — são um retrato de quando alguém
          buscou manualmente e salvou.
        </p>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-semibold">Atualizar os dados (uma vez só, depois é 1 clique)</p>
          </div>
          <ol className="text-[11px] text-muted-foreground list-decimal list-inside space-y-0.5">
            <li>
              Arraste o botão{" "}
              <a
                href={TSE_BOOKMARKLET_HREF}
                className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-primary align-middle cursor-grab select-none"
                onClick={(e) => e.preventDefault()}
              >
                🔄 Atualizar TSE
              </a>{" "}
              pra barra de favoritos do navegador (isso só precisa ser feito uma vez).
            </li>
            <li>
              Sempre que quiser atualizar: abra{" "}
              <a
                href="https://divulgacandcontas.tse.jus.br/divulga/#/candidato/regiao/SUL/20322002026"
                target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                o site do TSE
              </a>{" "}
              e clique no favorito. Ele busca os candidatos de Estadual e Federal e volta sozinho pra cá
              já salvo.
            </li>
          </ol>
          {applyingBookmarklet && <p className="text-[11px] text-primary">Salvando snapshot novo…</p>}
          {bookmarkletMsg && <p className="text-[11px] text-muted-foreground">{bookmarkletMsg}</p>}
        </div>

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
              const destaque = (destaqueNumeros as readonly number[]).includes(r.numero);
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
