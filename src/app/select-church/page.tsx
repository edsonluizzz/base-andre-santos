"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Cross, ChevronRight, Loader2 } from "lucide-react";

interface ChurchOption {
  establishmentId: string;
  role: string;
  name: string;
  logoBase64?: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Líder",
  MEMBER: "Membro",
};

export default function SelectChurchPage() {
  const { data: session, update } = useSession({ required: true });

  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/establishments")
      .then((r) => r.json())
      .then(setChurches)
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(establishmentId: string) {
    setSelecting(establishmentId);
    await update({ selectedEstablishmentId: establishmentId });
    window.location.href = "/dashboard";
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

      <div className="relative w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 mb-5">
            <Cross className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] tracking-[4px] uppercase text-indigo-400/70 mb-2">
            Ovile · Gestão
          </p>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Selecione a Congregação
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {session?.user?.name ?? "Olá"}, você tem acesso a mais de uma congregação.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.07] p-2"
          style={{
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow:
              "0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando congregações…</span>
            </div>
          ) : churches.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhuma congregação encontrada para sua conta.
            </div>
          ) : (
            <ul className="space-y-1">
              {churches.map((c) => (
                <li key={c.establishmentId}>
                  <button
                    onClick={() => handleSelect(c.establishmentId)}
                    disabled={!!selecting}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-150 hover:bg-indigo-500/10 hover:border-indigo-500/20 border border-transparent disabled:opacity-50"
                  >
                    {/* Avatar / Logo */}
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {c.logoBase64 ? (
                        <img
                          src={c.logoBase64}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Cross className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ROLE_LABEL[c.role] ?? c.role}
                      </p>
                    </div>

                    {selecting === c.establishmentId ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          Ovile Gestão · Acesso multi-congregação
        </p>
      </div>
    </div>
  );
}
