"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, ArrowLeft, RefreshCw, User, Power } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Conversation = {
  key: string;
  phone: string;
  name: string | null;
  collaboratorId: string | null;
  lastBody: string | null;
  lastType: string;
  lastFromMe: boolean;
  lastTimestamp: string;
  unread: number;
};

type Message = {
  id: string;
  fromMe: boolean;
  type: string;
  body: string | null;
  mediaUrl: string | null;
  senderName: string | null;
  timestamp: string;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}
function preview(c: Conversation) {
  if (c.lastType !== "text") {
    const label = c.lastType === "image" ? "📷 Foto" : c.lastType === "audio" ? "🎤 Áudio" : c.lastType === "video" ? "🎬 Vídeo" : c.lastType === "document" ? "📎 Arquivo" : "Mensagem";
    return (c.lastFromMe ? "Você: " : "") + label;
  }
  return (c.lastFromMe ? "Você: " : "") + (c.lastBody ?? "");
}

export function InboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  async function activateInbox() {
    setActivating(true);
    try {
      const res = await fetch("/api/zapi/inbox/activate", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) toast.success("Recebimento ativado! As mensagens vão começar a aparecer aqui.");
      else toast.error(d.error ?? "Erro ao ativar");
    } finally {
      setActivating(false);
    }
  }

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/zapi/inbox");
      if (res.ok) { const d = await res.json(); setConversations(d.conversations ?? []); }
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchThread = useCallback(async (conv: Conversation) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/zapi/inbox/${encodeURIComponent(conv.key)}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages ?? []); }
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Polling 15s só com a aba visível. Atualiza conversas e o thread aberto.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchConversations();
      if (selected) fetchThread(selected);
    };
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [fetchConversations, fetchThread, selected]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openConversation(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    fetchThread(conv);
    // zera o badge local na hora
    setConversations((prev) => prev.map((c) => c.key === conv.key ? { ...c, unread: 0 } : c));
  }

  async function sendReply() {
    if (!selected) return;
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(`/api/zapi/inbox/${encodeURIComponent(selected.key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setReply("");
        if (d.message) setMessages((prev) => [...prev, d.message]);
        fetchConversations();
      } else {
        toast.error(d.error ?? "Erro ao enviar");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr] h-[calc(100dvh-16rem)] min-h-[420px]">

      {/* Lista de conversas */}
      <div className={cn("border-r border-white/[0.06] flex flex-col min-h-0", selected && "hidden lg:flex")}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <p className="text-sm font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" /> Conversas</p>
          <button onClick={() => fetchConversations()} className="p-1.5 rounded hover:bg-white/[0.06] transition-colors" title="Atualizar">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="text-center text-xs text-muted-foreground py-8">Carregando...</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1 mb-4">As mensagens recebidas aparecem aqui depois que o recebimento for ativado.</p>
              <button
                onClick={activateInbox}
                disabled={activating}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors disabled:opacity-60"
              >
                <Power className={cn("w-3.5 h-3.5", activating && "animate-pulse")} />
                {activating ? "Ativando..." : "Ativar recebimento"}
              </button>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.key}
                onClick={() => openConversation(c)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors flex items-start gap-3",
                  selected?.key === c.key && "bg-white/[0.04]",
                )}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{c.name ?? c.phone}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fmtDay(c.lastTimestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{preview(c)}</p>
                    {c.unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={cn("flex-col min-h-0", selected ? "flex" : "hidden lg:flex")}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
              <button onClick={() => setSelected(null)} className="lg:hidden p-1 rounded hover:bg-white/[0.06]" title="Voltar">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{selected.name ?? selected.phone}</p>
                <p className="text-[11px] text-muted-foreground">{selected.phone}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMsgs && messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Carregando...</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                      m.fromMe ? "bg-primary/15 border border-primary/20 text-foreground rounded-br-sm" : "bg-white/[0.05] border border-white/[0.08] text-foreground rounded-bl-sm",
                    )}>
                      {m.type !== "text" && m.mediaUrl ? (
                        <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                          {m.type === "image" ? "📷 Foto" : m.type === "audio" ? "🎤 Áudio" : m.type === "video" ? "🎬 Vídeo" : "📎 Arquivo"}
                        </a>
                      ) : null}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      <p className="text-[9px] text-muted-foreground/60 text-right mt-1">{fmtTime(m.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="flex items-center gap-2 p-3 border-t border-white/[0.06] shrink-0">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Responder..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-secondary border border-border outline-none focus:border-primary/50 text-foreground"
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
