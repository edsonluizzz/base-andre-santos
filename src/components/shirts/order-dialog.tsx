"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
}

interface ShirtOrder {
  id: string;
  memberId: string;
  size: string;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string | null;
  status: string;
  notes: string | null;
}

interface OrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  congressId: string;
  order?: ShirtOrder | null;
}

const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
const SHIRT_STATUS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
  { value: "PRODUCTION", label: "Em Produção" },
  { value: "READY", label: "Pronto" },
  { value: "DELIVERED", label: "Entregue" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function OrderDialog({ open, onClose, onSaved, congressId, order }: OrderDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState("");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => setMembers(data.filter((m: Member & { status: string }) => m.status === "ACTIVE")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (order) {
      setMemberId(order.memberId);
      setSize(order.size);
      setQuantity(String(order.quantity));
      setTotalAmount(String(Number(order.totalAmount).toFixed(2)));
      setPaidAmount(String(Number(order.paidAmount).toFixed(2)));
      setPaymentMethod(order.paymentMethod ?? "CASH");
      setStatus(order.status);
      setNotes(order.notes ?? "");
    } else {
      setMemberId("");
      setSize("M");
      setQuantity("1");
      setTotalAmount("");
      setPaidAmount("0");
      setPaymentMethod("CASH");
      setStatus("PENDING");
      setNotes("");
    }
  }, [order, open]);

  async function handleSave() {
    if (!memberId || !size || !totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Preencha membro, tamanho e valor");
      return;
    }
    setSaving(true);
    try {
      const url = order
        ? `/api/congresses/${congressId}/orders/${order.id}`
        : `/api/congresses/${congressId}/orders`;
      const method = order ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          size,
          quantity: parseInt(quantity),
          totalAmount: parseFloat(totalAmount),
          paidAmount: parseFloat(paidAmount),
          paymentMethod: parseFloat(paidAmount) > 0 ? paymentMethod : null,
          status,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        toast.success(order ? "Pedido atualizado!" : "Pedido registrado!");
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {order ? "Editar Pedido" : "Novo Pedido de Camiseta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!order && (
            <div className="space-y-1.5">
              <Label className="text-foreground">Membro *</Label>
              <Select value={memberId} onValueChange={(v) => v && setMemberId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar membro..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground">Tamanho *</Label>
              <Select value={size} onValueChange={(v) => v && setSize(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIRT_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground">Valor Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Valor Pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIRT_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : order ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
