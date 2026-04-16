"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, CalendarCheck2, ChevronRight, X, Church } from "lucide-react";

type TourStep = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const STEPS: TourStep[] = [
  {
    icon: Church,
    title: "Bem-vindo ao seu Portal!",
    description:
      "Este é o seu espaço pessoal na congregação. Aqui você acompanha sua frequência, confirma presença em eventos e mantém seu perfil atualizado.",
  },
  {
    icon: CheckCircle2,
    title: "Sua Frequência",
    description:
      "Acompanhe seu histórico de participação em cada evento. Seu líder registra a chamada e tudo fica disponível aqui para você consultar.",
  },
  {
    icon: CalendarCheck2,
    title: "Confirme sua Presença",
    description:
      "Quando um novo evento for publicado, você pode confirmar presença antecipadamente pelo RSVP. Seu líder verá quem está confirmado.",
  },
];

export function PortalWelcomeTour({ memberId }: { memberId: string }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const storageKey = `ovile_portal_tour_${memberId}`;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  function close() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 150);
    } else {
      close();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm glass-card border border-primary/20 p-6 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                  ? "w-3 bg-primary/40"
                  : "w-3 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div
          className={`transition-all duration-150 ${
            animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-primary" />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={close}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isLast ? "Começar!" : "Próximo"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
