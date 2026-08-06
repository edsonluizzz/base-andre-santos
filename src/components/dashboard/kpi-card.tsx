"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  href: string;
  color: string;
  delay?: number;
}

/** easeOutExpo: rápida aceleração → desaceleração suave */
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Mapeia a classe Tailwind de cor para o prefixo rgba (sem alpha) */
const colorMap: Record<string, string> = {
  "text-primary":    "rgba(255,107,4,",
  "text-green-400":  "rgba(74,222,128,",
  "text-blue-400":   "rgba(96,165,250,",
  "text-purple-400": "rgba(192,132,252,",
  "text-amber-400":  "rgba(251,191,36,",
};

export function KpiCard({ icon, label, value, href, color, delay = 0 }: KpiCardProps) {
  const numRef  = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);

  // Resolve a cor base (rgba sem alpha) a partir da classe Tailwind recebida.
  const baseColor =
    Object.entries(colorMap).find(([k]) => color.includes(k.split("-").slice(-2).join("-")))?.[1] ??
    "rgba(255,107,4,";

  /* Animação de entrada da card (translate + fade) */
  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    const timeout = setTimeout(() => {
      el.style.transition = "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, delay * 80 + 80);
    return () => clearTimeout(timeout);
  }, [delay]);

  /* CountUp com requestAnimationFrame */
  useEffect(() => {
    if (!numRef.current) return;
    if (value === 0) {
      numRef.current.textContent = "0";
      return;
    }

    const DURATION = 900;
    let rafId: number;
    const startTime = performance.now() + delay * 80;
    let started = false;

    const tick = (now: number) => {
      if (!numRef.current) return;
      if (now < startTime) { rafId = requestAnimationFrame(tick); return; }

      if (!started) { started = true; }
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      numRef.current.textContent = Math.round(easeOutExpo(t) * value).toString();
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, delay]);

  return (
    <Link
      ref={cardRef}
      href={href}
      className="glass-card rounded-2xl p-3.5 lg:p-5 border border-border group relative overflow-hidden touchable tap-transparent"
      style={{ opacity: 0, transform: "translateY(16px)" }}
    >
      {/* Glow hover radial — usa a cor da prop */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${baseColor}0.08) 0%, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 lg:mb-3">
          <span className="text-[10px] lg:text-xs text-muted-foreground font-medium tracking-wide truncate pr-1">{label}</span>
          <div
            className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center border border-foreground/[0.06] group-hover:border-primary/20 transition-colors shrink-0"
            style={{ background: `${baseColor}0.08)` }}
          >
            {icon}
          </div>
        </div>

        <p className={`text-2xl lg:text-3xl font-black tabular-nums leading-none ${color}`}>
          <span ref={numRef}>0</span>
        </p>

        {/* Barra colorida na base — sempre visível (3rem), expande ao hover */}
        <div
          className="mt-2 lg:mt-3 h-px w-12 group-hover:w-full transition-all duration-500 ease-out rounded-full"
          style={{ background: `linear-gradient(to right, ${baseColor}0.6), ${baseColor}0.1))` }}
        />
      </div>
    </Link>
  );
}
