"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, MapPin } from "lucide-react";
import * as XLSX from "xlsx";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void };
type Step = "upload" | "preview" | "done";
type Row = Record<string, string>;
type Result = { created: number; skipped: number; errors: string[] };

function parseFile(file: File): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames.find(n => !n.startsWith("_")) ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        // Normaliza chaves: remove *, trim, lowercase
        const normalized = json.map((row) => {
          const out: Row = {};
          for (const [k, v] of Object.entries(row)) {
            const key = k.replace(/\s*\*\s*$/, "").trim().toLowerCase()
              .normalize("NFD").replace(/[̀-ͯ]/g, "")
              .replace(/\s+/g, "_");
            out[key] = String(v ?? "").trim();
          }
          return out;
        }).filter((r) => Object.values(r).some(Boolean));
        resolve(normalized);
      } catch {
        reject(new Error("Falha ao ler o arquivo. Verifique se é um XLSX válido."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

const DISPLAY_HEADERS = ["nome", "telefone", "cidade", "bairro", "cep", "origem", "canal", "status"];

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

  async function handleFile(file: File) {
    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");
    if (!isXlsx && !isCsv) { setError("Apenas arquivos .xlsx ou .csv são aceitos"); return; }
    setError("");
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) { setError("Arquivo vazio ou sem dados válidos"); return; }
      if (parsed.length > 500) { setError("Máximo 500 linhas por importação"); return; }
      setRows(parsed);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    }
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
    const wb = XLSX.utils.book_new();

    // Aba de listas (hidden)
    const listas = {
      cargo:        ["COORD_GERAL", "COORD_REGIONAL", "LIDER_MUNICIPAL", "LIDER_BAIRRO", "VOLUNTARIO"],
      status:       ["LEAD", "ACTIVE", "INACTIVE"],
      perfil:       ["PASTOR", "LIDER_RELIGIOSO", "PRESIDENTE_ASSOCIACAO", "LIDER_POLITICO", "VEREADOR", "EMPRESARIO", "LIDERANCA_COMUNITARIA", "EDUCADOR", "JOVEM", "FAMILIA", "APOIADOR"],
      status_apoio: ["CONFIRMADO", "NEGOCIANDO", "NEUTRO", "ADVERSARIO"],
      canal:        ["INSTAGRAM", "WHATSAPP", "EVENTO", "LINK", "OUTRO"],
      lgpd:         ["SIM", "NAO"],
    };
    const listData: Record<string, string[]> = listas;
    const maxLen = Math.max(...Object.values(listData).map((a) => a.length));
    const listaRows: string[][] = [Object.keys(listData)];
    for (let i = 0; i < maxLen; i++) {
      listaRows.push(Object.values(listData).map((a) => a[i] ?? ""));
    }
    const wsLista = XLSX.utils.aoa_to_sheet(listaRows);
    XLSX.utils.book_append_sheet(wb, wsLista, "_listas");

    // Aba principal
    const headers = ["nome *", "email", "telefone", "cep", "cidade", "bairro", "origem *", "canal", "perfil", "cargo", "status", "status_apoio", "aniversario", "lgpd_consentimento", "observacoes"];
    const example = ["João Silva", "joao@email.com", "(41) 99999-9999", "80010-010", "", "", "Culto Assembleia Centro", "EVENTO", "APOIADOR", "VOLUNTARIO", "LEAD", "NEUTRO", "15/03/1985", "SIM", ""];
    const wsMain = XLSX.utils.aoa_to_sheet([headers, example]);
    wsMain["!cols"] = headers.map((h) => ({ wch: h.length < 10 ? 14 : h.length + 4 }));
    XLSX.utils.book_append_sheet(wb, wsMain, "Leads");

    XLSX.writeFile(wb, "leads-importacao.xlsx");
  }

  // Colunas para preview: só as que existem no arquivo
  const allHeaders = rows[0] ? Object.keys(rows[0]) : [];
  const previewHeaders = DISPLAY_HEADERS.filter((h) => allHeaders.includes(h)).concat(
    allHeaders.filter((h) => !DISPLAY_HEADERS.includes(h))
  ).slice(0, 8);
  const preview = rows.slice(0, 5);
  const hasCep = rows.some((r) => r.cep && r.cep.replace(/\D/g, "").length === 8);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Importar Colaboradores
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
              <p className="text-sm font-medium text-foreground">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">XLSX ou CSV · máximo 500 linhas</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>

            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-1">
              <p className="text-xs font-medium text-foreground/70">Colunas reconhecidas</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-400">nome *</span> · email · telefone ·{" "}
                <span className="text-blue-400">cep</span> (preenche cidade/bairro automaticamente) ·{" "}
                cidade · bairro · <span className="text-amber-400">origem *</span> · canal · perfil · cargo · status · status_apoio · aniversario · lgpd_consentimento · observacoes
              </p>
            </div>

            <div className="flex justify-end">
              <button onClick={downloadTemplate} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="w-3 h-3" /> Baixar planilha modelo (.xlsx)
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{fileName}</span> — {rows.length} linha{rows.length !== 1 ? "s" : ""}
              </p>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Trocar arquivo</button>
            </div>

            {hasCep && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.07] px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <p className="text-xs text-blue-300">CEP detectado — cidade e bairro serão preenchidos automaticamente via ViaCEP durante a importação.</p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
                    {previewHeaders.map((h) => <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium capitalize">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 text-foreground/80 truncate max-w-[120px]">
                          {row[h] || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
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
