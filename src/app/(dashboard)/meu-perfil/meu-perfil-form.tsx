"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCpf, normalizeCpf } from "@/lib/cpf";

const INPUT_CLASS =
  "w-full rounded-xl px-4 py-3 text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50";

export function MeuPerfilForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/collaborators/me")
      .then((r) => r.json())
      .then((j) => {
        setName(j.data?.name ?? "");
        setCpf(j.data?.cpf ? formatCpf(j.data.cpf) : "");
      })
      .catch(() => setError("Erro ao carregar seu perfil"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = normalizeCpf(cpf);
    if (digits.length !== 11) {
      setError("Informe um CPF com 11 dígitos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/collaborators/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar");
        return;
      }
      setCpf(formatCpf(digits));
      toast.success("CPF salvo");
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-6">Carregando...</p>;
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
          <IdCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-xs text-muted-foreground">{name}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-card rounded-2xl p-5 space-y-4 border border-border">
        <div className="space-y-1.5">
          <label htmlFor="mp-cpf" className="text-xs font-medium text-muted-foreground">
            CPF <span className="text-primary">*</span>
          </label>
          <input
            id="mp-cpf"
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-muted-foreground/70">
            Necessário para emitir recibos de pagamento por entregas realizadas na campanha.
          </p>
        </div>

        {error && (
          <p className="text-sm text-center rounded-xl py-2.5 px-4 bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar CPF"}
        </Button>
      </form>
    </div>
  );
}
