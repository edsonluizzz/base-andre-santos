"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConfiguracoesPage() {
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => { if (s.campaignName) setCampaignName(s.campaignName); }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignName }) });
    setSaving(false);
    if (res.ok) toast.success("Configurações salvas");
    else toast.error("Erro ao salvar");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações gerais da campanha</p>
      </div>
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Campanha</h2>
        </div>
        <div>
          <Label>Nome da Campanha</Label>
          <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Base André Santos" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
