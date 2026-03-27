"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#c9a84c08] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1e1e1e] border border-[#c9a84c33] mb-5">
            <span className="text-3xl">✝️</span>
          </div>
          <p className="text-[11px] tracking-[4px] uppercase text-[#c9a84c] opacity-70 mb-2">
            UMADC · Gestão
          </p>
          <h1
            className="text-3xl font-bold text-[#e8c97a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Porto Belo
          </h1>
          <p className="text-[#888] text-sm mt-2">
            Sistema de gestão da mocidade
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-[#f0ece4] mb-1">
            Entrar no sistema
          </h2>
          <p className="text-[#888] text-sm mb-6">
            Faça login com sua conta Google para continuar
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#0d0d0d] hover:bg-[#c9a84c] hover:text-black border border-[#2a2a2a] hover:border-[#c9a84c] text-[#f0ece4] rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin text-base">⏳</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {loading ? "Entrando..." : "Entrar com Google"}
          </button>

          <p className="text-center text-xs text-[#888] mt-5">
            Apenas membros autorizados têm acesso ao sistema
          </p>
        </div>

        <p className="text-center text-xs text-[#555] mt-6">
          IEADC Porto Belo · UMADC
        </p>
      </div>
    </div>
  );
}
