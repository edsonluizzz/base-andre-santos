"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Settings, Upload, Key, X, Calendar, CheckCircle2, AlertCircle, RefreshCw, Unlink, Target, Trash2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

type MunicipalityGoal = { id: string; city: string; targetVotes: number; targetLeaders: number };

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const [campaignName, setCampaignName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Metas por município
  const [goals, setGoals] = useState<MunicipalityGoal[]>([]);
  const [goalForm, setGoalForm] = useState({ city: "", targetVotes: "", targetLeaders: "" });
  const [savingGoal, setSavingGoal] = useState(false);
  const [importingTse, setImportingTse] = useState(false);

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
        if (s.googleRefreshToken) setGcalConnected(true);
      })
      .catch(() => {});

    fetch("/api/campaign")
      .then((r) => r.json())
      .then((c) => { if (c.joinCode) setJoinCode(c.joinCode); })
      .catch(() => {});

    fetch("/api/municipality-goals")
      .then((r) => r.ok ? r.json() : [])
      .then(setGoals)
      .catch(() => {});
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

  async function handleSaveGoal() {
    if (!goalForm.city.trim()) { toast.error("Informe o município"); return; }
    setSavingGoal(true);
    const res = await fetch("/api/municipality-goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: goalForm.city.trim(), targetVotes: goalForm.targetVotes, targetLeaders: goalForm.targetLeaders }),
    });
    setSavingGoal(false);
    if (res.ok) {
      const updated = await res.json();
      setGoals((prev) => {
        const idx = prev.findIndex((g) => g.city === updated.city);
        return idx >= 0 ? prev.map((g, i) => i === idx ? updated : g) : [...prev, updated].sort((a, b) => a.city.localeCompare(b.city));
      });
      setGoalForm({ city: "", targetVotes: "", targetLeaders: "" });
      toast.success("Meta salva");
    } else toast.error("Erro ao salvar meta");
  }

  async function importTseGoals() {
    setImportingTse(true);
    try {
      const res = await fetch("/api/tse/municipios-pr");
      if (!res.ok) { toast.error("Erro ao buscar dados TSE"); return; }
      const suggestions: { city: string; metaSugerida: number; metaLideres: number }[] = await res.json();

      // Só importa cidades que ainda não têm meta definida
      const existing = new Set(goals.map((g) => g.city.toLowerCase()));
      const toImport = suggestions.filter((s) => !existing.has(s.city.toLowerCase())).slice(0, 20);

      if (toImport.length === 0) { toast.info("Todas as cidades sugeridas já têm meta"); return; }

      let count = 0;
      for (const s of toImport) {
        const r = await fetch("/api/municipality-goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: s.city, targetVotes: s.metaSugerida, targetLeaders: s.metaLideres }),
        });
        if (r.ok) {
          const updated = await r.json();
          setGoals((prev) => {
            const idx = prev.findIndex((g) => g.city === updated.city);
            return idx >= 0 ? prev.map((g, i) => i === idx ? updated : g) : [...prev, updated].sort((a, b) => a.city.localeCompare(b.city));
          });
          count++;
        }
      }
      toast.success(`${count} metas importadas com base no eleitorado PR 2022`);
    } finally {
      setImportingTse(false);
    }
  }

  async function handleDeleteGoal(city: string) {
    const res = await fetch("/api/municipality-goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    if (res.ok) { setGoals((prev) => prev.filter((g) => g.city !== city)); toast.success("Meta removida"); }
    else toast.error("Erro ao remover");
  }

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = { campaignName };
    if (logoBase64 !== undefined) payload.logoBase64 = logoBase64;

    const [settingsRes, campaignRes] = await Promise.all([
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      joinCode
        ? fetch("/api/campaign", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ joinCode }),
          })
        : Promise.resolve({ ok: true }),
    ]);

    setSaving(false);
    if (settingsRes.ok && (campaignRes as Response).ok) toast.success("Configurações salvas");
    else toast.error("Erro ao salvar");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações gerais da base de apoio</p>
      </div>

      {/* Campanha */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Campanha</h2>
        </div>

        <div>
          <Label>Nome da Campanha</Label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Base André Santos"
          />
        </div>

        {/* Logo */}
        <div>
          <Label>Logo da Campanha</Label>
          <div className="mt-2 flex items-start gap-4">
            {logoPreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/[0.08] bg-white/5 flex-shrink-0">
                <Image src={logoPreview} alt="Logo" fill className="object-contain p-1" />
                <button
                  onClick={removeLogo}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="border-white/[0.12] text-xs"
              >
                {logoPreview ? "Trocar logo" : "Enviar logo"}
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1.5">PNG, JPG ou WebP · Máx 2 MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acesso */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Acesso</h2>
        </div>
        <div>
          <Label>Código de Convite</Label>
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="andre2026"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Colaboradores usam este código para solicitar acesso à base.
          </p>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Google Calendar</h2>
        </div>
        {gcalConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Calendário conectado</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={gcalSyncing} className="gap-1.5 text-xs"
                onClick={async () => {
                  setGcalSyncing(true);
                  const res = await fetch("/api/google-calendar/sync", { method: "POST" });
                  setGcalSyncing(false);
                  if (res.ok) {
                    const d = await res.json();
                    toast.success(`Sync concluído: ${d.pushed} enviados, ${d.pulled} importados`);
                  } else toast.error("Erro ao sincronizar");
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
              <AlertCircle className="w-4 h-4" />
              <span>Não conectado</span>
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
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Metas por Município</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">Defina metas de votos e lideranças por cidade para acompanhar no relatório.</p>
        <Button
          size="sm" variant="outline"
          onClick={importTseGoals}
          disabled={importingTse}
          className="gap-1.5 text-xs h-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${importingTse ? "animate-spin" : ""}`} />
          {importingTse ? "Importando..." : "Sugerir metas por eleitorado PR 2022"}
        </Button>

        {/* Formulário nova meta */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 sm:col-span-1">
            <Input
              value={goalForm.city}
              onChange={(e) => setGoalForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Município"
            />
          </div>
          <div>
            <Input
              type="number"
              value={goalForm.targetVotes}
              onChange={(e) => setGoalForm((f) => ({ ...f, targetVotes: e.target.value }))}
              placeholder="Meta votos"
              min={0}
            />
          </div>
          <div>
            <Input
              type="number"
              value={goalForm.targetLeaders}
              onChange={(e) => setGoalForm((f) => ({ ...f, targetLeaders: e.target.value }))}
              placeholder="Meta líderes"
              min={0}
            />
          </div>
        </div>
        <Button onClick={handleSaveGoal} disabled={savingGoal} size="sm" className="bg-primary text-primary-foreground gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          {savingGoal ? "Salvando..." : "Adicionar / Atualizar meta"}
        </Button>

        {/* Lista de metas */}
        {goals.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm text-foreground font-medium">{g.city}</p>
                  <p className="text-[10px] text-muted-foreground">{g.targetVotes} votos · {g.targetLeaders} líderes</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGoalForm({ city: g.city, targetVotes: String(g.targetVotes), targetLeaders: String(g.targetLeaders) })}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(g.city)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score de mobilização */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Score de Mobilização</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Calcula automaticamente o score de cada colaborador com base em perfil, apoio declarado, status e formas de contribuição.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={recalcLoading}
          className="gap-1.5 text-xs"
          onClick={async () => {
            setRecalcLoading(true);
            const res = await fetch("/api/admin/recalc-scores", { method: "POST" });
            setRecalcLoading(false);
            if (res.ok) {
              const d = await res.json();
              toast.success(`Scores recalculados: ${d.updated} colaboradores`);
            } else toast.error("Erro ao recalcular");
          }}
        >
          <Zap className={`w-3.5 h-3.5 ${recalcLoading ? "animate-pulse" : ""}`} />
          {recalcLoading ? "Calculando..." : "Recalcular scores agora"}
        </Button>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
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
