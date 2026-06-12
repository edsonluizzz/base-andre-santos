"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { UserPlus, MapPin, Check, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { canonicalPRCity, findPRCities, isPRCep } from "@/lib/pr-cities";
import { cn } from "@/lib/utils";

function formatPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function formatCep(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export default function RuaPage() {
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [city, setCity] = useState("");           // grafia canônica quando válida
  const [cityQuery, setCityQuery] = useState("");  // o que está digitado no campo
  const [showSug, setShowSug] = useState(false);
  const [neighborhood, setNeighborhood] = useState("");
  const [lgpd, setLgpd] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [lastSaved, setLastSaved] = useState("");

  const suggestions = useMemo(
    () => (showSug ? findPRCities(cityQuery, 6) : []),
    [showSug, cityQuery],
  );
  const cityValid = canonicalPRCity(cityQuery) !== null;

  function selectCity(c: string) {
    setCity(c);
    setCityQuery(c);
    setShowSug(false);
  }

  const lookupCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    if (!isPRCep(digits)) {
      setError("Este CEP não é do Paraná.");
      return;
    }
    setCepLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cep/${digits}`);
      if (!res.ok) { setError("CEP não encontrado."); return; }
      const d = await res.json();
      if (d.state && d.state !== "PR") { setError("Este CEP não é do Paraná."); return; }
      const canon = canonicalPRCity(d.city);
      if (canon) selectCity(canon);
      else if (d.city) { setCityQuery(d.city); setCity(""); }
      if (d.neighborhood && !neighborhood) setNeighborhood(d.neighborhood);
    } catch {
      setError("Erro ao consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }, [neighborhood]);

  function resetForNext(keepCity: boolean) {
    setName("");
    setPhone("");
    setCep("");
    setNeighborhood("");
    setLgpd(false);          // consentimento é por pessoa — sempre recomeça
    setError("");
    if (!keepCity) { setCity(""); setCityQuery(""); }
    setShowSug(false);
    nameRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("Informe o nome da pessoa."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Informe um WhatsApp válido."); return; }
    const prCity = canonicalPRCity(cityQuery);
    if (!prCity) { setError("Escolha uma cidade do Paraná na lista."); return; }
    if (!lgpd) { setError("Confirme que a pessoa autorizou o contato."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/rua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          city: prCity,
          neighborhood: neighborhood.trim() || undefined,
          lgpdConsent: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao cadastrar. Tente novamente.");
        return;
      }
      setCount((c) => c + 1);
      setLastSaved(name.trim());
      toast.success(
        data.duplicate ? `${name.trim()} já estava cadastrado(a).` : `${name.trim()} cadastrado(a)!`,
      );
      resetForNext(true); // mantém a cidade — o cabo costuma ficar numa região
    } catch {
      setError("Sem conexão. (A fila offline chega no próximo passo.)");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-base bg-secondary border border-border outline-none transition-colors focus:border-primary/60 text-foreground placeholder:text-muted-foreground/60";

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" />
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Cadastro na Rua</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary tabular-nums">{count} hoje</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Cadastre a pessoa em segundos. Ela entra vinculada a você.
      </p>

      {lastSaved && count > 0 && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>Último: <strong>{lastSaved}</strong>. Pode cadastrar o próximo.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card rounded-2xl p-4 space-y-4 border border-white/[0.08]">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome <span className="text-primary">*</span></label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da pessoa"
              autoComplete="off"
              autoFocus
              className={inputCls}
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">WhatsApp <span className="text-primary">*</span></label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(41) 99999-9999"
              autoComplete="off"
              className={inputCls}
            />
          </div>

          {/* CEP (opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">CEP <span className="text-muted-foreground/60">(preenche a cidade)</span></label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => {
                  const v = formatCep(e.target.value);
                  setCep(v);
                  if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                }}
                placeholder="00000-000"
                maxLength={9}
                autoComplete="off"
                className={inputCls}
              />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Cidade (autocomplete PR) */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-muted-foreground">Cidade (PR) <span className="text-primary">*</span></label>
            <div className="relative">
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => { setCityQuery(e.target.value); setCity(""); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Comece a digitar o município"
                autoComplete="off"
                className={cn(inputCls, "pr-9", cityValid && "border-green-500/50")}
              />
              {cityValid
                ? <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                : <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />}
            </div>
            {showSug && suggestions.length > 0 && !cityValid && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCity(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {cityQuery.length >= 2 && !cityValid && !showSug && (
              <p className="text-[11px] text-amber-400">Selecione um município do PR na lista.</p>
            )}
          </div>

          {/* Bairro (opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bairro <span className="text-muted-foreground/60">(opcional)</span></label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Bairro"
              autoComplete="off"
              className={inputCls}
            />
          </div>
        </div>

        {/* Consentimento verbal */}
        <label className={cn(
          "flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 transition-colors border",
          lgpd ? "bg-primary/[0.06] border-primary/25" : "bg-secondary border-border",
        )}>
          <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="sr-only" />
          <span className={cn(
            "mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors border",
            lgpd ? "bg-primary border-primary" : "border-muted-foreground/30",
          )}>
            {lgpd && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            Declaro que a pessoa <strong className="text-foreground">autorizou verbalmente</strong> o contato
            pela base de apoio André Santos 2026 (LGPD). <span className="text-primary">*</span>
          </span>
        </label>

        {error && (
          <p className="text-sm text-center rounded-xl py-2.5 px-4 bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold bg-primary text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {saving ? "Salvando..." : "Salvar e próximo"}
        </button>

        {(city || cityQuery) && (
          <button
            type="button"
            onClick={() => { setCity(""); setCityQuery(""); setShowSug(false); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Trocar cidade (mantida entre cadastros)
          </button>
        )}
      </form>
    </div>
  );
}
