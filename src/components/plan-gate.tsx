"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PlanGate({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => setPlan(d.plan ?? "FREE"))
      .catch(() => setPlan("FREE"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plan === "PRO") return <>{children}</>;

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Erro ao iniciar checkout");
        setUpgrading(false);
      }
    } catch {
      toast.error("Erro de conexão");
      setUpgrading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <Crown className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Recurso exclusivo do plano Pro</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {feature
          ? `${feature} está disponível apenas no plano Pro.`
          : "Este módulo está disponível apenas no plano Pro."}{" "}
        Faça upgrade para desbloquear todas as funcionalidades.
      </p>
      <Button
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        onClick={handleUpgrade}
        disabled={upgrading}
      >
        {upgrading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Crown className="w-4 h-4 mr-2" />
        )}
        Fazer upgrade — R$ 29,99/mês
      </Button>
    </div>
  );
}
