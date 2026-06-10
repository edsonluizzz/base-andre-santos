"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, MessageSquareDashed } from "lucide-react";

type Kind = "text" | "image" | "video" | "audio" | "document" | "other";
type ChatMessage = {
  id: string;
  fromMe: boolean;
  timestamp: number;
  senderName?: string;
  kind: Kind;
  text?: string;
  mediaUrl?: string;
};

const POLL_MS = 15_000;

/**
 * Histórico de conversa com um contato (Fase 2 — inbox no painel).
 * Faz polling só quando a aba está visível (economia de invocações no Hobby).
 * `reloadKey` muda quando uma nova mensagem é enviada → recarrega na hora.
 */
export function WhatsappHistory({ to, reloadKey = 0 }: { to: string; reloadKey?: number }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/zapi/messages?to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar o histórico");
        return;
      }
      setError(null);
      setMessages(data.messages ?? []);
    } catch {
      setError("Falha de rede ao carregar o histórico");
    } finally {
      setLoading(false);
    }
  }, [to]);

  // Carrega ao abrir e quando uma mensagem é enviada
  useEffect(() => { load(); }, [load, reloadKey]);

  // Polling só com a aba visível
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => { if (document.visibilityState === "visible") { load(); start(); } else stop(); };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load]);

  // Auto-scroll pro fim quando chegam mensagens
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversa</p>
        <button onClick={load} disabled={loading} aria-label="Atualizar histórico"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
        {error && <p className="text-xs text-red-400 py-4 text-center">{error}</p>}

        {!error && messages === null && (
          <p className="text-xs text-muted-foreground py-6 text-center">Carregando conversa...</p>
        )}

        {!error && messages?.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <MessageSquareDashed className="w-6 h-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda</p>
          </div>
        )}

        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.fromMe
                ? "bg-green-600/20 border border-green-500/20 rounded-br-sm"
                : "bg-white/[0.05] border border-white/[0.08] rounded-bl-sm"
            }`}>
              {m.kind === "image" && m.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.mediaUrl} alt="Imagem recebida" className="max-h-44 rounded-lg mb-1" />
              )}
              {m.kind === "video" && m.mediaUrl && (
                <video src={m.mediaUrl} controls className="max-h-44 rounded-lg mb-1" />
              )}
              {m.kind === "audio" && m.mediaUrl && (
                <audio src={m.mediaUrl} controls className="w-full mb-1" />
              )}
              {m.kind === "document" && m.mediaUrl && (
                <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline break-all">{m.text || "Documento"}</a>
              )}
              {m.text && m.kind !== "document" && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
              {!m.text && m.kind === "other" && <p className="text-xs italic text-muted-foreground">[mensagem não suportada]</p>}
              <p className={`text-[10px] mt-1 ${m.fromMe ? "text-green-300/60" : "text-muted-foreground"}`}>
                {fmtTime(m.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
