"use client";

import { useState } from "react";
import Link from "next/link";
import { Cross, CheckCircle, Loader2, ChevronRight, Square, SquareCheckBig } from "lucide-react";

type Step = "form" | "success";

export default function CadastroPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [churchName, setChurchName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchName, adminName, adminEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro inesperado. Tente novamente.");
        return;
      }

      setStep("success");
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#06080F" }}
    >
      {/* BG gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)",
        }}
      />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-5">
            <Cross className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] tracking-[4px] uppercase text-indigo-400/70 mb-2">
            Ovile · Gestão
          </p>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Cadastrar Igreja
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Configure sua congregação em menos de 1 minuto
          </p>
        </div>

        {step === "success" ? (
          /* ── Tela de sucesso ── */
          <div
            className="rounded-2xl border border-white/[0.07] p-8 text-center"
            style={{
              background: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Congregação criada!
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Um e-mail de acesso foi enviado para{" "}
              <span className="text-white font-medium">{adminEmail}</span>.
              <br />
              Use-o para entrar no sistema pela primeira vez.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Ir para o login <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* ── Formulário ── */
          <div
            className="rounded-2xl border border-white/[0.07] p-8"
            style={{
              background: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <h2 className="text-lg font-semibold text-white mb-1">
              Dados da Congregação
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Preencha as informações abaixo para criar sua conta.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nome da Igreja / Congregação *
                </label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Ex: Igreja Central de Florianópolis"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Seu nome (Pastor / Líder responsável)
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Pastor João Silva"
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Seu e-mail Google (será usado para login) *
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="pastor@gmail.com"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                />
              </div>

              {/* Aceite dos termos */}
              <button
                type="button"
                onClick={() => setTermsAccepted((v) => !v)}
                className="flex items-start gap-2.5 text-left w-full group"
              >
                {termsAccepted ? (
                  <SquareCheckBig className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-slate-500" />
                )}
                <span className="text-xs text-slate-500 leading-relaxed">
                  Eu li e concordo com os{" "}
                  <Link href="/termos" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline" onClick={(e) => e.stopPropagation()}>
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline" onClick={(e) => e.stopPropagation()}>
                    Política de Privacidade
                  </Link>{" "}
                  do Ovile Gestão.
                </span>
              </button>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  <>
                    Criar Congregação
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-600 mt-5">
              Já tem conta?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Fazer login
              </Link>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-700 mt-6">
          Ovile Gestão · Sistema de gestão para igrejas
        </p>
      </div>
    </div>
  );
}
