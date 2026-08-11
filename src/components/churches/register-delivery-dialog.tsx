"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertCircle } from "lucide-react";

type PayingEntity = { id: string; name: string; active: boolean };
type Props = {
  open: boolean;
  assignmentId: string;
  churchName: string;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Registro manual de entrega pelo admin — bypassa o fluxo de confirmação com
 * foto pelo colaborador, pra lançar retroativamente (data escolhida) e já
 * marcar como paga de uma vez, sem precisar ir na aba Financeiro depois.
 */
export function RegisterDeliveryDialog({ open, assignmentId, churchName, onOpenChange, onSuccess }: Props) {
  const [deliveredAt, setDeliveredAt] = useState(todayISO());
  const [payingEntityId, setPayingEntityId] = useState("");
  const [payingEntities, setPayingEntities] = useState<PayingEntity[]>([]);
  const [markPaid, setMarkPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDeliveredAt(todayISO());
    setPayingEntityId("");
    setMarkPaid(true);
    setError("");
    fetch("/api/paying-entities").then((r) => r.json()).then((j) => setPayingEntities(j.data ?? [])).catch(() => {});
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/church-assignments/${assignmentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveredAt, payingEntityId: payingEntityId || null, markPaid }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao registrar"); setSaving(false); return; }
      toast.success(markPaid ? "Entrega registrada e paga" : "Entrega registrada");
      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" /> Registrar entrega — {churchName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Marca a entrega como confirmada sem precisar da foto do colaborador — útil pra lançar
            entregas retroativas, uma por vez, com a data real de cada uma.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data da entrega</label>
            <input
              type="date"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              max={todayISO()}
              className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fonte pagadora</label>
            <select
              value={payingEntityId}
              onChange={(e) => setPayingEntityId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
            >
              <option value="">Padrão (candidato da campanha)</option>
              {payingEntities.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="w-4 h-4" />
            Marcar como pago agora (gera recibo e envia por e-mail/WhatsApp)
          </label>
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
