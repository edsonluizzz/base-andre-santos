"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EVENT_LABELS: Record<string, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  REUNIAO: "Reunião",
  RETIRO: "Retiro",
  CELULA: "Célula",
  CONGRESSO: "Congresso",
  OUTRO: "Outro",
};

export function NewEventDialog({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
}) {
  const [form, setForm] = useState({
    title: "",
    type: "CULTO",
    date: "",
    location: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = initialDate || new Date();
    // Ajustar para o fuso horário local e formatar para o input datetime-local
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    
    setForm(f => ({ ...f, date: localISOTime }));
  }, [open, initialDate]);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Evento criado!");
      setForm({ title: "", type: "CULTO", date: "", location: "", notes: "" });
      onSuccess();
    } else {
      toast.error("Erro ao criar evento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Novo Evento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Culto de Celebração" required
              className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Tipo *</Label>
              <Select value={form.type} onValueChange={(v: string | null) => v && set("type", v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="bg-background border-border text-foreground focus-visible:ring-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Local</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)}
              placeholder="Ex: Templo Principal"
              className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
