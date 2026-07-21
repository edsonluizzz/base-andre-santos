"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, X, AlertCircle } from "lucide-react";

type Collab = { id: string; name: string };
type Props = {
  open: boolean;
  churchId: string;
  churchName: string;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

function CollaboratorSearch({
  label, selected, exclude, onSelect,
}: {
  label: string;
  selected: Collab | null;
  exclude: string | undefined;
  onSelect: (c: Collab | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Collab[]>([]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/collaborators?q=${encodeURIComponent(query)}&status=ALL`);
      if (r.ok) {
        const j = await r.json();
        const data: Collab[] = (j.data ?? j).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        setResults(data.filter((c) => c.id !== exclude).slice(0, 8));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, exclude]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-primary/10 border border-primary/25">
        <span className="text-sm text-foreground">{selected.name}</span>
        <button onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar colaborador pelo nome"
        className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
      />
      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(""); setResults([]); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary border-b border-border last:border-0"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssignDialog({ open, churchId, churchName, onOpenChange, onSuccess }: Props) {
  const [member1, setMember1] = useState<Collab | null>(null);
  const [member2, setMember2] = useState<Collab | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleClose(v: boolean) {
    if (!v) { setMember1(null); setMember2(null); setError(""); }
    onOpenChange(v);
  }

  async function handleSave() {
    if (!member1 || !member2) { setError("Selecione as 2 pessoas da dupla."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/churches/${churchId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member1Id: member1.id, member2Id: member2.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao atribuir"); setSaving(false); return; }
      onSuccess();
      handleClose(false);
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Atribuir dupla — {churchName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CollaboratorSearch label="Primeira pessoa" selected={member1} exclude={member2?.id} onSelect={setMember1} />
          <CollaboratorSearch label="Segunda pessoa" selected={member2} exclude={member1?.id} onSelect={setMember2} />
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || (member1 !== null && member2 !== null && member1.id === member2.id)} className="bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Atribuir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
