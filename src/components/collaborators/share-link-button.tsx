"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Check } from "lucide-react";
import { toast } from "sonner";

// Mensagem motivacional + link de indicação. Usada tanto no envio pela campanha
// (ADMIN, via Z-API) quanto no fallback wa.me (não-admin, WhatsApp pessoal).
function buildMessage(firstName: string, url: string) {
  return (
    `Olá, ${firstName}! 🎉\n\n` +
    `Agora que você já faz parte do nosso time, compartilhe com seus amigos e ajude a nossa rede de apoio a crescer ainda mais! 💪\n\n` +
    `É só enviar este link para eles se cadastrarem — cada pessoa que entrar pelo seu link fica vinculada a você:\n${url}`
  );
}

const BTN =
  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-green-500/30 text-green-400 bg-green-500/[0.06] hover:bg-green-500/15 transition-colors disabled:opacity-60";

/**
 * Envia o link de indicação do colaborador para o WhatsApp DELE.
 * ADMIN → pelo número da campanha (Z-API). Não-admin → wa.me (WhatsApp pessoal).
 */
export function ShareLinkButton({ collaboratorId, phone, name }: { collaboratorId: string; phone: string | null; name: string }) {
  const { data: session } = useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!phone) return null;

  const firstName = name.split(" ")[0] || "";
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  if (!isAdmin) {
    const d = phone.replace(/\D/g, "");
    const to = d.startsWith("55") ? d : `55${d}`;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro?refc=${collaboratorId}`;
    return (
      <a
        href={`https://wa.me/${to}?text=${encodeURIComponent(buildMessage(firstName, url))}`}
        target="_blank"
        rel="noopener noreferrer"
        className={BTN}
        title="Enviar o link de indicação para o WhatsApp deste apoiador"
      >
        <Send className="w-3 h-3" /> Enviar link
      </a>
    );
  }

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/share-link`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 2500);
        toast.success(`Link enviado para ${firstName} no WhatsApp`);
      } else {
        toast.error(d.error ?? "Erro ao enviar o link");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <button onClick={send} disabled={sending} className={BTN} title="Enviar o link de indicação pelo WhatsApp da campanha">
      {sent ? <><Check className="w-3 h-3" /> Enviado!</> : <><Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar link"}</>}
    </button>
  );
}
