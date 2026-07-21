"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, AlertCircle } from "lucide-react";
import { PastorPicker } from "./pastor-picker";

type Collab = { id: string; name: string };
type Church = {
  id: string;
  name: string;
  regional: string | null;
  denominacao: string | null;
  pastor: Collab | null;
};
type Props = {
  open: boolean;
  church: Church | null;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

export function EditChurchDialog({ open, church, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [regional, setRegional] = useState("");
  const [denominacao, setDenominacao] = useState("");
  const [pastor, setPastor] = useState<Collab | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (church) {
      setName(church.name);
      setRegional(church.regional ?? "");
      setDenominacao(church.denominacao ?? "");
      setPastor(church.pastor);
      setError("");
    }
  }, [church]);

  function handleClose(v: boolean) {
    onOpenChange(v);
  }

  async function handleSave() {
    if (!church) return;
    if (!name.trim()) { setError("Informe o nome da igreja."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/churches/${church.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          regional: regional.trim() || null,
          denominacao: denominacao.trim() || null,
          pastorId: pastor?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar"); setSaving(false); return; }
      onSuccess();
      handleClose(false);
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

  if (!church) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Editar igreja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome da congregação</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Regional</label>
            <input
              type="text"
              value={regional}
              onChange={(e) => setRegional(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Denominação</label>
            <input
              type="text"
              value={denominacao}
              onChange={(e) => setDenominacao(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
            />
          </div>
          <PastorPicker selected={pastor} onSelect={setPastor} />
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
