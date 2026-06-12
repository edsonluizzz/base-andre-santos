"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";
import { toast } from "sonner";

// Mensagem motivacional + link de indicação (usada no fallback wa.me).
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
 * Sempre tenta pelo número da campanha (Z-API). Se o backend recusar por não ser
 * ADMIN (403), cai no wa.me (WhatsApp pessoal) — sem depender de checar a role no
 * client (evita a corrida de a sessão ainda não ter carregado).
 */
export function ShareLinkButton({ collaboratorId, phone, name }: { collaboratorId: string; phone: string | null; name: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!phone) return null;

  const firstName = name.split(" ")[0] || "";

  function openWaMe() {
    const d = phone!.replace(/\D/g, "");
    const to = d.startsWith("55") ? d : `55${d}`;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro?refc=${collaboratorId}`;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(buildMessage(firstName, url))}`, "_blank", "noopener,noreferrer");
  }

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/share-link`, { method: "POST" });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 2500);
        toast.success(`Link enviado para ${firstName} no WhatsApp`);
        return;
      }
      if (res.status === 403) {
        // Não é admin → não envia pelo número da campanha; abre o WhatsApp pessoal.
        openWaMe();
        return;
      }
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao enviar o link");
    } catch {
      toast.error("Sem conexão. Tente novamente.");
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
