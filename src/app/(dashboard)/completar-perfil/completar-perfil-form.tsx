"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronRight } from "lucide-react";
import { CONTRIBUTION_OPTIONS } from "@/lib/contribution";

const PROFILE_OPTIONS = [
  { value: "PASTOR", label: "Pastor" },
  { value: "PRESIDENTE_ASSOCIACAO", label: "Presidente de Associação" },
  { value: "LIDER_POLITICO", label: "Líder Político" },
  { value: "VEREADOR", label: "Vereador" },
  { value: "EMPRESARIO", label: "Empresário" },
  { value: "LIDERANCA_COMUNITARIA", label: "Liderança Comunitária" },
  { value: "APOIADOR", label: "Apoiador" },
];

const INPUT_CLASS =
  "w-full rounded-xl px-4 py-3 text-sm bg-input border border-border text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50";

interface Props {
  userId: string;
  defaultName: string;
  defaultEmail: string;
}

export function CompletarPerfilForm({ defaultName, defaultEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [profile, setProfile] = useState("APOIADOR");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: string[]) => setCitySuggestions(data))
      .catch((e) => console.error("[completar-perfil] cities", e));
  }, []);

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Informe seu nome"); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Informe um WhatsApp válido"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/invite/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, city, neighborhood, profile, contributionTypes: selectedTypes }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao salvar. Tente novamente.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-4 pb-10 bg-background">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/25">
              <Star className="w-7 h-7 text-primary fill-primary/30" />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[3px] uppercase text-primary/70">Ovile Eleitoral</p>
            <h1 className="text-2xl font-bold gradient-title mt-1">Complete seu perfil</h1>
            <p className="text-muted-foreground text-sm mt-1">Só mais algumas informações para finalizar</p>
          </div>
          {defaultEmail && (
            <div className="rounded-xl px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-2 bg-foreground/[0.04] border border-border">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              Conta Google: {defaultEmail}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-card rounded-2xl p-5 space-y-4 border border-border">

            <div className="space-y-1.5">
              <label htmlFor="cp-name" className="text-xs font-medium text-muted-foreground">Nome completo <span className="text-primary">*</span></label>
              <input id="cp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cp-phone" className="text-xs font-medium text-muted-foreground">WhatsApp <span className="text-primary">*</span></label>
              <input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" autoComplete="tel"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="cp-city" className="text-xs font-medium text-muted-foreground">Cidade</label>
                <input id="cp-city" type="text" list="city-suggestions" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Curitiba"
                  className={INPUT_CLASS}
                />
                <datalist id="city-suggestions">
                  {citySuggestions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cp-neighborhood" className="text-xs font-medium text-muted-foreground">Bairro</label>
                <input id="cp-neighborhood" type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Seu bairro"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cp-profile" className="text-xs font-medium text-muted-foreground">Perfil</label>
              <select id="cp-profile" value={profile} onChange={(e) => setProfile(e.target.value)}
                className={`${INPUT_CLASS} appearance-none`}
              >
                {PROFILE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Como quer contribuir? <span className="text-muted-foreground/60">(opcional)</span></span>
              <div className="grid grid-cols-2 gap-2">
                {CONTRIBUTION_OPTIONS.map((opt) => {
                  const active = selectedTypes.includes(opt.value);
                  return (
                    <button key={opt.value} type="button" onClick={() => toggleType(opt.value)} aria-pressed={active}
                      className={`rounded-xl px-3 py-2 text-xs text-left border transition-colors ${
                        active
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-foreground/[0.03] border-border text-muted-foreground hover:bg-foreground/[0.06]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center rounded-xl py-2.5 px-4 bg-destructive/10 border border-destructive/20 text-destructive">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-primary text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <span>Salvando...</span> : <><span>Entrar no sistema</span><ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
