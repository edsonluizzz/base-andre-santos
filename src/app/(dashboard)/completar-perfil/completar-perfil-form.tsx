"use client";

import { useState } from "react";
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
  const [profile, setProfile] = useState("APOIADOR");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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
    <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
      <div className="max-w-md mx-auto pt-8 space-y-6">

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <Star className="w-7 h-7 fill-yellow-500/30" style={{ color: "#d4af37" }} />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[3px] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>Base de Apoio 2026</p>
            <h1 className="text-2xl font-bold text-white mt-1">Complete seu perfil</h1>
            <p className="text-slate-400 text-sm mt-1">Só mais algumas informações para finalizar</p>
          </div>
          {defaultEmail && (
            <div className="rounded-xl px-3 py-2 text-xs text-slate-400 inline-flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              Conta Google: {defaultEmail}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nome completo <span style={{ color: "#d4af37" }}>*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">WhatsApp <span style={{ color: "#d4af37" }}>*</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Cidade</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Curitiba"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Bairro</label>
                <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Seu bairro"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Perfil</label>
              <select value={profile} onChange={(e) => setProfile(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {PROFILE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Como quer contribuir? <span className="text-slate-500">(opcional)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {CONTRIBUTION_OPTIONS.map((opt) => {
                  const active = selectedTypes.includes(opt.value);
                  return (
                    <button key={opt.value} type="button" onClick={() => toggleType(opt.value)}
                      className="rounded-xl px-3 py-2 text-xs text-left transition-all"
                      style={{
                        background: active ? "rgba(212,175,55,0.15)" : "rgba(26,47,78,0.6)",
                        border: active ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(255,255,255,0.07)",
                        color: active ? "#d4af37" : "#94a3b8",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: loading ? "rgba(212,175,55,0.5)" : "#d4af37", color: "#0a1220", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <span>Salvando...</span> : <><span>Entrar no sistema</span><ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
