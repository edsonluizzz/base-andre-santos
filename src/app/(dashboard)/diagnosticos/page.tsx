"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Copy, ExternalLink, FileBarChart, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { telefoneWhatsApp } from "@/lib/diagnostico";

// Vendas do Diagnóstico Eleitoral: recebeu o Pix → registra aqui → manda o link pelo WhatsApp.

type Venda = {
  id: string; token: string; cargo: string; numero: string; candidato: string; cliente: string;
  telefone: string | null; valor: number; ativo: boolean; ultimoUso: string | null; createdAt: string; link: string;
};
type Candidato = { n: string; nm: string; sg: string; votos: number };

const PRECO = 297;
const CARGOS = [{ id: "estadual", nome: "Deputado Estadual" }, { id: "federal", nome: "Deputado Federal" }];
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

function mensagem(v: Venda) {
  return `Olá, ${v.cliente.split(" ")[0]}! Seu Ovile Diagnóstico 2026 de ${v.candidato} (${v.numero}) está pronto.\n\n` +
    `Acesse pelo link (é exclusivo, não compartilhe):\n${v.link}\n\n` +
    `No menu "Relatório PDF" você baixa o relatório completo.`;
}

export default function DiagnosticosPage() {
  const { data: session } = useSession();
  const superAdmin = (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin;
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [cands, setCands] = useState<Record<string, Candidato[]>>({});
  const [cargo, setCargo] = useState("estadual");
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState(String(PRECO));
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/diagnosticos");
    if (r.ok) setVendas(await r.json());
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (cands[cargo]) return;
    fetch(`/eleicao-2026/analise/dados/${cargo}.json`).then((r) => r.json())
      .then((d) => setCands((x) => ({ ...x, [cargo]: d.candidatos })))
      .catch(() => toast.error("Não consegui carregar a lista de candidatos"));
  }, [cargo, cands]);

  const lista = cands[cargo] ?? [];
  const numero = busca.match(/·\s*(\d{2,5})\s*·/)?.[1] ?? (/^\d{2,5}$/.test(busca.trim()) ? busca.trim() : "");
  const escolhido = useMemo(() => lista.find((c) => c.n === numero), [lista, numero]);
  const total = vendas.filter((v) => v.ativo).reduce((s, v) => s + v.valor, 0);

  async function criar() {
    if (!escolhido) { toast.error("Escolha o candidato na lista"); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/diagnosticos", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cargo, numero: escolhido.n, cliente, telefone, valor: Number(valor.replace(",", ".")) }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error ?? "Erro ao registrar"); return; }
      await navigator.clipboard.writeText(j.link).catch(() => {});
      toast.success("Venda registrada. Link copiado.");
      setBusca(""); setCliente(""); setTelefone(""); setValor(String(PRECO));
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(v: Venda) {
    const r = await fetch(`/api/diagnosticos/${v.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ativo: !v.ativo }) });
    if (r.ok) { toast.success(v.ativo ? "Link revogado" : "Link reativado"); carregar(); } else toast.error("Não consegui alterar");
  }

  if (session && !superAdmin) return <p className="p-6 text-muted-foreground">Acesso restrito.</p>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileBarChart className="h-6 w-6" /> Diagnósticos vendidos</h1>
          <p className="text-sm text-muted-foreground">Recebeu o Pix? Registre aqui e mande o link exclusivo pelo WhatsApp. {vendas.filter((v) => v.ativo).length} ativos · {reais(total)}</p>
        </div>
        <a href="https://diagnostico.ovile.com.br/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
          Abrir a vitrine <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[160px_1fr_1fr_160px_110px_auto] md:items-end">
        <div className="space-y-1">
          <Label>Cargo</Label>
          <select value={cargo} onChange={(e) => { setCargo(e.target.value); setBusca(""); }} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
            {CARGOS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Candidato</Label>
          <Input list="diag-cands" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou número" />
          <datalist id="diag-cands">{lista.map((c) => <option key={c.n} value={`${c.nm} · ${c.n} · ${c.sg}`} />)}</datalist>
          <p className="h-4 text-xs text-muted-foreground">{escolhido ? `${escolhido.votos.toLocaleString("pt-BR")} votos` : ""}</p>
        </div>
        <div className="space-y-1">
          <Label>Cliente (quem pagou)</Label>
          <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome" />
          <p className="h-4" />
        </div>
        <div className="space-y-1">
          <Label>WhatsApp</Label>
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(41) 99999-9999" />
          <p className="h-4" />
        </div>
        <div className="space-y-1">
          <Label>Valor (R$)</Label>
          <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
          <p className="h-4" />
        </div>
        <div className="pb-5">
          <Button onClick={criar} disabled={salvando || !escolhido || !cliente.trim()}><Plus className="mr-1 h-4 w-4" /> Gerar link</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Candidato</th><th className="p-3">Cliente</th><th className="p-3 text-right">Valor</th><th className="p-3">Vendido</th><th className="p-3">Último uso</th><th className="p-3">Link</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {vendas.map((v) => {
              const wa = telefoneWhatsApp(v.telefone);
              return (
                <tr key={v.id} className={`border-t ${v.ativo ? "" : "opacity-50"}`}>
                  <td className="p-3"><b>{v.candidato}</b><div className="text-xs text-muted-foreground">{v.numero} · {v.cargo === "federal" ? "Federal" : "Estadual"}</div></td>
                  <td className="p-3">{v.cliente}<div className="text-xs text-muted-foreground">{v.telefone ?? ""}</div></td>
                  <td className="p-3 text-right">{reais(v.valor)}</td>
                  <td className="p-3 whitespace-nowrap">{data(v.createdAt)}</td>
                  <td className="p-3 whitespace-nowrap">{data(v.ultimoUso)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" title="Copiar link" onClick={() => navigator.clipboard.writeText(v.link).then(() => toast.success("Link copiado"))}><Copy className="h-4 w-4" /></Button>
                      {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(mensagem(v))}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" title="Enviar pelo WhatsApp"><MessageCircle className="h-4 w-4" /></Button></a>}
                      <a href={v.link} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" title="Abrir como o cliente"><ExternalLink className="h-4 w-4" /></Button></a>
                    </div>
                  </td>
                  <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => alternar(v)}>{v.ativo ? "Revogar" : "Reativar"}</Button></td>
                </tr>
              );
            })}
            {!vendas.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma venda ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
