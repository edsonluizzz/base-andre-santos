"use client";

import { useEffect } from "react";
import { Cross, RotateCcw } from "lucide-react";

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
      style={{ background: "#06080F" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)",
        }}
      />
      <div className="relative text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 mb-6">
          <Cross className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-[11px] tracking-[4px] uppercase text-indigo-400/70 mb-2">Ovile · Gestão</p>
        <h1 className="text-2xl font-bold text-white mb-3">Algo deu errado</h1>
        <p className="text-slate-400 text-sm mb-8">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
