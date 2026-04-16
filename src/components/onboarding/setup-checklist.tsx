"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from "lucide-react";

type ChecklistStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
};

export function SetupChecklist({
  establishmentId,
  membersCount,
  eventsCount,
  hasJoinCode,
  hasLogo,
}: {
  establishmentId: string;
  membersCount: number;
  eventsCount: number;
  hasJoinCode: boolean;
  hasLogo: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(`ovile_setup_dismissed_${establishmentId}`)) {
      setDismissed(true);
    }
  }, [establishmentId]);

  const steps: ChecklistStep[] = [
    {
      id: "created",
      label: "Congregação criada",
      description: "Sua conta está ativa e pronta",
      done: true,
    },
    {
      id: "members",
      label: "Adicionar membros",
      description: "Cadastre os participantes da congregação",
      done: membersCount > 0,
      href: "/membros",
    },
    {
      id: "events",
      label: "Criar primeiro evento",
      description: "Registre um culto, ensaio ou reunião",
      done: eventsCount > 0,
      href: "/chamada",
    },
    {
      id: "joincode",
      label: "Ativar link de convite",
      description: "Permita que membros entrem pelo link",
      done: hasJoinCode,
      href: "/configuracoes",
    },
    {
      id: "logo",
      label: "Adicionar logo da igreja",
      description: "Personalize com a identidade visual",
      done: hasLogo,
      href: "/configuracoes",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  function dismiss() {
    localStorage.setItem(`ovile_setup_dismissed_${establishmentId}`, "1");
    setDismissed(true);
  }

  if (!mounted || dismissed || allDone) return null;

  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="glass-card p-5 mb-6 border border-primary/20 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-primary/70">Configuração Inicial</p>
            <h3 className="text-sm font-bold text-foreground">
              Primeiros passos — {doneCount}/{steps.length} concluídos
            </h3>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex-shrink-0"
          title="Dispensar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/25 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium leading-tight ${
                  step.done ? "line-through text-muted-foreground/50" : "text-foreground"
                }`}
              >
                {step.label}
              </p>
              {!step.done && (
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">{step.description}</p>
              )}
            </div>
            {!step.done && step.href && (
              <Link
                href={step.href}
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
              >
                Ir <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
