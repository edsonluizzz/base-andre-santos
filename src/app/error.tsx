"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}
    >
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: "rgba(212,175,55,0.6)" }}>Base de Apoio · 2026</p>
        <h1 className="text-2xl font-bold text-white mb-3">Algo deu errado</h1>
        <p className="text-slate-400 text-sm mb-8">Ocorreu um erro inesperado. Tente novamente.</p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "#d4af37", color: "#0a1220" }}
        >
          <RotateCcw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
