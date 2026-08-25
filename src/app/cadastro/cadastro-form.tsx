"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle2, ChevronRight, Users, MapPin, Smartphone, Copy, Check, Share2, UserPlus } from "lucide-react";
import { tenantThemeVars } from "@/lib/color-utils";

type Step = "form" | "success";

interface PublicStats {
  apoiadores: number;
  municipios: number;
  grupos: number;
  campaignName?: string | null;
  candidateName?: string | null;
  office?: string | null;
  candidateNumber?: number | null;
  district?: string | null;
  primaryColor?: string | null;
  whatsappGroupLink?: string | null;
  youtubeVideoId?: string | null;
  partnerCandidateName?: string | null;
  partnerCandidateNumber?: number | null;
  partnerOffice?: string | null;
}

// Valores exibidos até a chamada a /api/public/stats resolver o tenant pelo
// domínio — mantém o layout idêntico ao já validado em produção (André Santos)
// enquanto a página é estática (force-static) e a personalização chega client-side.
const DEFAULT_CANDIDATE_NAME = "André Santos";
const DEFAULT_OFFICE = "Deputado Estadual";
const DEFAULT_NUMBER = 30777;

export function CadastroForm() {
  const searchParams = useSearchParams();
  const refUserId   = searchParams.get("ref") ?? "";
  const refc        = searchParams.get("refc") ?? "";
  const sourceParam = searchParams.get("source") ?? "";
  const eventId     = searchParams.get("event_id") ?? "";
  const channelParam = searchParams.get("ch") ?? "";

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<PublicStats>({ apoiadores: 0, municipios: 0, grupos: 0 });
  const [collaboratorId, setCollaboratorId] = useState("");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [redirectCancelled, setRedirectCancelled] = useState(false);

  const shareUrl = collaboratorId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro?refc=${collaboratorId}`
    : "";

  // Personalização por tenant (resolvida pelo domínio em /api/public/stats)
  const candidateName = stats.candidateName ?? DEFAULT_CANDIDATE_NAME;
  const office = stats.office ?? DEFAULT_OFFICE;
  const candidateNumber = stats.candidateNumber ?? DEFAULT_NUMBER;
  const youtubeVideoId = stats.youtubeVideoId ?? null;
  // Sem grupo configurado para o tenant → card "Grupo de Apoiadores" e
  // redirecionamento automático somem da tela de sucesso.
  const waGroupUrl = stats.whatsappGroupLink || "";
  const accent = stats.primaryColor ?? "#ff6b04";
  const theme = tenantThemeVars(accent);
  // Chapa conjunta (ex: André Santos + Jeffrey Chiquini) — quando a campanha
  // tem um "candidato parceiro" configurado, a página mostra os dois; os
  // leads continuam sendo salvos só no tenant deste domínio.
  const partnerName = stats.partnerCandidateName ?? null;
  const partnerNumber = stats.partnerCandidateNumber ?? null;
  const partnerOffice = stats.partnerOffice ?? null;
  const isChapa = Boolean(partnerName);
  const headerTitle = isChapa ? `${candidateName} & ${partnerName}` : candidateName;
  const supportersLabel = isChapa ? `${candidateName} e ${partnerName}` : candidateName;

  // Modo evento: cadastro presencial em sequência (tablet/totem) — não redireciona
  // automaticamente pro grupo, para permitir cadastrar a próxima pessoa.
  const isEventMode = sourceParam === "EVENTO";

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  // Auto-copia o link pessoal ao entrar na tela de sucesso
  useEffect(() => {
    if (step !== "success" || !shareUrl) return;
    navigator.clipboard.writeText(shareUrl)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); })
      .catch(() => {});
  }, [step, shareUrl]);

  // Contagem regressiva para o grupo WhatsApp (só quando há grupo configurado)
  useEffect(() => {
    if (step !== "success" || redirectCancelled || isEventMode || !waGroupUrl) return;
    if (countdown <= 0) { window.location.href = waGroupUrl; return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown, redirectCancelled, isEventMode, waGroupUrl]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ name, phone, city, neighborhood, email, refUserId, refc, lgpdConsent, source: sourceParam || undefined, eventId: eventId || undefined, channel: channelParam || undefined }),
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
    setName(""); setPhone(""); setCep(""); setCity(""); setNeighborhood(""); setEmail(""); setLgpdConsent(false); setCepError(""); setCollaboratorId(""); setCopied(false); setCountdown(30); setRedirectCancelled(false);
  }

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
    ? `https://wa.me/?text=${encodeURIComponent(`Apoiei ${supportersLabel}! Faça seu cadastro também: ${shareUrl}`)}`
    : "";

  if (step === "success") {
    return (
      <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)", ...theme } as React.CSSProperties}>
        <div className="max-w-sm mx-auto pt-8 space-y-6">

          {/* Header de sucesso */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--accent-rgb),0.3)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "var(--accent)" }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cadastro realizado!</h1>
              <p className="text-slate-400 mt-2 leading-relaxed text-sm">
                Obrigado por apoiar {supportersLabel}.<br />
                Nossa equipe entrará em contato pelo WhatsApp em breve.
              </p>
            </div>
          </div>

          {/* Cadastrar próximo — CTA destacado (essencial para cadastro em eventos) */}
          <button
            onClick={resetForm}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "#0a1220" }}
          >
            <UserPlus className="w-4 h-4" /> Cadastrar próxima pessoa
          </button>

          {/* Grupo WhatsApp — redirecionamento automático (só quando o tenant tem grupo configurado) */}
          {waGroupUrl && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.3)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#25d366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.553 4.112 1.52 5.843L0 24l6.335-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.214-3.727.872.936-3.625-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                </svg>
                <p className="text-sm font-semibold" style={{ color: "#25d366" }}>Grupo de Apoiadores</p>
              </div>
              {!redirectCancelled && !isEventMode && (
                <button onClick={() => setRedirectCancelled(true)} className="text-xs text-slate-500 underline underline-offset-2">Pular</button>
              )}
            </div>
            {!redirectCancelled && !isEventMode ? (
              <>
                <p className="text-xs text-slate-400">
                  Seu link foi copiado! Entrando no grupo em <span className="font-bold text-white">{countdown}s</span>...
                </p>
                <a
                  href={waGroupUrl}
                  onClick={() => setRedirectCancelled(true)}
                  className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 w-full"
                  style={{ background: "rgba(37,211,102,0.18)", border: "1px solid rgba(37,211,102,0.4)", color: "#25d366" }}
                >
                  Entrar agora no grupo
                </a>
              </>
            ) : (
              <a
                href={waGroupUrl}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 w-full"
                style={{ background: "rgba(37,211,102,0.18)", border: "1px solid rgba(37,211,102,0.4)", color: "#25d366" }}
              >
                Entrar no grupo de apoiadores
              </a>
            )}
          </div>
          )}

          {/* Vídeo do candidato */}
          {youtubeVideoId && (
            <div className="flex justify-center rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full max-w-xs aspect-[9/16]"
                title={`${candidateName} — Mensagem`}
              />
            </div>
          )}

          {/* Link compartilhável */}
          {shareUrl && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(var(--accent-rgb),0.06)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>Indique para sua família!</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seu link foi copiado automaticamente. Cole no WhatsApp e indique para sua família e amigos — cada cadastro feito por ele fica vinculado a você.
              </p>
              <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(13,27,42,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-xs text-slate-400 truncate flex-1 font-mono">{shareUrl}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all active:scale-95"
                  style={{ background: copied ? "rgba(34,197,94,0.15)" : "rgba(var(--accent-rgb),0.12)", border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(var(--accent-rgb),0.3)"}`, color: copied ? "#22c55e" : "var(--accent)" }}
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

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)", ...theme } as React.CSSProperties}>
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {isChapa && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/chapa-banner.png" alt={headerTitle} className="w-full rounded-2xl" />
        )}

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
              <Star className="w-7 h-7 fill-yellow-500/30" style={{ color: "var(--accent)" }} />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[3px] uppercase" style={{ color: "rgba(var(--accent-rgb),0.7)" }}>
              {isChapa ? `Nº ${candidateNumber} · ${partnerNumber}` : `Nº ${candidateNumber}`}
            </p>
            <h1 className="text-2xl font-bold text-white mt-1">{headerTitle}</h1>
            {isChapa ? (
              <p className="text-slate-400 text-sm mt-1">{office} — {partnerOffice}</p>
            ) : (
              <p className="text-slate-400 text-sm mt-1">Candidato a {office}</p>
            )}
          </div>
          {sourceParam === "EVENTO" ? (
            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>📍 Cadastro presencial</p>
              <p className="text-xs text-slate-400 mt-0.5">Você está em um evento de campanha</p>
            </div>
          ) : (
            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(var(--accent-rgb),0.08)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>Faça parte da nossa base!</p>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre-se e ajude a transformar o Paraná</p>
            </div>
          )}
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
              <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nome completo <span style={{ color: "var(--accent)" }}>*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" autoComplete="name"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">WhatsApp <span style={{ color: "var(--accent)" }}>*</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(41) 99999-9999" autoComplete="tel" inputMode="numeric"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
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
                  onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
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
                  onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Bairro</label>
                <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Seu bairro"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">E-mail <span className="text-slate-500">(opcional)</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                style={{ background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" }}
                onFocus={(e) => e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
              />
            </div>
          </div>

          {/* LGPD */}
          <label
            className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 transition-all"
            style={{
              background: lgpdConsent ? "rgba(var(--accent-rgb),0.06)" : "rgba(13,27,42,0.50)",
              border: lgpdConsent ? "1px solid rgba(var(--accent-rgb),0.25)" : "1px solid rgba(255,255,255,0.07)",
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
                  background: lgpdConsent ? "var(--accent)" : "transparent",
                  border: lgpdConsent ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {lgpdConsent && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#0a1220" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: lgpdConsent ? "rgba(var(--accent-rgb),0.9)" : "#94a3b8" }}>
              Autorizo o uso dos meus dados pessoais (nome, WhatsApp, cidade) pela campanha de {supportersLabel}
              para fins de comunicação política, conforme a{" "}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer"
                style={{ color: lgpdConsent ? "var(--accent)" : "#64748b", textDecoration: "underline" }}>
                Política de Privacidade (LGPD)
              </a>.
              Poderei solicitar a exclusão dos meus dados a qualquer momento pelo WhatsApp ou e-mail da equipe.{" "}
              <span style={{ color: "var(--accent)" }}>*</span>
            </p>
          </label>

          {error && (
            <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: loading ? "rgba(var(--accent-rgb),0.5)" : "var(--accent)", color: "#0a1220", opacity: loading ? 0.7 : 1 }}
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
