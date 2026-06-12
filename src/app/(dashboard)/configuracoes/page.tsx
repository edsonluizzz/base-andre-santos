"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Settings, Upload, X, Calendar, CheckCircle2, AlertCircle, RefreshCw, Unlink, Target, Zap, MessageSquare, Webhook, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { IntegrationsSection } from "@/components/configuracoes/integrations-section";

interface N8nStatus {
  status: { apiKeySet: boolean; leadWebhookSet: boolean; importWebhookSet: boolean; allConfigured: boolean };
  endpoints: { leadsQueue: string; updateLead: string; config: string; notifyReferrer: string };
  apiKeyPreview: string | null;
}

// Rótulo de grupo de seção — dá hierarquia à página.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground/50 px-1">
      {children}
    </p>
  );
}

const CARD = "glass-card rounded-2xl p-5 border border-white/[0.08]";

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const [campaignName, setCampaignName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null | undefined>(undefined);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [syncGoalsLoading, setSyncGoalsLoading] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<N8nStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const gcalParam = searchParams.get("gcal");
    if (gcalParam === "connected") { toast.success("Google Calendar conectado!"); setGcalConnected(true); }
    if (gcalParam === "error") toast.error("Erro ao conectar Google Calendar");
    if (gcalParam === "no_refresh_token") toast.error("Autorize o acesso offline ao Google Calendar");

    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.campaignName) setCampaignName(s.campaignName);
        if (s.logoBase64) setLogoPreview(s.logoBase64);
        if (s.googleCalendarConnected) setGcalConnected(true);
        if (s.whatsappGroupLink) setWhatsappGroupLink(s.whatsappGroupLink);
      })
      .catch(() => toast.error("Falha ao carregar configurações"));

    fetch("/api/admin/n8n-status")
      .then((r) => r.json())
      .then((d) => setN8nStatus(d))
      .catch((e) => console.error("[configuracoes] n8n-status", e));
  }, [searchParams]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo deve ter no máximo 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setLogoBase64(result);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview(null);
    setLogoBase64(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = { campaignName, whatsappGroupLink };
    if (logoBase64 !== undefined) payload.logoBase64 = logoBase64;

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) toast.success("Configurações salvas");
    else toast.error("Erro ao salvar");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-4">
      <div className="flex items-end justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ajustes gerais da base de apoio</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground shrink-0">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      {/* ── GERAL ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Geral</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Campanha */}
          <div className={`${CARD} space-y-4`}>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Campanha</h2>
            </div>
            <div>
              <Label>Nome da Campanha</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Base André Santos" />
            </div>
            <div>
              <Label>Logo da Campanha</Label>
              <div className="mt-2 flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/[0.08] bg-white/5 flex-shrink-0">
                    <Image src={logoPreview} alt="Logo" fill className="object-contain p-1" />
                    <button onClick={removeLogo} className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="border-white/[0.12] text-xs">
                    {logoPreview ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1.5">PNG, JPG ou WebP · Máx 2 MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grupo WhatsApp de Apoiadores */}
          <div className={`${CARD} space-y-4`}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold">Grupo WhatsApp de Apoiadores</h2>
            </div>
            <div>
              <Label>Link de convite do grupo</Label>
              <Input
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Usado no botão &quot;Convidar para grupo WA&quot; na lista de colaboradores.
              </p>
            </div>
            {whatsappGroupLink && (
              <a href={whatsappGroupLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors">
                <MessageSquare className="w-3 h-3" /> Testar link do grupo
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── AGENDA & DADOS ──────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Agenda & Dados</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Google Calendar */}
          <div className={`${CARD} space-y-3`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Google Calendar</h2>
            </div>
            {gcalConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> <span>Calendário conectado</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" disabled={gcalSyncing} className="gap-1.5 text-xs"
                    onClick={async () => {
                      setGcalSyncing(true);
                      const res = await fetch("/api/google-calendar/sync", { method: "POST" });
                      setGcalSyncing(false);
                      if (res.ok) { const d = await res.json(); toast.success(`Sync concluído: ${d.pushed} enviados, ${d.pulled} importados`); }
                      else toast.error("Erro ao sincronizar");
                    }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${gcalSyncing ? "animate-spin" : ""}`} />
                    {gcalSyncing ? "Sincronizando..." : "Sincronizar agora"}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={async () => {
                      const res = await fetch("/api/google-calendar/sync", { method: "DELETE" });
                      if (res.ok) { setGcalConnected(false); toast.success("Calendário desconectado"); }
                      else toast.error("Erro ao desconectar");
                    }}
                  >
                    <Unlink className="w-3.5 h-3.5" /> Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" /> <span>Não conectado</span>
                </div>
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => { window.location.href = "/api/google-calendar/connect"; }}>
                  <Calendar className="w-3.5 h-3.5" /> Conectar Google Calendar
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Sincroniza os eventos da agenda com o Google Calendar da conta autorizada.
                </p>
              </div>
            )}
          </div>

          {/* Metas por Município */}
          <div className={`${CARD} space-y-3`}>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Metas por Município</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Geradas automaticamente pelo eleitorado TSE 2022 quando o primeiro colaborador de uma cidade é cadastrado.
            </p>
            <Button size="sm" variant="outline" disabled={syncGoalsLoading} className="gap-1.5 text-xs"
              onClick={async () => {
                setSyncGoalsLoading(true);
                const res = await fetch("/api/admin/sync-goals", { method: "POST" });
                setSyncGoalsLoading(false);
                if (res.ok) {
                  const d = await res.json();
                  toast.success(d.created === 0 ? "Todas as cidades já têm metas" : `${d.created} meta(s) criada(s)`);
                } else toast.error("Erro ao sincronizar metas");
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncGoalsLoading ? "animate-spin" : ""}`} />
              {syncGoalsLoading ? "Sincronizando..." : "Sincronizar metas agora"}
            </Button>
          </div>

          {/* Score de Mobilização */}
          <div className={`${CARD} space-y-3`}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Score de Mobilização</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Recalcula o score de cada colaborador com base em perfil, apoio, status e formas de contribuição.
            </p>
            <Button size="sm" variant="outline" disabled={recalcLoading} className="gap-1.5 text-xs"
              onClick={async () => {
                setRecalcLoading(true);
                const res = await fetch("/api/admin/recalc-scores", { method: "POST" });
                setRecalcLoading(false);
                if (res.ok) { const d = await res.json(); toast.success(`Scores recalculados: ${d.updated} colaboradores`); }
                else toast.error("Erro ao recalcular");
              }}
            >
              <Zap className={`w-3.5 h-3.5 ${recalcLoading ? "animate-pulse" : ""}`} />
              {recalcLoading ? "Calculando..." : "Recalcular scores agora"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── INTEGRAÇÕES ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionLabel>Integrações</SectionLabel>
        <IntegrationsSection />
      </section>

      {/* ── AUTOMAÇÃO (n8n) — somente leitura ───────────────────── */}
      {n8nStatus && (
        <section className="space-y-3">
          <SectionLabel>Automação (n8n)</SectionLabel>
          <div className={`${CARD} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-semibold">Integração n8n</h2>
                {n8nStatus.status.allConfigured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/[0.08] text-green-400">conectada</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/[0.08] text-amber-400">incompleta</span>
                )}
              </div>
              <a href="https://andresantos.app.n8n.cloud/home/workflows" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors">
                Abrir n8n <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Painel somente leitura do estado da automação de WhatsApp.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "N8N_API_KEY", ok: n8nStatus.status.apiKeySet },
                { label: "N8N_LEAD_WEBHOOK_URL", ok: n8nStatus.status.leadWebhookSet },
                { label: "N8N_IMPORT_WEBHOOK_URL", ok: n8nStatus.status.importWebhookSet },
              ].map(({ label, ok }) => (
                <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${ok ? "border-green-500/25 bg-green-500/[0.06]" : "border-amber-500/25 bg-amber-500/[0.06]"}`}>
                  {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  <span className="text-[11px] font-mono text-muted-foreground truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={null}>
      <ConfiguracoesContent />
    </Suspense>
  );
}
