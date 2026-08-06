"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function EntrarContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "valid" | "email" | "ready" | "invalid" | "used" | "error">("loading");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    fetch("/api/invite/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        if (r.status === 410) setStatus("used");
        else if (r.ok) setStatus("email");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) { setFormError("Informe um Gmail válido"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite/pre-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: trimmed }),
      });
      if (res.status === 410) { setStatus("used"); return; }
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error ?? "Erro ao processar convite");
        return;
      }
      setStatus("ready");
    } catch {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn("google", { callbackUrl: "/completar-perfil" });
    } catch {
      setSigningIn(false);
    }
  }

  return (
    <div className="rounded-2xl p-8 shadow-xl glass-card border border-white/[0.08]">
      {status === "loading" && (
        <div className="text-center text-white/50 py-4">Validando convite...</div>
      )}

      {status === "email" && (
        <>
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Você foi convidado!
          </h2>
          <p className="text-white/60 text-center text-sm mb-6">
            Informe o Gmail que vai usar para acessar o sistema.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@gmail.com"
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none bg-white/5 border border-white/10 focus:border-[#ff6b04]/50 transition"
            />
            {formError && (
              <p className="text-xs text-red-400 text-center">{formError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
              style={{ background: "#ff6b04", color: "#0a0a0a" }}
            >
              {submitting ? "Processando..." : "Continuar"}
            </button>
          </form>
        </>
      )}

      {status === "ready" && (
        <>
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Quase lá!
          </h2>
          <p className="text-white/60 text-center text-sm mb-2">
            Entre com o Gmail abaixo para ativar seu acesso:
          </p>
          <p className="text-[#ff6b04] text-center text-sm font-mono mb-6">{email}</p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition disabled:opacity-60"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {signingIn ? "Redirecionando..." : "Entrar com Google"}
          </button>
          <p className="text-white/30 text-xs text-center mt-3">
            Use exatamente esse Gmail para entrar
          </p>
        </>
      )}

      {status === "used" && (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-lg font-semibold text-white mb-2">Convite expirado</h2>
          <p className="text-white/50 text-sm">Este link de convite expirou. Solicite um novo link ao administrador.</p>
        </div>
      )}

      {(status === "invalid" || status === "error") && (
        <div className="text-center py-4">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-white mb-2">Link inválido</h2>
          <p className="text-white/50 text-sm">Este link de convite não existe ou expirou. Solicite um novo link ao administrador.</p>
        </div>
      )}
    </div>
  );
}

export default function EntrarPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#ff6b04]/20 flex items-center justify-center">
              <span className="text-3xl">🤝</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Ovile Eleitoral</h1>
          <p className="text-[#ff6b04] font-semibold">Gestão de base eleitoral</p>
        </div>

        <Suspense fallback={<div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center text-white/50">Carregando...</div>}>
          <EntrarContent />
        </Suspense>

        <p className="text-center text-white/20 text-xs mt-6">
          Ovile Eleitoral
        </p>
      </div>
    </div>
  );
}
