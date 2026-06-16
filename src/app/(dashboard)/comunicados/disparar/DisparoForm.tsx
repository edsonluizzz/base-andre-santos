"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Users, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sourceLabel } from "@/lib/labels";

type SourceRow = { source: string; total: number; lead: number; active: number; inactive: number };
type PreviewRecipient = { id: string; name: string; phone: string; city: string | null };

type FormState = {
  title: string;
  audience: string;
  type: "DIRECT" | "GROUP" | "BROADCAST";
  groupId: string;
  source: string;          // "" = todas
  status: string;          // "" = todas
  city: string;
  message: string;
  delayMin: number;
  delayMax: number;
  dailyLimit: number;
};

const INITIAL: FormState = {
  title: "",
  audience: "",
  type: "DIRECT",
  groupId: "",
  source: "",
  status: "",
  city: "",
  message: "",
  delayMin: 300,
  delayMax: 600,
  dailyLimit: 200,
};

export function DisparoForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<PreviewRecipient[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function patch(k: keyof FormState, v: FormState[keyof FormState]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Carrega sources
  useEffect(() => {
    fetch("/api/admin/whatsapp/sources")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ok) setSources(d.sources); })
      .catch((e) => console.error("[disparar] sources", e));
  }, []);

  // Calcula filters object a partir do form
  const filters = useCallback(() => {
    const f: Record<string, unknown> = {};
    if (form.source) f.source = form.source;
    if (form.status) f.status = form.status;
    if (form.city) f.city = form.city;
    return f;
  }, [form.source, form.status, form.city]);

  // Preview de destinatários
  const refreshPreview = useCallback(async () => {
    if (form.type === "GROUP") {
      setPreviewCount(1);
      setPreviewSample([]);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || "preview",
          message: form.message || "preview",
          audience: form.audience || "preview",
          type: form.type,
          filters: filters(),
          previewOnly: true,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPreviewCount(data.count ?? 0);
        setPreviewSample(data.sample ?? []);
      } else {
        setPreviewCount(0);
        setPreviewSample([]);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [form.type, form.title, form.message, form.audience, filters]);

  // Auto-preview quando filtros mudam (debounce 500ms)
  useEffect(() => {
    const t = setTimeout(() => { refreshPreview(); }, 500);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  // Renderiza preview da mensagem com placeholders substituídos
  function renderPreview(msg: string): string {
    const sample = previewSample[0];
    const name = sample?.name?.trim() ?? "João da Silva";
    const firstName = name.split(" ")[0];
    const city = sample?.city?.trim() ?? "Curitiba";
    return msg
      .replace(/\{nome\}/gi, name)
      .replace(/\{primeironome\}/gi, firstName)
      .replace(/\{cidade\}/gi, city);
  }

  async function submit(immediate: boolean) {
    if (!form.title.trim()) { toast.error("Informe um título interno"); return; }
    if (!form.message.trim() || form.message.trim().length < 10) {
      toast.error("Mensagem muito curta (mín. 10 caracteres)"); return;
    }
    if (form.type === "GROUP" && !form.groupId.trim()) {
      toast.error("Informe o groupId do WhatsApp"); return;
    }
    if (form.type !== "GROUP" && !previewCount) {
      toast.error("Nenhum destinatário corresponde aos filtros"); return;
    }
    if (form.delayMin > form.delayMax) {
      toast.error("Delay mínimo maior que máximo"); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          audience: form.audience || form.source || "Filtro customizado",
          type: form.type,
          groupId: form.type === "GROUP" ? form.groupId : undefined,
          delaySecondsMin: form.delayMin,
          delaySecondsMax: form.delayMax,
          dailyLimit: form.dailyLimit,
          filters: filters(),
          immediate,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        toast.success(
          immediate
            ? `Disparo iniciado — ${data.broadcast.totalCount} destinatários na fila`
            : `Rascunho salvo — id ${data.broadcast.id.slice(0, 8)}…`
        );
        if (immediate) {
          window.location.href = `/comunicados`;
        }
      } else {
        toast.error(data?.error ?? "Erro ao criar disparo");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Coluna esquerda — Form */}
      <div className="lg:col-span-2 space-y-5">
        {/* Identificação interna */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-foreground">1. Identificação</h3>
          <div className="space-y-2">
            <Label htmlFor="title">Título interno *</Label>
            <Input id="title" placeholder="Ex: Aviso Gospel Class — comício 15/06"
              value={form.title} onChange={(e) => patch("title", e.target.value)} />
            <p className="text-xs text-muted-foreground">Visível só pra admins, para diferenciar disparos no histórico.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Audience (label)</Label>
            <Input id="audience" placeholder="Ex: Gospel Class"
              value={form.audience} onChange={(e) => patch("audience", e.target.value)} />
          </div>
        </div>

        {/* Tipo */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-foreground">2. Tipo de disparo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { v: "DIRECT", t: "1:1 individual", d: "Mensagem privada para cada destinatário (com pacing)" },
              { v: "GROUP", t: "Postar em grupo", d: "Única postagem num grupo WhatsApp existente" },
              { v: "BROADCAST", t: "Lista de transmissão", d: "Até 256 contatos, recipientes não veem outros" },
            ] as const).map((opt) => (
              <button key={opt.v} type="button"
                onClick={() => patch("type", opt.v)}
                className="text-left rounded-lg p-3 transition-all"
                style={{
                  background: form.type === opt.v ? "rgba(212,175,55,0.12)" : "rgba(26,47,78,0.5)",
                  border: form.type === opt.v ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  color: form.type === opt.v ? "#d4af37" : "#94a3b8",
                }}
              >
                <p className="text-sm font-semibold">{opt.t}</p>
                <p className="text-xs opacity-80 mt-0.5">{opt.d}</p>
              </button>
            ))}
          </div>
          {form.type === "GROUP" && (
            <div className="space-y-2 mt-2">
              <Label htmlFor="groupId">Group ID do WhatsApp *</Label>
              <Input id="groupId" placeholder="Ex: 120363xxxxxxxxxx@g.us"
                value={form.groupId} onChange={(e) => patch("groupId", e.target.value)} />
              <p className="text-xs text-muted-foreground">Você precisa ser admin do grupo no WhatsApp.</p>
            </div>
          )}
        </div>

        {/* Filtros (só DIRECT/BROADCAST) */}
        {form.type !== "GROUP" && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="text-sm font-semibold text-foreground">3. Filtros de destinatários</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Origem (source)</Label>
                <Select items={{ _ALL_: "Todas as origens", ...Object.fromEntries(sources.map((s) => [s.source, `${sourceLabel(s.source)} (${s.total})`])) }} value={form.source || "_ALL_"} onValueChange={(v) => patch("source", v === "_ALL_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todas as origens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_ALL_">Todas as origens</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.source} value={s.source}>
                        {sourceLabel(s.source)} ({s.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select items={{ _ALL_: "Todos", LEAD: "Leads", ACTIVE: "Ativos", INACTIVE: "Inativos" }} value={form.status || "_ALL_"} onValueChange={(v) => patch("status", v === "_ALL_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_ALL_">Todos</SelectItem>
                    <SelectItem value="LEAD">Leads</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Cidade contém</Label>
                <Input placeholder="Ex: Curitiba (deixe vazio pra todas)"
                  value={form.city} onChange={(e) => patch("city", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Mensagem */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-foreground">4. Mensagem</h3>
          <Textarea
            placeholder={'Olá, {primeironome}! Tudo bem em {cidade}?\n\nEstou te escrevendo do gabinete do André Santos...'}
            rows={8}
            value={form.message}
            onChange={(e) => patch("message", e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Placeholders: <code>{"{nome}"}</code>, <code>{"{primeironome}"}</code>, <code>{"{cidade}"}</code>
          </p>
          {form.message && (
            <div className="rounded-lg p-3 mt-2" style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.25)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#25d366" }}>Preview ({previewSample[0]?.name ?? "exemplo"}):</p>
              <p className="text-xs whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>
                {renderPreview(form.message)}
              </p>
            </div>
          )}
        </div>

        {/* Pacing */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-foreground">5. Pacing anti-ban</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dmin">Delay mín (s)</Label>
              <Input id="dmin" type="number" min={60} max={3600}
                value={form.delayMin} onChange={(e) => patch("delayMin", parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dmax">Delay máx (s)</Label>
              <Input id="dmax" type="number" min={60} max={3600}
                value={form.delayMax} onChange={(e) => patch("delayMax", parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlim">Limite/dia</Label>
              <Input id="dlim" type="number" min={10} max={2000}
                value={form.dailyLimit} onChange={(e) => patch("dailyLimit", parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Padrão recomendado: 300-600s (5-10 min) entre msgs, 200/dia.
          </p>
        </div>
      </div>

      {/* Coluna direita — Preview e ações */}
      <div className="lg:col-span-1 space-y-5">
        <div className="rounded-xl p-4 space-y-3 sticky top-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(212,175,55,0.25)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Destinatários</h3>
            <Button variant="ghost" size="sm" onClick={refreshPreview} disabled={previewLoading}>
              <RefreshCcw className={`w-3.5 h-3.5 ${previewLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {form.type === "GROUP" ? (
            <div className="text-center py-4">
              <Users className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm mt-2">Postagem única no grupo</p>
              <p className="text-xs text-muted-foreground mt-1">{form.groupId || "informe groupId"}</p>
            </div>
          ) : (
            <>
              <div className="text-center py-2">
                <p className="text-3xl font-bold" style={{ color: "#d4af37" }}>
                  {previewLoading ? "…" : (previewCount ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">destinatários únicos com WhatsApp</p>
              </div>
              {previewSample.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                  <p className="text-xs font-semibold text-muted-foreground">Amostra:</p>
                  {previewSample.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex justify-between gap-2 truncate">
                      <span className="truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{r.name}</span>
                      <span className="text-muted-foreground shrink-0">{r.city ?? "—"}</span>
                    </div>
                  ))}
                  {(previewCount ?? 0) > 5 && (
                    <p className="text-xs text-muted-foreground italic">... e mais {(previewCount ?? 0) - 5}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Estimativa de tempo */}
          {form.type !== "GROUP" && previewCount && previewCount > 0 && (
            <div className="rounded-lg p-2 text-xs" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
              <p className="font-semibold mb-0.5" style={{ color: "#d4af37" }}>Estimativa:</p>
              <p className="text-muted-foreground">
                ~{Math.ceil((previewCount * (form.delayMin + form.delayMax) / 2) / 60)} min total
                · {Math.min(previewCount, form.dailyLimit)}/dia
              </p>
              {previewCount > form.dailyLimit && (
                <p className="mt-1" style={{ color: "#f59e0b" }}>
                  ⚠️ Vai levar {Math.ceil(previewCount / form.dailyLimit)} dias pra completar
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <Button
              onClick={() => submit(true)}
              disabled={submitting}
              className="w-full"
              style={{ background: "#d4af37", color: "#0a1220" }}
            >
              <Send className="w-3.5 h-3.5 mr-2" />
              {submitting ? "Disparando…" : "Disparar agora"}
            </Button>
            <Button
              onClick={() => submit(false)}
              disabled={submitting}
              variant="outline"
              className="w-full"
            >
              Salvar como rascunho
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
