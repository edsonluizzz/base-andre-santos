"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WhatsappComposer } from "@/components/grupos/whatsapp-composer";

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

  if (session?.user && (session.user as { role?: string }).role !== "ADMIN") return null;

  function handleSent() {
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
            ? "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-primary/30 text-primary bg-primary/[0.08] hover:bg-primary/20 transition-colors"
            : "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
        }
      >
        <MessageCircle className="w-3.5 h-3.5" /> {compact ? "Enviar mensagem" : "Enviar WhatsApp"}
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
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <WhatsappComposer to={phone} onSent={handleSent} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
