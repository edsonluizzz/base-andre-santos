"use client";

import { useState } from "react";
import { Mail, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Item = { campaignId: string; email: string; invitedAt: string | null };

// Limpa convites (UserCampaign) PENDING duplicados: quem já tem ACCEPTED na mesma
// campanha. Dry-run (verificar) antes de remover. Idempotente. Super-admin.
export function DuplicateInvitesCleanup() {
  const [checking, setChecking] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/cleanup-duplicate-invites");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setItems(d.items ?? []);
      else toast.error(d.error ?? "Erro ao verificar");
    } finally {
      setChecking(false);
    }
  }

  async function clean() {
    if (!confirm("Remover os convites pendentes duplicados? Quem já aceitou mantém o acesso normalmente.")) return;
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/cleanup-duplicate-invites", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(`${d.deleted} convite(s) duplicado(s) removido(s)`); setItems([]); }
      else toast.error(d.error ?? "Erro ao limpar");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Convites duplicados</h2>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Remove convites PENDENTES de quem já aceitou (mesma campanha). Inofensivo — só arrumação.
      </p>

      {items === null ? (
        <Button size="sm" variant="outline" disabled={checking} onClick={check} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Verificando..." : "Verificar duplicados"}
        </Button>
      ) : items.length === 0 ? (
        <p className="text-xs text-green-400">Nenhum convite duplicado. 🎉</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-amber-400">{items.length} convite(s) duplicado(s) encontrado(s):</p>
          <ul className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg border border-white/[0.06] p-2">
            {items.map((it, i) => (
              <li key={`${it.email}-${i}`} className="text-[11px] text-muted-foreground font-mono truncate">{it.email}</li>
            ))}
          </ul>
          <Button size="sm" disabled={cleaning} onClick={clean} className="gap-1.5 text-xs bg-destructive/90 hover:bg-destructive text-white">
            <Trash2 className="w-3.5 h-3.5" /> {cleaning ? "Removendo..." : `Remover ${items.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}
