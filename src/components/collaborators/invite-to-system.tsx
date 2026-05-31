"use client";

import { useState } from "react";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  collaboratorId: string;
  collaboratorName: string;
  defaultEmail?: string | null;
};

export function InviteToSystem({ collaboratorId, collaboratorName, defaultEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  async function handleInvite() {
    if (!email.trim()) { toast.error("Informe o Gmail"); return; }
    setLoading(true);
    const res = await fetch(`/api/collaborators/${collaboratorId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setLoading(false);
    const data = await res.json();
    if (res.ok) {
      setDone(true);
      setDoneMsg(data.message ?? "Convite enviado");
      setOpen(false);
      toast.success(data.message);
    } else {
      toast.error(data.error ?? "Erro ao convidar");
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        {doneMsg}
      </div>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setOpen(true)}>
        <UserPlus className="w-3.5 h-3.5" /> Convidar para o sistema
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convidar {collaboratorName} para o sistema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">
              Ao aceitar o convite via Google, este colaborador terá acesso ao sistema e poderá cadastrar outros apoiadores.
            </p>
            <div>
              <Label>Gmail *</Label>
              <Input
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gmail.com" type="email" autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                O acesso é ativado automaticamente no primeiro login com esse Gmail.
              </p>
            </div>
            <div>
              <Label>Nível de acesso</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? "")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Colaborador — gerencia próprios cadastros</SelectItem>
                  <SelectItem value="LEADER">Coordenador — gerencia colaboradores e zonas</SelectItem>
                  <SelectItem value="ADMIN">Administrador — acesso total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? "Enviando..." : "Enviar convite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
