"use client";

import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { normalizeRegional } from "@/lib/churches";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void };
type Step = "upload" | "review" | "done";
type Row = { name: string; regional: string };

function parseFile(file: File): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const rows: Row[] = json
          .map((r) => {
            const keys = Object.keys(r);
            const nameKey = keys.find((k) => /congrega|nome/i.test(k)) ?? keys[0];
            const regionalKey = keys.find((k) => /regional/i.test(k)) ?? keys[1];
            return { name: String(r[nameKey] ?? "").trim(), regional: String(r[regionalKey] ?? "").trim() };
          })
          .filter((r) => r.name && r.regional);
        resolve(rows);
      } catch {
        reject(new Error("Falha ao ler o arquivo. Verifique se é um XLSX válido com colunas de congregação e regional."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function ImportChurchesDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [denominacao, setDenominacao] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setDenominacao("");
    setImporting(false);
    setError("");
    setResult(null);
  }
  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      setError("Apenas arquivos .xlsx, .xls ou .csv são aceitos");
      return;
    }
    setError("");
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) { setError("Nenhuma linha com congregação + regional encontrada."); return; }
      setRows(parsed);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    }
  }

  const regionalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = normalizeRegional(r.regional);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/churches/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, denominacao: denominacao.trim() || undefined }),
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Importar Congregações
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-white/[0.12] rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar a planilha</p>
              <p className="text-xs text-muted-foreground mt-1">Colunas: nome da congregação + regional</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>
            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{rows.length} congregações encontradas</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Denominação (opcional, vale para todas as linhas)</label>
              <input
                type="text"
                value={denominacao}
                onChange={(e) => setDenominacao(e.target.value)}
                placeholder="Ex: Assembleia de Deus"
                className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
              />
            </div>

            <div className="rounded-xl border border-white/[0.08] p-3 space-y-1 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-foreground/70 mb-2">Regionais detectados — confira antes de importar</p>
              {regionalCounts.map(([regional, count]) => (
                <div key={regional} className="flex items-center justify-between text-xs py-1">
                  <span className="text-foreground/80">{regional}</span>
                  <span className="text-muted-foreground">{count} congregaç{count !== 1 ? "ões" : "ão"}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Trocar arquivo</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary text-primary-foreground gap-2">
                <Upload className="w-4 h-4" />
                {importing ? "Importando..." : `Importar ${rows.length} congregações`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <p className="text-lg font-bold text-foreground">Importação concluída</p>
            <p className="text-sm text-muted-foreground">
              {result.created} criada{result.created !== 1 ? "s" : ""}
              {result.skipped > 0 && ` · ${result.skipped} já existiam (ignoradas)`}
            </p>
            <Button onClick={() => handleClose(false)} className="bg-primary text-primary-foreground">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
