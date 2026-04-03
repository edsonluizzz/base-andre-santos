"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Cross } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#06080F" }}>
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
            Ovile Gestão
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Gestão inteligente para igrejas
          </p>
        </div>

        {/* Card */}
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
            Entrar no sistema
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Faça login com sua conta Google para continuar
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.08] text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5"
            style={{ background: "rgba(6,8,15,0.6)" }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? "Entrando..." : "Entrar com Google"}
          </button>

          <p className="text-center text-xs text-slate-600 mt-5">
            Apenas membros autorizados têm acesso
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          <Link href="/" className="hover:text-slate-500 transition-colors">
            Ovile Gestão
          </Link>
          {" · "}ovile.com.br
        </p>
      </div>
    </div>
  );
}
