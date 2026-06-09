"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { Send, Image as ImageIcon, Video, Mic, Square, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MediaKind = "image" | "video" | "audio";
type Attachment = { file: File; kind: MediaKind; previewUrl: string };

function pickAudioMime(): { mime: string; ext: string } {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return { mime: "audio/webm;codecs=opus", ext: "webm" };
    if (MediaRecorder.isTypeSupported("audio/mp4")) return { mime: "audio/mp4", ext: "m4a" };
    if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return { mime: "audio/ogg;codecs=opus", ext: "ogg" };
  }
  return { mime: "", ext: "webm" };
}

/**
 * Composer de WhatsApp — envia texto/foto/vídeo/áudio para `to`
 * (groupId Z-API ou telefone) pelo número da campanha.
 */
export function WhatsappComposer({ to }: { to: string }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);

  // Gravação de áudio
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    // Cleanup: solta o objectURL e o microfone ao desmontar
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, [attachment]);

  function setFileAttachment(file: File | undefined, kind: MediaKind) {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo acima de 16MB (limite do WhatsApp)");
      return;
    }
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment({ file, kind, previewUrl: URL.createObjectURL(file) });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mime, ext } = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: blob.type });
        setFileAttachment(file, "audio");
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone — verifique a permissão do navegador");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function discardAttachment() {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  async function handleSend() {
    const message = text.trim();
    if (!attachment && !message) return;
    setSending(true);
    try {
      let payload: Record<string, string>;
      if (attachment) {
        const blob = await upload(`whatsapp/${attachment.file.name}`, attachment.file, {
          access: "public",
          handleUploadUrl: "/api/zapi/upload",
        });
        payload = {
          to,
          type: attachment.kind,
          mediaUrl: blob.url,
          ...(message && attachment.kind !== "audio" ? { caption: message } : {}),
        };
      } else {
        payload = { to, type: "text", message };
      }

      const res = await fetch("/api/zapi/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao enviar mensagem");
        return;
      }
      toast.success("Enviado pelo WhatsApp da campanha");
      setText("");
      discardAttachment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enviar mensagem</p>

      {/* Preview do anexo */}
      {attachment && (
        <div className="rounded-xl border border-white/[0.08] p-3 space-y-2">
          {attachment.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.previewUrl} alt="Prévia da imagem" className="max-h-40 rounded-lg mx-auto" />
          )}
          {attachment.kind === "video" && (
            <video src={attachment.previewUrl} controls className="max-h-40 rounded-lg mx-auto" />
          )}
          {attachment.kind === "audio" && (
            <audio src={attachment.previewUrl} controls className="w-full" />
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Paperclip className="w-3 h-3 shrink-0" /> {attachment.file.name}
              <span className="shrink-0">({(attachment.file.size / 1024 / 1024).toFixed(1)}MB)</span>
            </p>
            <button onClick={discardAttachment} aria-label="Descartar anexo"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Gravando */}
      {recording && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 flex items-center justify-between">
          <p className="text-xs text-red-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Gravando áudio... {fmtTime(recordSeconds)}
          </p>
          <Button size="sm" variant="outline" onClick={stopRecording} className="gap-1.5 border-red-500/30 text-red-400">
            <Square className="w-3 h-3" /> Parar
          </Button>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={attachment && attachment.kind !== "audio" ? "Legenda (opcional)..." : "Escreva a mensagem..."}
        className="text-sm"
        disabled={sending}
      />

      <div className="flex items-center gap-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { setFileAttachment(e.target.files?.[0], "image"); e.target.value = ""; }} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { setFileAttachment(e.target.files?.[0], "video"); e.target.value = ""; }} />

        <button onClick={() => imageInputRef.current?.click()} disabled={sending || recording} aria-label="Anexar foto"
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50">
          <ImageIcon className="w-4 h-4" />
        </button>
        <button onClick={() => videoInputRef.current?.click()} disabled={sending || recording} aria-label="Anexar vídeo"
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50">
          <Video className="w-4 h-4" />
        </button>
        <button onClick={recording ? stopRecording : startRecording} disabled={sending} aria-label={recording ? "Parar gravação" : "Gravar áudio"}
          className={`p-2 rounded-lg border transition-colors disabled:opacity-50 ${
            recording
              ? "bg-red-500/15 border-red-500/30 text-red-400"
              : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30"
          }`}>
          <Mic className="w-4 h-4" />
        </button>

        <Button onClick={handleSend} disabled={sending || recording || (!text.trim() && !attachment)}
          className="ml-auto gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Send className="w-3.5 h-3.5" /> {sending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
