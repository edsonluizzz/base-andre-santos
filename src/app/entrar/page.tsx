"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cross, Loader2, ArrowRight, LogIn, LogOut } from "lucide-react";

export default function EntrarPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("c")?.toUpperCase() ?? "";

  const [code, setCode] = useState(initialCode);
  const [estName, setEstName] = useState<string | null>(null);
  const [estId, setEstId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Se chegou com código na URL, busca o estabelecimento imediatamente
  useEffect(() => {
    if (initialCode.length === 6) lookupCode(initialCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupCode(c: string) {
    setError("");
    setEstName(null);
    setEstId(null);
    if (c.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/join?c=${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Código inválido"); return; }
      setEstName(data.name);
      setEstId(data.id);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(v);
    setError("");
    setEstName(null);
    setEstId(null);
    if (v.length === 6) lookupCode(v);
  }

  async function handleJoin() {
    if (!estId || !session?.user?.id) return;
    setJoining(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao entrar"); setJoining(false); return; }
      // Atualiza o JWT com o novo estabelecimento
      await update({ joinedEstablishmentId: data.establishmentId });
      router.push("/dashboard");
    } catch {
      setError("Erro de conexão");
      setJoining(false);
    }
  }

  async function handleLoginAndJoin() {
    // Salva o código na URL para recuperar após o login
    await signIn("google", { callbackUrl: `/entrar?c=${code}` });
  }

  const isLoggedIn = status === "authenticated";
  const isLoadingSession = status === "loading";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#06080F" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)" }}
      />

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-5">
            <Cross className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] tracking-[4px] uppercase text-indigo-400/70 mb-2">Ovile · Gestão</p>
          <h1 className="text-2xl font-bold text-white">Entrar na Congregação</h1>
          <p className="text-slate-500 text-sm mt-2">
            Digite o código que seu pastor ou líder enviou
          </p>
        </div>

        {/* Banner de sessão ativa — permite trocar de conta */}
        {isLoggedIn && session?.user?.email && (
          <div className="mb-4 rounded-xl border border-white/[0.07] px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "rgba(15,23,42,0.5)" }}>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Logado como</p>
              <p className="text-sm text-slate-300 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        )}

        <div
          className="rounded-2xl border border-white/[0.07] p-6 space-y-5"
          style={{
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Input do código */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Código de acesso</label>
            <input
              ref={inputRef}
              value={code}
              onChange={handleCodeChange}
              placeholder="Ex: ABC123"
              maxLength={6}
              className="w-full text-center text-2xl font-bold tracking-[0.3em] uppercase bg-slate-900/80 border border-white/[0.10] rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
              autoFocus
            />
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </div>
            )}
            {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
          </div>

          {/* Estabelecimento encontrado */}
          {estName && !loading && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-center">
              <p className="text-xs text-indigo-400/70 mb-1">Congregação encontrada</p>
              <p className="text-white font-semibold">{estName}</p>
            </div>
          )}

          {/* Botão de ação */}
          {estName && !loading && (
            isLoadingSession ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : isLoggedIn ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {joining ? "Entrando..." : `Entrar em ${estName}`}
              </button>
            ) : (
              <button
                onClick={handleLoginAndJoin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Google
              </button>
            )
          )}

          {!estName && !loading && code.length < 6 && (
            <p className="text-center text-xs text-slate-600">
              O código tem 6 caracteres
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          Ovile Gestão · Acesso por código de congregação
        </p>
      </div>
    </div>
  );
}
