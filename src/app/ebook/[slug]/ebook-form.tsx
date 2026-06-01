"use client";

import { useEffect, useRef, useState } from "react";
import type { EbookConfig } from "@/lib/ebooks";

type FormState = "idle" | "loading" | "success" | "error";

const COUNTDOWN_SECONDS = 10;

const FONT_HEADING = "var(--font-ebook-heading), 'Montserrat', 'Helvetica Neue', Arial, sans-serif";
const FONT_SERIF = "var(--font-ebook-serif), 'Cormorant Garamond', Georgia, 'Times New Roman', serif";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  backdropFilter: "blur(10px)",
};

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function EbookForm({ ebook }: { ebook: EbookConfig }) {
  const [refUserId, setRefUserId] = useState("");
  const [refc, setRefc] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setRefUserId(sp.get("ref") ?? "");
    setRefc(sp.get("refc") ?? "");
  }, []);

  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [name, setName] = useState("");
  const [cep, setCep] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setState("loading");
    try {
      const res = await fetch("/api/public/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: whatsapp,
          email,
          city: "",
          neighborhood: "",
          lgpdConsent: true,
          source: `EBOOK_${ebook.slug.toUpperCase().replace(/-/g, "_")}`,
          channel: "LINK",
          eventId: ebook.slug,
          refUserId,
          refc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 200 && res.status !== 201) {
        setErrorMessage(data.error ?? "Erro ao enviar. Tente novamente.");
        setState("error");
        return;
      }
      setFirstName(name.trim().split(" ")[0] ?? "");
      setCountdown(COUNTDOWN_SECONDS);
      setState("success");
    } catch {
      setErrorMessage("Erro de conexão. Tente novamente.");
      setState("error");
    }
  }

  useEffect(() => {
    if (state !== "success") return;
    const link = document.createElement("a");
    link.href = ebook.pdfPath;
    link.download = ebook.pdfDownloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.location.href = ebook.postRedirectUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, ebook.pdfPath, ebook.pdfDownloadName, ebook.postRedirectUrl]);

  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(26,47,78,0.95) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute top-1/4 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%)", filter: "blur(70px)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[450px] h-[450px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      <header className="relative z-10 py-6 px-6 flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <span
            className="font-black tracking-[0.25em] text-sm uppercase"
            style={{ color: "#d4af37", fontFamily: FONT_HEADING }}
          >
            André Santos
          </span>
          <div className="w-12 h-px" style={{ background: "rgba(212,175,55,0.4)" }} />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-5xl mx-auto">
          {state !== "success" && (
            <div className="w-full max-w-lg mx-auto animate-fade-up">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-xs font-bold tracking-widest uppercase"
                style={{
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "#d4af37",
                  fontFamily: FONT_HEADING,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                Ebook Gratuito
              </div>
              <h1
                className="font-black text-4xl sm:text-5xl leading-none mb-3 tracking-tight"
                style={{ color: "#d4af37", fontFamily: FONT_HEADING }}
              >
                {ebook.titleLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < ebook.titleLines.length - 1 && <br />}
                  </span>
                ))}
              </h1>
              <p
                className="italic text-lg sm:text-xl mb-5"
                style={{ color: "rgba(240,208,96,0.75)", fontFamily: FONT_SERIF }}
              >
                {ebook.subtitle}
              </p>
              <p className="text-sm leading-relaxed mb-7" style={{ color: "rgba(255,255,255,0.55)" }}>
                {ebook.description}
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  name="nome"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all placeholder:text-white/30 focus:ring-2 focus:ring-[#d4af37]/40"
                  style={inputStyle}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="cep"
                    required
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    placeholder="CEP"
                    inputMode="numeric"
                    maxLength={9}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all placeholder:text-white/30 focus:ring-2 focus:ring-[#d4af37]/40"
                    style={inputStyle}
                  />
                  <input
                    type="tel"
                    name="whatsapp"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    placeholder="WhatsApp"
                    autoComplete="tel"
                    inputMode="numeric"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all placeholder:text-white/30 focus:ring-2 focus:ring-[#d4af37]/40"
                    style={inputStyle}
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all placeholder:text-white/30 focus:ring-2 focus:ring-[#d4af37]/40"
                  style={inputStyle}
                />
                {state === "error" && errorMessage && (
                  <p className="text-sm text-red-400 text-center">{errorMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all mt-1 disabled:opacity-60"
                  style={{
                    background: state === "loading" ? "rgba(212,175,55,0.7)" : "#d4af37",
                    color: "#0d1b2a",
                    boxShadow: state === "loading" ? "none" : "0 8px 30px rgba(212,175,55,0.35)",
                    fontFamily: FONT_HEADING,
                  }}
                >
                  {state === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    "Quero meu ebook grátis →"
                  )}
                </button>
              </form>
              <p className="mt-4 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                🔒 Seus dados estão seguros. Sem spam, prometemos.
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center text-center max-w-md mx-auto py-12 animate-fade-up">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-glow-pulse"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "2px solid rgba(212,175,55,0.4)",
                  boxShadow: "0 0 40px rgba(212,175,55,0.15)",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M8 18l7 7 13-13"
                    stroke="#d4af37"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2
                className="font-black text-3xl sm:text-4xl mb-2"
                style={{ color: "#d4af37", fontFamily: FONT_HEADING }}
              >
                Seu ebook está pronto!
              </h2>
              <p className="mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                {firstName ? `Obrigado, ${firstName}! ` : ""}O download começou automaticamente. Caso não tenha iniciado,
                clique abaixo.
              </p>

              <a
                href={ebook.pdfPath}
                download={ebook.pdfDownloadName}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95 mb-4"
                style={{
                  background: "#d4af37",
                  color: "#0d1b2a",
                  boxShadow: "0 8px 30px rgba(212,175,55,0.4)",
                  fontFamily: FONT_HEADING,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {ebook.ctaDownloadLabel}
              </a>

              <div className="w-full h-px mb-6" style={{ background: "rgba(255,255,255,0.08)" }} />

              <p
                className="text-xs mb-3 font-bold tracking-widest uppercase"
                style={{ color: "rgba(212,175,55,0.6)", fontFamily: FONT_HEADING }}
              >
                Enquanto lê, faça parte do movimento
              </p>
              <a
                href={ebook.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-sm tracking-wide uppercase transition-all hover:scale-105 active:scale-95 mb-8"
                style={{
                  background: "rgba(37,211,102,0.12)",
                  border: "1.5px solid rgba(37,211,102,0.4)",
                  color: "#25d366",
                  boxShadow: "0 4px 20px rgba(37,211,102,0.1)",
                  fontFamily: FONT_HEADING,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.533 5.849L.057 23.486a.75.75 0 00.92.919l5.71-1.476A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.68-.524-5.2-1.435l-.373-.221-3.867 1-.002-.004 1.01-3.794-.228-.368A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Entrar no grupo Improváveis
              </a>

              <div className="w-full max-w-xs mx-auto">
                <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Redirecionando para o site em{" "}
                  <span style={{ color: "rgba(212,175,55,0.7)" }}>{countdown}s</span>
                </p>
                <div
                  className="w-full h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      background: "linear-gradient(90deg, #d4af37, #f0d060)",
                      width: `${progress}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    window.location.href = ebook.postRedirectUrl;
                  }}
                  className="mt-4 text-xs underline underline-offset-2 hover:opacity-80"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Ir agora para o site
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-5 text-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} André Santos · Pré-candidato a Deputado Estadual PR 2026
        </p>
      </footer>
    </div>
  );
}
