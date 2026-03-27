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

export function MemberDialog({ open, onOpenChange, member, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    birthday: "",
    phone: "",
    notes: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name,
        birthday: member.birthday ?? "",
        phone: member.phone ?? "",
        notes: member.notes ?? "",
        status: member.status,
      });
    } else {
      setForm({ name: "", birthday: "", phone: "", notes: "", status: "ACTIVE" });
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
      toast.success(member ? "Participante atualizado" : "Participante adicionado");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] max-w-md">
        <DialogHeader>
          <DialogTitle
            className="text-[#e8c97a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {member ? "Editar Participante" : "Novo Participante"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs">Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nome completo"
              className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Aniversário</Label>
              <Input
                value={form.birthday}
                onChange={(e) => set("birthday", e.target.value)}
                placeholder="DD/MM"
                maxLength={5}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Telefone / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="47 9 9999-9999"
                className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
              />
            </div>
          </div>

          {member && (
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v: string | null) => v && set("status", v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a]">
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs">Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notas opcionais..."
              rows={2}
              className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
            >
              {loading ? "Salvando..." : member ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
