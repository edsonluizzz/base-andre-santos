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
  profileBadgeUrl?: string | null;
  partnerCandidateName?: string | null;
  partnerCandidateNumber?: number | null;
  partnerOffice?: string | null;
}

// Cor padrão usada pro parceiro de chapa quando ele não tem uma moldura
// própria cadastrada neste tenant (cai no desenho programático de fallback).
const PARTNER_DEFAULT_ACCENT = "#ff6b04";

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
  const badgeRef = useRef<HTMLImageElement | null>(null);

  const [stats, setStats] = useState<PublicStats>({});
  const [selected, setSelected] = useState<"self" | "partner">("self");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [badgeReady, setBadgeReady] = useState(false);
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

  const selfName = stats.candidateName ?? DEFAULT_CANDIDATE_NAME;
  const selfOffice = stats.office ?? DEFAULT_OFFICE;
  const selfNumber = stats.candidateNumber ?? DEFAULT_NUMBER;
  const selfAccent = stats.primaryColor || "#ff6b04";
  const selfBadgeUrl = stats.profileBadgeUrl || null;
  const district = stats.district ?? DEFAULT_DISTRICT;
  const waGroupUrl = stats.whatsappGroupLink || "";

  // Chapa conjunta: quando há candidato parceiro, o apoiador escolhe pra
  // qual dos dois baixar a moldura — o parceiro não tem arte própria neste
  // tenant, então cai no desenho programático (cor padrão + nome/número dele).
  const isChapa = Boolean(stats.partnerCandidateName);
  const isPartnerSelected = isChapa && selected === "partner";
  const candidateName = isPartnerSelected ? stats.partnerCandidateName! : selfName;
  const office = isPartnerSelected ? (stats.partnerOffice ?? selfOffice) : selfOffice;
  const candidateNumber = isPartnerSelected ? (stats.partnerCandidateNumber ?? selfNumber) : selfNumber;
  const accent = isPartnerSelected ? PARTNER_DEFAULT_ACCENT : selfAccent;
  const badgeUrl = isPartnerSelected ? null : selfBadgeUrl;
  const theme = tenantThemeVars(accent);

  // Moldura própria do tenant (PNG com transparência) — carrega assim que a
  // URL chega de /api/public/stats. Sem badgeUrl, cai no desenho programático.
  useEffect(() => {
    if (!badgeUrl) { badgeRef.current = null; setBadgeReady(false); return; }
    setBadgeReady(false);
    const badge = new Image();
    badge.onload = () => { badgeRef.current = badge; setBadgeReady(true); };
    badge.src = badgeUrl;
  }, [badgeUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !photo) return;
    if (badgeUrl && !badgeReady) return; // aguarda a moldura própria carregar

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const baseScale = Math.max(CANVAS_SIZE / photo.width, CANVAS_SIZE / photo.height);
    const scale = baseScale * zoom;
    const w = photo.width * scale;
    const h = photo.height * scale;
    const x = (CANVAS_SIZE - w) / 2 + pan.x;
    const y = (CANVAS_SIZE - h) / 2 + pan.y;
    ctx.drawImage(photo, x, y, w, h);

    if (badgeUrl && badgeRef.current) {
      // Moldura própria do tenant (arte pronta, com transparência).
      ctx.drawImage(badgeRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    // Fallback: sem arte própria, desenha uma moldura simples com as cores
    // da campanha (anel de borda + faixa inferior com nome/número).
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
  }, [photo, zoom, pan, accent, candidateName, candidateNumber, office, district, badgeUrl, badgeReady]);

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

  function selectCandidate(which: "self" | "partner") {
    if (which === selected) return;
    setSelected(which);
    handleReset(); // troca de moldura invalida o zoom/pan e a foto já enquadrada
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)", ...theme } as React.CSSProperties}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7 text-center"
        style={{ background: "rgba(13,27,42,0.7)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}
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

        {isChapa && (
          <div className="flex gap-2 justify-center mb-4">
            <button
              type="button"
              onClick={() => selectCandidate("self")}
              className="flex-1 rounded-xl py-2 text-xs font-semibold transition-colors"
              style={{
                background: selected === "self" ? "rgba(var(--accent-rgb),0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected === "self" ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                color: selected === "self" ? "var(--accent)" : "#94a3b8",
              }}
            >
              {selfName}
            </button>
            <button
              type="button"
              onClick={() => selectCandidate("partner")}
              className="flex-1 rounded-xl py-2 text-xs font-semibold transition-colors"
              style={{
                background: selected === "partner" ? "rgba(var(--accent-rgb),0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected === "partner" ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                color: selected === "partner" ? "var(--accent)" : "#94a3b8",
              }}
            >
              {stats.partnerCandidateName}
            </button>
          </div>
        )}

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
            style={{ background: "var(--accent)", color: "#0a1220" }}
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
                  style={{ background: "var(--accent)", color: "#0a1220" }}
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
