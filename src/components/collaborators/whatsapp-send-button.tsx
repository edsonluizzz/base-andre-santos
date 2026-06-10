"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WhatsappComposer } from "@/components/grupos/whatsapp-composer";
import { WhatsappHistory } from "@/components/grupos/whatsapp-history";

/** Logo oficial do WhatsApp (telefone no balão). */
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.514 5.832L.057 23.986l6.305-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.979 1-3.642-.235-.374A9.818 9.818 0 1112 21.818z"/>
    </svg>
  );
}

/**
 * Envia WhatsApp (texto/foto/vídeo/áudio) para UM colaborador específico,
 * pelo número da campanha. Visível só para ADMIN (o backend também exige).
 * Ao enviar, registra o contato no CRM (lastContactedAt) — via `onSent`
 * do chamador quando fornecido (permite atualizar a UI da lista), senão
 * pelo POST /contact direto.
 */
export function WhatsappSendButton({
  collaboratorId,
  phone,
  name,
  compact = false,
  onSent,
}: {
  collaboratorId: string;
  phone: string;
  name: string;
  /** Estilo menor, alinhado aos botões do card da lista de colaboradores */
  compact?: boolean;
  onSent?: () => void;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Não-ADMIN não envia pelo número da campanha (backend exige) —
  // mantém o atalho wa.me pelo WhatsApp pessoal como fallback.
  if (session?.user && (session.user as { role?: string }).role !== "ADMIN") {
    const d = phone.replace(/\D/g, "");
    return (
      <a
        href={`https://wa.me/${d.startsWith("55") ? d : `55${d}`}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-green-600/40 text-green-400 bg-green-600/[0.08] hover:bg-green-600/20 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
    );
  }

  function handleSent() {
    setSentCount((n) => n + 1); // recarrega o histórico na hora
    if (onSent) {
      onSent();
      return;
    }
    fetch(`/api/collaborators/${collaboratorId}/contact`, { method: "POST" })
      .catch(() => console.error("[whatsapp-send] falha ao marcar contato"));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-green-500/40 text-green-400 bg-green-500/[0.12] hover:bg-green-500/25 transition-colors"
            : "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
        }
      >
        <WhatsappIcon className="w-3.5 h-3.5" /> Enviar mensagem
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-400" /> {name}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {phone} · enviado pelo número da campanha
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <WhatsappHistory to={phone} reloadKey={sentCount} />
            <WhatsappComposer to={phone} onSent={handleSent} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
