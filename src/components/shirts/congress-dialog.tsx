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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Congress {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: string;
}

interface CongressDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  congress?: Congress | null;
}

export function CongressDialog({ open, onClose, onSaved, congress }: CongressDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (congress) {
      setName(congress.name);
      setDate(congress.date.slice(0, 10));
      setLocation(congress.location ?? "");
      setDescription(congress.description ?? "");
    } else {
      setName("");
      setDate("");
      setLocation("");
      setDescription("");
    }
  }, [congress, open]);

  async function handleSave() {
    if (!name.trim() || !date) {
      toast.error("Preencha o nome e a data");
      return;
    }
    setSaving(true);
    try {
      const url = congress ? `/api/congresses/${congress.id}` : "/api/congresses";
      const method = congress ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, location: location || null, description: description || null }),
      });
      if (res.ok) {
        toast.success(congress ? "Congresso atualizado!" : "Congresso criado!");
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
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {congress ? "Editar Congresso" : "Novo Congresso"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-foreground">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Congresso UMADC 2025"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Data *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Local</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Florianópolis, SC"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : congress ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
