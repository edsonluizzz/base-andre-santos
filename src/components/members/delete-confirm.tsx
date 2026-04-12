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
      <DialogContent className="bg-secondary border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">Remover participante</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm mt-1">
          Tem certeza? Esta ação também removerá o histórico de chamadas e
          ofertas vinculados a este participante.
        </p>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
