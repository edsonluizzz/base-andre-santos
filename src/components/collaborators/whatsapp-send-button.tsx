"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WhatsappComposer } from "@/components/grupos/whatsapp-composer";

/**
 * Envia WhatsApp (texto/foto/vídeo/áudio) para UM colaborador específico,
 * pelo número da campanha. Ao enviar, marca "contato hoje" no CRM
 * (lastContactedAt) — alimenta o alerta de 30d+ sem contato.
 */
export function WhatsappSendButton({
  collaboratorId,
  phone,
  name,
}: {
  collaboratorId: string;
  phone: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  function markContacted() {
    fetch(`/api/collaborators/${collaboratorId}/contact`, { method: "POST" })
      .catch(() => console.error("[whatsapp-send] falha ao marcar contato"));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" /> Enviar WhatsApp
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
            <WhatsappComposer to={phone} onSent={markContacted} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
