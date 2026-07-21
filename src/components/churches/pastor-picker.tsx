"use client";

import { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";

type Collab = { id: string; name: string };
type Props = {
  selected: Collab | null;
  onSelect: (c: Collab | null) => void;
};

export function PastorPicker({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Collab[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/collaborators?q=${encodeURIComponent(query)}&status=ALL`);
      if (r.ok) {
        const j = await r.json();
        const data: Collab[] = (j.data ?? j).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        setResults(data.slice(0, 8));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleCreate() {
    if (!query.trim()) { setError("Informe o nome do pastor."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim(), phone: phone.trim() || undefined, city: city.trim() || undefined, profile: "PASTOR" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao cadastrar pastor"); setSaving(false); return; }
      onSelect({ id: data.id, name: data.name });
      setCreating(false);
      setQuery("");
      setPhone("");
      setCity("");
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

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

  if (creating) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground/70">Cadastrar novo pastor</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome do pastor"
          className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
        />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone (opcional)"
          className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
        />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Cidade (opcional)"
          className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => { setCreating(false); setError(""); }}
            className="flex-1 py-1.5 rounded-lg text-xs text-muted-foreground border border-border"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Pastor</label>
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
      {query.length >= 2 && (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <UserPlus className="w-3.5 h-3.5" /> Cadastrar &quot;{query}&quot; como pastor novo
        </button>
      )}
    </div>
  );
}
