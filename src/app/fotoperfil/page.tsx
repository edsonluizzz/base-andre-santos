"use client";

import { useRef, useState } from "react";
import { Star, Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Troque este arquivo pela arte final da moldura (PNG/SVG), mantendo furo
// central de raio ~430px centrado em (500,500) num canvas 1000x1000.
const BADGE_SRC = "/fotoperfil-moldura.svg";
const CANVAS_SIZE = 1000;
const PHOTO_RADIUS = 430; // deve bater com o furo central da moldura

export default function FotoPerfilPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasResult, setHasResult] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function drawComposite(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // crop centralizado (quadrado) a partir da menor dimensão da imagem
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    // recorta a foto em círculo
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, PHOTO_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sx, sy, side, side, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.restore();

    // aplica a moldura por cima
    const badge = new Image();
    badge.onload = () => {
      ctx.drawImage(badge, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      setHasResult(true);
    };
    badge.src = BADGE_SRC;
  }

  function loadFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => drawComposite(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "foto-perfil-andre-santos.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleReset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setHasResult(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a1220" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-7 text-center"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.18)" }}
      >
        {/* Header — mesmo padrão da página de privacidade */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <Star className="w-4 h-4" style={{ color: "#d4af37" }} />
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-[3px] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>
              Base de Apoio 2026
            </p>
            <p className="text-sm font-bold text-white">André Santos · Deputado Estadual PR</p>
          </div>
        </div>

        <h1 className="text-lg font-bold text-white mb-1">Foto de perfil com moldura</h1>
        <p className="text-sm text-slate-400 mb-6">
          Envie sua foto e baixe com a moldura de apoio já aplicada.
        </p>

        <div className="relative w-[220px] h-[220px] mx-auto mb-6">
          {!hasResult && (
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
              className="w-full h-full rounded-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400 transition-colors"
              style={{
                border: `2px dashed ${dragOver ? "#d4af37" : "rgba(212,175,55,0.3)"}`,
                background: dragOver ? "rgba(212,175,55,0.06)" : "transparent",
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
            className="w-full h-full rounded-full"
            style={{ display: hasResult ? "block" : "none" }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => loadFile(e.target.files?.[0])}
        />

        <div className="flex gap-2.5 justify-center">
          {hasResult && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw />
              Trocar foto
            </Button>
          )}
          <Button variant="default" disabled={!hasResult} onClick={handleDownload}>
            <Download />
            Baixar imagem
          </Button>
        </div>

        <p className="mt-5 text-[11px] text-slate-500">
          A foto é processada só no seu navegador — nada é enviado ou guardado em nenhum servidor.
        </p>
      </div>
    </div>
  );
}
