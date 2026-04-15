"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  id: string;
  name: string;
  email: string | null;
  birthday: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: Member | null;
  onSuccess: () => void;
};

function formatBirthday(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  return value;
}

export function MemberDialog({ open, onOpenChange, member, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    birthday: "",
    phone: "",
    notes: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name,
        email: member.email ?? "",
        birthday: member.birthday ?? "",
        phone: member.phone ?? "",
        notes: member.notes ?? "",
        status: member.status,
      });
    } else {
      setForm({ name: "", email: "", birthday: "", phone: "", notes: "", status: "ACTIVE" });
    }
  }, [member, open]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);

    const url = member ? `/api/members/${member.id}` : "/api/members";
    const method = member ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (res.ok) {
      toast.success(member ? "Membro atualizado" : "Membro adicionado");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {member ? "Editar Membro" : "Novo Membro"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nome completo"
              className="bg-background border-border text-foreground focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-background border-border text-foreground focus-visible:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground/50">
              Ao fazer login com esse e-mail, o membro será vinculado automaticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Aniversário</Label>
              <Input
                value={form.birthday}
                onChange={(e) => set("birthday", formatBirthday(e.target.value))}
                placeholder="DD/MM"
                maxLength={5}
                inputMode="numeric"
                className="bg-background border-border text-foreground focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Telefone / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="(47) 9 9999-9999"
                maxLength={17}
                inputMode="numeric"
                className="bg-background border-border text-foreground focus-visible:ring-primary"
              />
            </div>
          </div>

          {member && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v: string | null) => v && set("status", v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border">
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notas opcionais..."
              rows={2}
              className="bg-background border-border text-foreground focus-visible:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : member ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
