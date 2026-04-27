"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Settings, Upload, Key, X, Calendar, CheckCircle2, AlertCircle, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

function ConfiguracoesContent() {
  const searchParams = useSearchParams();
  const [campaignName, setCampaignName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
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
        if (s.googleRefreshToken) setGcalConnected(true);
      })
      .catch(() => {});

    fetch("/api/campaign")
      .then((r) => r.json())
      .then((c) => { if (c.joinCode) setJoinCode(c.joinCode); })
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
