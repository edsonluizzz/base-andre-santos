"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Download, RotateCcw, Star, ZoomIn, MessageCircle } from "lucide-react";
import { tenantThemeVars } from "@/lib/color-utils";

const CANVAS_SIZE = 1080;
const PREVIEW_PX = 260;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const BAND_HEIGHT = 190; // faixa inferior com nome/número, desenhada no canvas

const DEFAULT_CANDIDATE_NAME = "André Santos";
const DEFAULT_OFFICE = "Deputado Estadual";
const DEFAULT_NUMBER = 30777;
const DEFAULT_DISTRICT = "PR";

type Pan = { x: number; y: number };

interface PublicStats {
  candidateName?: string | null;
  office?: string | null;
  candidateNumber?: number | null;
  district?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  whatsappGroupLink?: string | null;
}

function clampPan(x: number, y: number, zoom: number, img: HTMLImageElement): Pan {
  const baseScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
  const scale = baseScale * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const maxPanX = Math.max(0, (w - CANVAS_SIZE) / 2);
  const maxPanY = Math.max(0, (h - CANVAS_SIZE) / 2);
  return { x: Math.min(maxPanX, Math.max(-maxPanX, x)), y: Math.min(maxPanY, Math.max(-maxPanY, y)) };
}

export function FotoPerfilForm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [stats, setStats] = useState<PublicStats>({});
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const candidateName = stats.candidateName ?? DEFAULT_CANDIDATE_NAME;
  const office = stats.office ?? DEFAULT_OFFICE;
  const candidateNumber = stats.candidateNumber ?? DEFAULT_NUMBER;
  const district = stats.district ?? DEFAULT_DISTRICT;
  const accent = stats.primaryColor || "#ff6b04";
  const bg = stats.secondaryColor || "#0a1220";
  const waGroupUrl = stats.whatsappGroupLink || "";
  const theme = tenantThemeVars(accent, bg);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !photo) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const baseScale = Math.max(CANVAS_SIZE / photo.width, CANVAS_SIZE / photo.height);
    const scale = baseScale * zoom;
    const w = photo.width * scale;
    const h = photo.height * scale;
    const x = (CANVAS_SIZE - w) / 2 + pan.x;
    const y = (CANVAS_SIZE - h) / 2 + pan.y;
    ctx.drawImage(photo, x, y, w, h);

    // Moldura: anel de borda + faixa inferior com nome/número, na cor da campanha.
    const bandY = CANVAS_SIZE - BAND_HEIGHT;
    ctx.fillStyle = accent;
    ctx.fillRect(0, bandY, CANVAS_SIZE, BAND_HEIGHT);

    ctx.lineWidth = 18;
    ctx.strokeStyle = accent;
    ctx.strokeRect(9, 9, CANVAS_SIZE - 18, CANVAS_SIZE - 18);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 58px system-ui, -apple-system, sans-serif";
    ctx.fillText(candidateName.toUpperCase(), CANVAS_SIZE / 2, bandY + 78);
    ctx.font = "600 34px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${candidateNumber} · ${office.toUpperCase()} · ${district}`, CANVAS_SIZE / 2, bandY + 138);
  }, [photo, zoom, pan, accent, candidateName, candidateNumber, office, district]);

  function loadFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setZoom(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
        setPhoto(img);
        setDownloaded(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    if (photo) setPan((p) => clampPan(p.x, p.y, next, photo));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !photo) return;
    const rect = canvas.getBoundingClientRect();
    const factor = CANVAS_SIZE / rect.width;
    const dx = (e.clientX - drag.startX) * factor;
    const dy = (e.clientY - drag.startY) * factor;
    setPan(clampPan(drag.panX + dx, drag.panY + dy, zoom, photo));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer já pode ter sido liberado (ex: cancelado pelo navegador)
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const safeName = candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const file = new File([blob], `foto-perfil-${safeName}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Foto de perfil ${candidateName}` });
          setDownloaded(true);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `foto-perfil-${safeName}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    }, "image/png");
  }

  function handleReset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhoto(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setDownloaded(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg)", ...theme } as React.CSSProperties}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7 text-center"
        style={{ background: "rgba(var(--bg-card-rgb),0.6)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}
      >
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}
          >
            <Star className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-[3px] uppercase" style={{ color: "rgba(var(--accent-rgb),0.7)" }}>
              Base de Apoio 2026
            </p>
            <p className="text-sm font-bold text-white">
              {candidateName} · {office} {district}
            </p>
          </div>
        </div>

        <h1 className="text-lg font-bold text-white mb-1">Foto de perfil com moldura</h1>
        <p className="text-sm mb-6 text-slate-400">
          {photo ? "Arraste para posicionar e ajuste o zoom." : "Envie sua foto e baixe com a moldura de apoio já aplicada."}
        </p>

        <div className="relative mx-auto mb-4" style={{ width: PREVIEW_PX, height: PREVIEW_PX }}>
          {!photo && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                loadFile(e.dataTransfer.files?.[0]);
              }}
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 text-xs transition-colors text-slate-400"
              style={{
                border: `2px dashed ${dragOver ? "var(--accent)" : "rgba(var(--accent-rgb),0.3)"}`,
                background: dragOver ? "rgba(var(--accent-rgb),0.06)" : "transparent",
              }}
            >
              <Upload className="w-6 h-6 opacity-60" />
              <span>
                Clique ou arraste
                <br />
                sua foto aqui
              </span>
            </button>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full rounded-2xl touch-none select-none"
            style={{ display: photo ? "block" : "none", cursor: photo ? "grab" : "default" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        {photo && (
          <div className="flex items-center gap-2.5 mb-6 px-1">
            <ZoomIn className="w-4 h-4 shrink-0 text-slate-400" />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: accent }}
            />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />

        <div className="flex gap-2.5 justify-center">
          {photo && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors text-white"
              style={{ border: "1px solid rgba(var(--accent-rgb),0.3)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Trocar foto
            </button>
          )}
          <button
            type="button"
            disabled={!photo}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            <Download className="w-4 h-4" />
            Baixar imagem
          </button>
        </div>

        {downloaded && (
          <div
            className="mt-4 rounded-xl p-4 text-center"
            style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}
          >
            <p className="text-sm font-semibold text-white mb-0.5">Foto salva! 🎉</p>
            {waGroupUrl && (
              <>
                <p className="text-xs mb-3 text-slate-400">
                  Agora entra no nosso grupo do WhatsApp e faz parte da base de apoio.
                </p>
                <a
                  href={waGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Entrar no grupo do WhatsApp
                </a>
              </>
            )}
          </div>
        )}

        <p className="mt-5 text-[11px] text-slate-500">
          A foto é processada só no seu navegador — nada é enviado ou guardado em nenhum servidor.
        </p>
      </div>
    </div>
  );
}
