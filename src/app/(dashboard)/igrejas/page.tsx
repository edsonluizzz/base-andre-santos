"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Upload, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportChurchesDialog } from "@/components/churches/import-churches-dialog";
import { AssignDialog } from "@/components/churches/assign-dialog";

type Assignment = {
  status: "PENDENTE" | "ENTREGUE" | "NAO_FOI_POSSIVEL";
  member1: { name: string };
  member2: { name: string };
};
type Church = {
  id: string;
  name: string;
  regional: string | null;
  denominacao: string | null;
  latestAssignment: Assignment | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ENTREGUE: "Entregue",
  NAO_FOI_POSSIVEL: "Não foi possível",
};
const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  ENTREGUE: "bg-green-500/15 text-green-400 border-green-500/30",
  NAO_FOI_POSSIVEL: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function IgrejasPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [allChurches, setAllChurches] = useState<Church[]>([]);
  const [regionalFilter, setRegionalFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Church | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (regionalFilter) params.set("regional", regionalFilter);
    const res = await fetch(`/api/churches?${params}`);
    if (res.ok) {
      const j = await res.json();
      setChurches(j.data);
    }
    setLoading(false);
  }, [regionalFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fetchAllChurches = async () => {
      const res = await fetch("/api/churches");
      if (res.ok) {
        const j = await res.json();
        setAllChurches(j.data);
      }
    };
    fetchAllChurches();
  }, []);

  const regionais = Array.from(new Set(allChurches.map((c) => c.regional).filter(Boolean))) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Igrejas</h1>
        </div>
        <Button onClick={() => setImportOpen(true)} className="bg-primary text-primary-foreground gap-2">
          <Upload className="w-4 h-4" /> Importar planilha
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setRegionalFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs border ${!regionalFilter ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
        >
          Todas
        </button>
        {regionais.map((r) => (
          <button
            key={r}
            onClick={() => setRegionalFilter(r)}
            className={`px-3 py-1.5 rounded-full text-xs border ${regionalFilter === r ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Congregação</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Regional</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Dupla</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : churches.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma igreja importada ainda.</td></tr>
            ) : (
              churches.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-foreground">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.regional ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[c.latestAssignment?.status ?? "SEM_DUPLA"] ?? "border-border text-muted-foreground"}`}>
                      {c.latestAssignment ? STATUS_LABEL[c.latestAssignment.status] : "Sem dupla"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {c.latestAssignment ? `${c.latestAssignment.member1.name} + ${c.latestAssignment.member2.name}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAssignTarget(c)} className="gap-1.5">
                      {c.latestAssignment?.status === "NAO_FOI_POSSIVEL" ? <RefreshCw className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      {c.latestAssignment ? "Redistribuir" : "Atribuir dupla"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ImportChurchesDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={load} />
      {assignTarget && (
        <AssignDialog
          open={!!assignTarget}
          churchId={assignTarget.id}
          churchName={assignTarget.name}
          onOpenChange={(v) => !v && setAssignTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
