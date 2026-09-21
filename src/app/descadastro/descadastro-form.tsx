"use client";

import { useState } from "react";

export function DescadastroForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  if (!email || !token) {
    return <p className="text-slate-400">Link inválido. Use o link do rodapé do email recebido.</p>;
  }

  async function confirmar() {
    setState("loading");
    try {
      const res = await fetch("/api/public/descadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e: email, t: token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-slate-300">Pronto. <strong>{email}</strong> não receberá mais emails da campanha.</p>;
  }
  return (
    <>
      <p className="text-slate-400 mb-6">
        Confirme para parar de receber emails da campanha em <strong className="text-slate-200">{email}</strong>.
      </p>
      <button
        onClick={confirmar}
        disabled={state === "loading"}
        className="w-full rounded-xl bg-[#ff6b04] py-3 font-bold text-[#0a1220] disabled:opacity-60"
      >
        {state === "loading" ? "Processando..." : "Confirmar cancelamento"}
      </button>
      {state === "error" && <p className="mt-4 text-red-400 text-sm">Não foi possível concluir. Tente novamente.</p>}
    </>
  );
}
