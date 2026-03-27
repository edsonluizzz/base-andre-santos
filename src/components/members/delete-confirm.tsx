"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteConfirm({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#e8c97a]">Remover participante</DialogTitle>
        </DialogHeader>
        <p className="text-[#888] text-sm mt-1">
          Tem certeza? Esta ação também removerá o histórico de chamadas e
          ofertas vinculados a este participante.
        </p>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a]"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-[#e74c3c] hover:bg-[#c0392b] text-white"
          >
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
