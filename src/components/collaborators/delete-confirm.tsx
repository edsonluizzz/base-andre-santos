"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = { name: string; onConfirm: () => void; onCancel: () => void; };

export function DeleteConfirm({ name, onConfirm, onCancel }: Props) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong className="text-foreground">{name}</strong>? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Excluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
