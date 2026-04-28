"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const GEO_URL = "/pr-municipalities.json";
const CENTER: [number, number] = [-51.5, -24.5];
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

export type CityData = {
  confirmado: number;
  negociando: number;
  neutro: number;
  adversario: number;
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function lerpColor(a: string, b: string, t: number): string {
  const hex = (c: string) => ({
    r: parseInt(c.slice(1, 3), 16),
    g: parseInt(c.slice(3, 5), 16),
    v: parseInt(c.slice(5, 7), 16),
  });
  const ca = hex(a); const cb = hex(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const v = Math.round(ca.v + (cb.v - ca.v) * t);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${v.toString(16).padStart(2,"0")}`;
}

function getColor(data?: CityData): string {
  if (!data) return "#1a3347";
  const { confirmado, negociando, neutro, adversario } = data;
  if (confirmado + negociando + neutro + adversario === 0) return "#1a3347";
  if (adversario > confirmado) {
    return lerpColor("#fca5a5", "#7f1d1d", Math.min(adversario / 5, 1));
  }
  if (confirmado > 0) {
    return lerpColor("#86efac", "#14532d", Math.min((confirmado - 1) / 6, 1));
  }
  if (negociando > 0) return "#92400e";
  return "#334155";
}

type TooltipState = { name: string; data?: CityData; x: number; y: number };

export function ChoroplethMap({ cityStats }: { cityStats: Record<string, CityData> }) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>(CENTER);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function handleMoveEnd({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) {
    setZoom(z);
    setCenter(coordinates);
  }

  function zoomIn()  { setZoom((z) => Math.min(z * 2, MAX_ZOOM)); }
  function zoomOut() { setZoom((z) => Math.max(z / 2, MIN_ZOOM)); }
  function reset()   { setZoom(1); setCenter(CENTER); }

  return (
    <div className="relative w-full select-none">
      {/* Controles de zoom */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        {[
          { icon: ZoomIn,      fn: zoomIn,  label: "Ampliar"   },
          { icon: ZoomOut,     fn: zoomOut, label: "Reduzir"   },
          { icon: RotateCcw,   fn: reset,   label: "Resetar"   },
        ].map(({ icon: Icon, fn, label }) => (
          <button
            key={label}
            onClick={fn}
            title={label}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-white/[0.1]"
            style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(6px)" }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 3300, center: CENTER }}
        width={900}
        height={420}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: { properties: { name: string }; rsmKey: string }[] }) =>
              geographies.map((geo) => {
                const key = normalize(geo.properties.name as string);
                const data = cityStats[key];
                const fill = getColor(data);
                // Stroke mais fino conforme zoom aumenta
                const sw = Math.max(0.15, 0.6 / zoom);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0d1f35"
                    strokeWidth={sw}
                    style={{
                      default: { outline: "none" },
                      hover:   { outline: "none", filter: "brightness(1.3)", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseMove={(evt: React.MouseEvent) => {
                      setTooltip({ name: geo.properties.name as string, data, x: evt.clientX, y: evt.clientY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Indicador de zoom */}
      {zoom > 1 && (
        <div className="absolute bottom-8 right-2 text-[10px] text-muted-foreground px-2 py-0.5 rounded"
          style={{ background: "rgba(15,23,42,0.7)" }}>
          {zoom.toFixed(1)}×
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none" style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}>
          <div className="rounded-xl px-3 py-2 text-xs shadow-xl border border-white/[0.12]"
            style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)" }}>
            <p className="font-semibold text-white mb-1">{tooltip.name}</p>
            {tooltip.data ? (
              <div className="space-y-0.5">
                {tooltip.data.confirmado > 0 && <p className="text-green-400">✓ {tooltip.data.confirmado} confirmado{tooltip.data.confirmado !== 1 ? "s" : ""}</p>}
                {tooltip.data.negociando > 0 && <p className="text-amber-400">⟳ {tooltip.data.negociando} negociando</p>}
                {tooltip.data.neutro > 0     && <p className="text-slate-400">◯ {tooltip.data.neutro} neutro{tooltip.data.neutro !== 1 ? "s" : ""}</p>}
                {tooltip.data.adversario > 0 && <p className="text-red-400">✗ {tooltip.data.adversario} adversário{tooltip.data.adversario !== 1 ? "s" : ""}</p>}
              </div>
            ) : (
              <p className="text-slate-500">Sem dados cadastrados</p>
            )}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(to right, #86efac, #14532d)" }} />
          Confirmados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#fca5a5]" />
          <span className="w-3 h-3 rounded-sm inline-block bg-[#7f1d1d]" />
          Adversários
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#92400e]" />
          Negociando
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#334155]" />
          Neutro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#1a3347] border border-white/10" />
          Sem dados
        </span>
        <span className="ml-auto text-[10px] opacity-60">Scroll ou botões para zoom · arrastar para mover</span>
      </div>
    </div>
  );
}
