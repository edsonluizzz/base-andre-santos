"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, FileDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type PaymentMethod = "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "BOLETO" | "CARTAO" | "OUTRO";
type PayingEntity = { id: string; name: string; active: boolean };
type Row = {
  id: string;
  date: string;
  collaboratorName: string;
  collaboratorCpf: string | null;
  amount: number;
  deliveryCount: number;
  paymentMethod: PaymentMethod | null;
  payingEntityName: string;
  payingEntityCnpj: string | null;
  pdfUrl: string | null;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CabosEleitoraisContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ amount: 0, count: 0 });
  const [payingEntities, setPayingEntities] = useState<PayingEntity[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filterEntity ? `?payingEntityId=${filterEntity}` : "";
    const res = await fetch(`/api/financeiro/cabos-eleitorais${qs}`);
    if (res.ok) {
      const j = await res.json();
      setRows(j.data ?? []);
      setTotals(j.totals ?? { amount: 0, count: 0 });
    }
    setLoading(false);
  }, [filterEntity]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/paying-entities").then((r) => r.json()).then((j) => setPayingEntities(j.data ?? [])).catch(() => {});
  }, []);

  const exportUrl = `/api/financeiro/cabos-eleitorais/export${filterEntity ? `?payingEntityId=${filterEntity}` : ""}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-4">
      <div className="flex items-end justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pagamentos a cabos eleitorais — recibo por recibo, no formato padrão pra prestação de contas ao TSE
          </p>
        </div>
        <a href={exportUrl} download>
          <Button size="sm" variant="outline" className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Exportar XLSX</Button>
        </a>
      </div>

      <FinanceNav />

      <div className="flex flex-wrap gap-3">
        <Select value={filterEntity || "ALL"} onValueChange={(v) => setFilterEntity(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Fonte pagadora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as fontes</SelectItem>
            <SelectItem value="DEFAULT">Padrão (candidato da campanha)</SelectItem>
            {payingEntities.filter((e) => e.active).map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Total pago a cabos eleitorais</p>
          <p className="text-xl font-bold text-foreground">{fmt(totals.amount)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Recibos emitidos</p>
          <p className="text-xl font-bold text-foreground">{totals.count}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Data</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Nome</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">CPF</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Forma de pagamento</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Fonte pagadora</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Valor</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Recibo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum pagamento a cabo eleitoral ainda.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.collaboratorName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.collaboratorCpf ?? "Não cadastrado"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.paymentMethod ? METHOD_LABEL[r.paymentMethod] : "Não informado"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.payingEntityName}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(r.amount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.pdfUrl && (
                      <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground inline-flex" title="Baixar PDF">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CabosEleitoraisPage() {
  return (
    <FinanceGuard>
      <CabosEleitoraisContent />
    </FinanceGuard>
  );
}
