"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Stats = { totalRows: number; semEmail: number; invalido: number; duplicado: number; suprimido: number; final: number };
type Campaign = { id: string; subject: string; bodyText: string; ctaLabel: string | null; ctaUrl: string | null; createdAt: string };
type Status = { PENDING: number; SENDING: number; SENT: number; FAILED: number };
type Detail = { campaign: Campaign; stats: Status; sentLast24h: number; dailyLimit: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json as T;
}

export default function MalaDiretaPage() {
  const [dry, setDry] = useState<{ stats: Stats; sentLast24h: number; dailyLimit: number } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [form, setForm] = useState({ subject: "", bodyText: "", ctaLabel: "", ctaUrl: "" });
  const [wave, setWave] = useState(100);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setDry(await api("/api/mala-direta/dry-run"));
      setCampaigns(await api("/api/mala-direta/campaigns"));
    } catch (e) { toast.error((e as Error).message); }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try { setSelected(await api(`/api/mala-direta/campaigns/${id}`)); }
    catch (e) { toast.error((e as Error).message); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  async function salvar() {
    setBusy(true);
    try {
      const c = await api<Campaign>("/api/mala-direta/campaigns", { method: "POST", body: JSON.stringify(form) });
      toast.success("Rascunho salvo");
      await loadAll();
      await loadDetail(c.id);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function testar() {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await api<{ to: string }>(`/api/mala-direta/campaigns/${selected.campaign.id}/test`, { method: "POST", body: "{}" });
      toast.success(`Teste enviado para ${r.to}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function enviarOnda() {
    if (!selected) return;
    const restante = selected.stats.PENDING;
    if (!window.confirm(`Enviar até ${wave} emails agora? (pendentes: ${restante}). Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      const r = await api<{ claimed: number; sent: number; failed: number }>(
        `/api/mala-direta/campaigns/${selected.campaign.id}/send`,
        { method: "POST", body: JSON.stringify({ requested: wave }) },
      );
      toast.success(`Enviados: ${r.sent} · Falhas: ${r.failed}`);
      await loadDetail(selected.campaign.id);
      await loadAll();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Mala direta</h1>

      <section className="rounded-xl border p-4 space-y-1">
        <h2 className="font-semibold">Público (dry-run)</h2>
        {dry ? (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{dry.stats.final}</strong> destinatários · {dry.stats.semEmail} sem email ·{" "}
            {dry.stats.invalido} inválidos · {dry.stats.duplicado} duplicados · {dry.stats.suprimido} descadastrados ·
            enviados nas últimas 24h: {dry.sentLast24h}/{dry.dailyLimit}
          </p>
        ) : <p className="text-sm">Carregando…</p>}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Nova mala direta</h2>
        <div><Label>Assunto</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div>
          <Label>Texto (use {"{{nome}}"} para o primeiro nome; linha em branco separa parágrafos)</Label>
          <Textarea rows={10} value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Texto do botão (opcional)</Label><Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></div>
          <div><Label>Link do botão (https)</Label><Input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></div>
        </div>
        <Button onClick={salvar} disabled={busy}>Salvar rascunho</Button>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Rascunhos e envios</h2>
        <ul className="divide-y">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button className="w-full text-left py-2 hover:underline" onClick={() => loadDetail(c.id)}>
                {c.subject} <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("pt-BR")}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <p className="text-sm">
              <strong>{selected.campaign.subject}</strong> — pendentes {selected.stats.PENDING} · enviados {selected.stats.SENT} ·
              falhas {selected.stats.FAILED} · em envio {selected.stats.SENDING} · 24h: {selected.sentLast24h}/{selected.dailyLimit}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="outline" onClick={testar} disabled={busy}>Enviar teste para mim</Button>
              <div>
                <Label>Tamanho da onda</Label>
                <Input type="number" min={1} value={wave} onChange={(e) => setWave(Number(e.target.value))} className="w-28" />
              </div>
              <Button onClick={enviarOnda} disabled={busy}>Enviar onda</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
