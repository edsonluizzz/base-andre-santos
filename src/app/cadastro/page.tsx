"use client";

import { useState } from "react";
import { Star, CheckCircle2, ChevronRight, Users, MapPin, Smartphone } from "lucide-react";

const HOW_HELP_OPTIONS = [
  "Fazer campanha no meu bairro",
  "Ser líder de bairro",
  "Divulgar nas redes sociais",
  "Ajudar em eventos",
  "Apoio financeiro",
  "Outro",
];

type Step = "form" | "success";

export default function CadastroPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [email, setEmail] = useState("");
  const [howHelp, setHowHelp] = useState("");

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return val;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Informe seu nome completo"); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Informe um WhatsApp válido"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/public/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, city, neighborhood, email, howHelp }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 200) {
        setError(data.error ?? "Erro ao cadastrar. Tente novamente.");
        return;
      }
      setStep("success");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: "#d4af37" }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cadastro realizado!</h1>
            <p className="text-slate-400 mt-2 leading-relaxed">
              Obrigado por apoiar André Santos.<br />
              Nossa equipe entrará em contato pelo WhatsApp em breve.
            </p>
          </div>
          <div className="rounded-2xl p-4 text-sm text-slate-400 space-y-1" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="font-medium text-white">Enquanto isso, você pode:</p>
            <p>• Compartilhar este cadastro com amigos</p>
            <p>• Seguir André Santos nas redes sociais</p>
            <p>• Indicar outras pessoas da sua região</p>
          </div>
          <button
            onClick={() => { setStep("form"); setName(""); setPhone(""); setCity(""); setNeighborhood(""); setEmail(""); setHowHelp(""); }}
            className="text-sm underline underline-offset-2"
            style={{ color: "rgba(212,175,55,0.7)" }}
          >
            Cadastrar outra pessoa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <Star className="w-7 h-7 fill-yellow-500/30" style={{ color: "#d4af37" }} />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[3px] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>Campanha 2026</p>
            <h1 className="text-2xl font-bold text-white mt-1">André Santos</h1>
            <p className="text-slate-400 text-sm mt-1">Deputado Estadual — Paraná</p>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <p className="text-sm font-medium" style={{ color: "#d4af37" }}>Faça parte da nossa base!</p>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre-se e ajude a transformar o Paraná</p>
          </div>
        </div>

        {/* Counters decorativos */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Apoiadores", value: "+"  },
            { icon: MapPin, label: "Municípios", value: "+" },
            { icon: Smartphone, label: "Grupos WA", value: "+" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-bold" style={{ color: "#d4af37" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nome completo <span style={{ color: "#d4af37" }}>*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)", focusRingColor: "#d4af37" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">WhatsApp <span style={{ color: "#d4af37" }}>*</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(41) 99999-9999"
                autoComplete="tel"
                inputMode="numeric"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            {/* Cidade + Bairro em linha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Curitiba"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Seu bairro"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
            </div>

            {/* Como quer ajudar */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Como quer ajudar?</label>
              <div className="grid grid-cols-2 gap-2">
                {HOW_HELP_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHowHelp(howHelp === opt ? "" : opt)}
                    className="rounded-xl px-3 py-2 text-xs text-left transition-all"
                    style={{
                      background: howHelp === opt ? "rgba(212,175,55,0.15)" : "rgba(26,47,78,0.6)",
                      border: howHelp === opt ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(255,255,255,0.07)",
                      color: howHelp === opt ? "#d4af37" : "#94a3b8",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* E-mail (opcional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">E-mail <span className="text-slate-500">(opcional)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: loading ? "rgba(212,175,55,0.5)" : "#d4af37",
              color: "#0a1220",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Enviando...</span>
            ) : (
              <>
                <span>Quero fazer parte!</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            Seus dados são usados exclusivamente pela equipe de campanha.
          </p>
        </form>
      </div>
    </div>
  );
}
