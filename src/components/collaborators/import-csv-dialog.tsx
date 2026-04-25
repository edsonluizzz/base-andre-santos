"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void };
type Step = "upload" | "preview" | "done";
type Row = Record<string, string>;
type Result = { created: number; skipped: number; errors: string[] };

const TEMPLATE = "nome,telefone,email,cidade,bairro,cargo\nJoão Silva,(41) 99999-9999,joao@email.com,Curitiba,Centro,VOLUNTARIO\nMaria Souza,(41) 98888-8888,,São José dos Pinhais,Afonso Pena,LIDER_BAIRRO\n";

function parseCSV(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  }).filter((r) => Object.values(r).some(Boolean));
}

export function ImportCsvDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setFileName("");
    setImporting(false);
    setResult(null);
    setError("");
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) { setError("Apenas arquivos .csv são aceitos"); return; }
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { setError("Arquivo vazio ou formato inválido"); return; }
      if (parsed.length > 500) { setError("Máximo 500 linhas por importação"); return; }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/collaborators/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao importar"); setImporting(false); return; }
      setResult(data);
      setStep("done");
      onSuccess();
    } catch {
      setError("Erro de conexão");
    }
    setImporting(false);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo-colaboradores.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const preview = rows.slice(0, 5);
  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Importar Colaboradores via CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-white/[0.12] rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste o CSV aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">Máximo 500 linhas · UTF-8</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Colunas: <span className="text-foreground">nome, telefone, email, cidade, bairro, cargo</span></p>
              <button onClick={downloadTemplate} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="w-3 h-3" /> Baixar modelo
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{fileName}</span> — {rows.length} linha{rows.length !== 1 ? "s" : ""} encontrada{rows.length !== 1 ? "s" : ""}
              </p>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Trocar arquivo</button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
                    {headers.map((h) => <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium capitalize">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      {headers.map((h) => <td key={h} className="px-3 py-2 text-foreground/80 truncate max-w-[120px]">{row[h] || <span className="text-muted-foreground/40">—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && <p className="text-xs text-muted-foreground text-center">+ {rows.length - 5} linha{rows.length - 5 !== 1 ? "s" : ""} não mostrada{rows.length - 5 !== 1 ? "s" : ""}</p>}
            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary text-primary-foreground gap-2">
                <Upload className="w-4 h-4" />
                {importing ? "Importando..." : `Importar ${rows.length} linha${rows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <div>
              <p className="text-lg font-bold text-foreground">Importação concluída</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-green-400 font-medium">{result.created} criados</span>
                {result.skipped > 0 && <span className="ml-2 text-muted-foreground">{result.skipped} ignorados (duplicatas)</span>}
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-left">
                <p className="text-xs text-red-400 font-medium mb-1">Erros em {result.errors.length} linha{result.errors.length !== 1 ? "s" : ""}:</p>
                <p className="text-xs text-muted-foreground">{result.errors.join(", ")}</p>
              </div>
            )}
            <Button onClick={() => handleClose(false)} className="bg-primary text-primary-foreground">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
