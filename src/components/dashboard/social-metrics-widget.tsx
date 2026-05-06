"use client";

import { useState } from "react";
import { RefreshCw, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function YtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type Metric = {
  id: string;
  platform: string;
  followers: number | null;
  posts: number | null;
  views: number | null;
  engRate: number | null;
  recordedAt: string;
};

type Props = {
  initialInstagram: Metric[];
  initialYoutube: Metric[];
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
}

function Delta({ current, previous, suffix = "" }: { current: number | null; previous: number | null; suffix?: string }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (diff === 0) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" /> estável</span>;
  const positive = diff > 0;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {positive ? "+" : ""}{fmt(diff)}{suffix}
    </span>
  );
}

function Sparkline({ data }: { data: (number | null)[] }) {
  const nums = data.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60" />
    </svg>
  );
}

export function SocialMetricsWidget({ initialInstagram, initialYoutube }: Props) {
  const [instagram, setInstagram] = useState(initialInstagram);
  const [youtube, setYoutube] = useState(initialYoutube);
  const [modalPlatform, setModalPlatform] = useState<"INSTAGRAM" | "YOUTUBE" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ followers: "", posts: "", views: "", engRate: "" });

  const igCurrent = instagram[0];
  const igPrev = instagram[1];
  const ytCurrent = youtube[0];
  const ytPrev = youtube[1];

  function openModal(platform: "INSTAGRAM" | "YOUTUBE") {
    const cur = platform === "INSTAGRAM" ? igCurrent : ytCurrent;
    setForm({
      followers: cur?.followers?.toString() ?? "",
      posts: cur?.posts?.toString() ?? "",
      views: cur?.views?.toString() ?? "",
      engRate: cur?.engRate?.toString() ?? "",
    });
    setModalPlatform(platform);
  }

  async function save() {
    if (!modalPlatform) return;
    setSaving(true);
    const res = await fetch("/api/admin/social-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: modalPlatform, ...form }),
    });
    if (res.ok) {
      const metric = await res.json();
      if (modalPlatform === "INSTAGRAM") setInstagram((p) => [metric, ...p].slice(0, 10));
      else setYoutube((p) => [metric, ...p].slice(0, 10));
      toast.success("Métricas salvas");
      setModalPlatform(null);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
    }
    setSaving(false);
  }

  async function syncYoutube() {
    setSyncing(true);
    const res = await fetch("/api/admin/social-metrics/youtube-sync", { method: "POST" });
    const d = await res.json();
    if (res.ok) {
      setYoutube((p) => [d.metric, ...p].slice(0, 10));
      toast.success("YouTube sincronizado");
    } else {
      toast.error(d.error ?? "Erro ao sincronizar");
    }
    setSyncing(false);
  }

  const igSparkline = [...instagram].reverse().map((m) => m.followers);
  const ytSparkline = [...youtube].reverse().map((m) => m.followers);

  return (
    <>
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Redes Sociais</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">YouTube sincroniza automaticamente todo dia às 8h</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Admin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Instagram */}
          <div className="rounded-xl p-4 space-y-3 border border-white/[0.06]" style={{ background: "rgba(13,27,42,0.4)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
                  <IgIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Instagram</p>
                  <p className="text-[10px] text-muted-foreground">@andresantos_as</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal("INSTAGRAM")}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{fmt(igCurrent?.followers)}</p>
                <p className="text-[10px] text-muted-foreground">seguidores</p>
                <Delta current={igCurrent?.followers ?? null} previous={igPrev?.followers ?? null} />
              </div>
              <Sparkline data={igSparkline} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.05]">
              <div>
                <p className="text-sm font-semibold text-foreground">{igCurrent?.posts ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">posts</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {igCurrent?.engRate != null ? `${igCurrent.engRate.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">engajamento</p>
              </div>
            </div>

            {igCurrent && (
              <p className="text-[10px] text-muted-foreground/50">
                Atualizado {new Date(igCurrent.recordedAt).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>

          {/* YouTube */}
          <div className="rounded-xl p-4 space-y-3 border border-white/[0.06]" style={{ background: "rgba(13,27,42,0.4)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
                  <YtIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">YouTube</p>
                  <p className="text-[10px] text-muted-foreground">@AndreSantos777</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Sincronizar YouTube" onClick={syncYoutube} disabled={syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openModal("YOUTUBE")}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{fmt(ytCurrent?.followers)}</p>
                <p className="text-[10px] text-muted-foreground">inscritos</p>
                <Delta current={ytCurrent?.followers ?? null} previous={ytPrev?.followers ?? null} />
              </div>
              <Sparkline data={ytSparkline} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.05]">
              <div>
                <p className="text-sm font-semibold text-foreground">{ytCurrent?.posts ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">vídeos</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{fmt(ytCurrent?.views)}</p>
                <p className="text-[10px] text-muted-foreground">visualizações</p>
              </div>
            </div>

            {ytCurrent && (
              <p className="text-[10px] text-muted-foreground/50">
                Atualizado {new Date(ytCurrent.recordedAt).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de atualização */}
      <Dialog open={modalPlatform !== null} onOpenChange={(v) => { if (!v) setModalPlatform(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atualizar {modalPlatform === "INSTAGRAM" ? "Instagram" : "YouTube"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>{modalPlatform === "INSTAGRAM" ? "Seguidores" : "Inscritos"}</Label>
              <Input value={form.followers} onChange={(e) => setForm((p) => ({ ...p, followers: e.target.value }))} placeholder="Ex: 56100" type="number" />
            </div>
            <div>
              <Label>{modalPlatform === "INSTAGRAM" ? "Posts" : "Vídeos"}</Label>
              <Input value={form.posts} onChange={(e) => setForm((p) => ({ ...p, posts: e.target.value }))} placeholder="Ex: 180" type="number" />
            </div>
            {modalPlatform === "YOUTUBE" && (
              <div>
                <Label>Visualizações totais</Label>
                <Input value={form.views} onChange={(e) => setForm((p) => ({ ...p, views: e.target.value }))} placeholder="Ex: 1200000" type="number" />
              </div>
            )}
            {modalPlatform === "INSTAGRAM" && (
              <div>
                <Label>Taxa de engajamento (%)</Label>
                <Input value={form.engRate} onChange={(e) => setForm((p) => ({ ...p, engRate: e.target.value }))} placeholder="Ex: 1.6" type="number" step="0.1" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalPlatform(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
