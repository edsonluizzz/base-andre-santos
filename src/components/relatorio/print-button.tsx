"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      title="Abre o diálogo de impressão — selecione 'Salvar como PDF' para exportar"
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.12] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
    >
      <Printer className="w-4 h-4" /> Imprimir / PDF
    </button>
  );
}
