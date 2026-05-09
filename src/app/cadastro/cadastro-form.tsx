"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, ChevronRight, Users, MapPin, Smartphone, Copy, Check, Share2 } from "lucide-react";
import { CONTRIBUTION_OPTIONS } from "@/lib/contribution";

// Substitua pelo ID real do vídeo do YouTube do André
const YT_VIDEO_ID = "COLE_O_ID_AQUI";

type Step = "form" | "success";

export function CadastroForm() {
  const searchParams = useSearchParams();
  const refUserId = searchParams.get("ref") ?? "";
  const refc = searchParams.get("refc") ?? "";

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ apoiadores: 0, municipios: 0, grupos: 0 });
  const [collaboratorId, setCollaboratorId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [email, setEmail] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [lgpdConsent, setLgpdConsent] = useState(false);

  function formatCep(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function lookupCep(rawCep: string) {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`/api/cep/${digits}`);
      if (!res.ok) { setCepError("CEP não encontrado"); return; }
      const d = await res.json();
      if (d.city) setCity(d.city);
      if (d.neighborhood && !neighborhood) setNeighborhood(d.neighborhood);
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setCepLoading(false);
    }
  }

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return val;
  }

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Informe seu nome completo"); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Informe um WhatsApp válido"); return; }
    if (!lgpdConsent) { setError("É necessário concordar com os termos de uso dos dados para se cadastrar"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/public/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, city, neighborhood, email, contributionTypes: selectedTypes, refUserId, refc, lgpdConsent }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 200) {
        setError(data.error ?? "Erro ao cadastrar. Tente novamente.");
        return;
      }
      if (data.collaboratorId) setCollaboratorId(data.collaboratorId);
      setStep("success");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep("form");
    setName(""); setPhone(""); setCep(""); setCity(""); setNeighborhood(""); setEmail(""); setSelectedTypes([]); setLgpdConsent(false); setCepError(""); setCollaboratorId(""); setCopied(false);
  }

  const shareUrl = collaboratorId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro?refc=${collaboratorId}`
    : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  const waShareUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Apoiei André Santos para Deputado Estadual! Faça seu cadastro também: ${shareUrl}`)}`
    : "";

  if (step === "success") {
    return (
      <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
        <div className="max-w-sm mx-auto pt-8 space-y-6">

          {/* Header de sucesso */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#d4af37" }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cadastro realizado!</h1>
              <p className="text-slate-400 mt-2 leading-relaxed text-sm">
                Obrigado por apoiar André Santos.<br />
                Nossa equipe entrará em contato pelo WhatsApp em breve.
              </p>
            </div>
          </div>

          {/* Vídeo do André */}
          {YT_VIDEO_ID && YT_VIDEO_ID !== "COLE_O_ID_AQUI" && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.2)" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${YT_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video"
                title="André Santos — Mensagem"
              />
            </div>
          )}

          {/* Link compartilhável */}
          {shareUrl && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 shrink-0" style={{ color: "#d4af37" }} />
                <p className="text-sm font-medium" style={{ color: "#d4af37" }}>Indique para sua família!</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compartilhe seu link personalizado. Cada cadastro feito por ele fica vinculado a você.
              </p>
              <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(13,27,42,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-xs text-slate-400 truncate flex-1 font-mono">{shareUrl}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all active:scale-95"
                  style={{ background: copied ? "rgba(34,197,94,0.15)" : "rgba(212,175,55,0.12)", border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(212,175,55,0.3)"}`, color: copied ? "#22c55e" : "#d4af37" }}
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                </button>
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all active:scale-95"
                  style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)", color: "#25d366" }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.553 4.112 1.52 5.843L0 24l6.335-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.214-3.727.872.936-3.625-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          )}

          <button onClick={resetForm} className="w-full text-sm underline underline-offset-2 py-2" style={{ color: "rgba(212,175,55,0.6)" }}>
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
            <p className="text-xs tracking-[3px] uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>Base de Apoio 2026</p>
            <h1 className="text-2xl font-bold text-white mt-1">André Santos</h1>
            <p className="text-slate-400 text-sm mt-1">Pré-candidato a Deputado Estadual · PR</p>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <p className="text-sm font-medium" style={{ color: "#d4af37" }}>Faça parte da nossa base!</p>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre-se e ajude a transformar o Paraná</p>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,      label: "Apoiadores", value: stats.apoiadores > 0 ? `+${stats.apoiadores}` : "+" },
            { icon: MapPin,     label: "Municípios", value: stats.municipios  > 0 ? `+${stats.municipios}`  : "+" },
            { icon: Smartphone, label: "Grupos WA",  value: stats.grupos      > 0 ? `+${stats.grupos}`      : "+" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-bold" style={{ color: "#d4af37" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nome completo <span style={{ color: "#d4af37" }}>*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" autoComplete="name"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">WhatsApp <span style={{ color: "#d4af37" }}>*</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(41) 99999-9999" autoComplete="tel" inputMode="numeric"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">CEP <span className="text-slate-500">(preenche cidade e bairro)</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    const v = formatCep(e.target.value);
                    setCep(v);
                    if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all pr-10"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = cepError ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.07)"}
                />
                {cepLoading && (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
              {cepError && <p className="text-[11px]" style={{ color: "#ef4444" }}>{cepError}</p>}
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

            {/* Formas de contribuição — multi-select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Como quer contribuir? <span className="text-slate-500">(escolha quantas quiser)</span></label>
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">E-mail <span className="text-slate-500">(opcional)</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(212,175,55,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>
          </div>

          {/* LGPD */}
          <label
            className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 transition-all"
            style={{
              background: lgpdConsent ? "rgba(212,175,55,0.06)" : "rgba(13,27,42,0.50)",
              border: lgpdConsent ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="mt-0.5 shrink-0 relative">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => setLgpdConsent(e.target.checked)}
                className="sr-only"
              />
              <div
                className="w-5 h-5 rounded flex items-center justify-center transition-all"
                style={{
                  background: lgpdConsent ? "#d4af37" : "transparent",
                  border: lgpdConsent ? "1px solid #d4af37" : "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {lgpdConsent && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#0a1220" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: lgpdConsent ? "rgba(212,175,55,0.9)" : "#94a3b8" }}>
              Autorizo o uso dos meus dados pessoais (nome, WhatsApp, cidade) pela Base de Apoio André Santos 2026
              para fins de comunicação política, conforme a{" "}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer"
                style={{ color: lgpdConsent ? "#d4af37" : "#64748b", textDecoration: "underline" }}>
                Política de Privacidade (LGPD)
              </a>.
              Poderei solicitar a exclusão dos meus dados a qualquer momento pelo WhatsApp ou e-mail da equipe.{" "}
              <span style={{ color: "#d4af37" }}>*</span>
            </p>
          </label>

          {error && (
            <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: loading ? "rgba(212,175,55,0.5)" : "#d4af37", color: "#0a1220", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <span>Enviando...</span> : <><span>Quero fazer parte!</span><ChevronRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-xs text-slate-500">
            Seus dados são usados exclusivamente pela equipe de apoio.
          </p>
        </form>
      </div>
    </div>
  );
}
