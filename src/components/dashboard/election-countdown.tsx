"use client";

import { useEffect, useRef } from "react";
import { differenceInDays, startOfDay } from "date-fns";

const ELECTION_DATE = new Date("2026-10-04T00:00:00-03:00");

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function ElectionCountdown() {
  const today = startOfDay(new Date());
  const days  = differenceInDays(startOfDay(ELECTION_DATE), today);

  const numRef  = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* Entrada da card */
  useEffect(() => {
    if (!cardRef.current || days < 0) return;
    const el = cardRef.current;
    const t = setTimeout(() => {
      el.style.transition = "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 200);
    return () => clearTimeout(t);
  }, [days]);

  /* CountUp RAF */
  useEffect(() => {
    if (!numRef.current || days <= 0) {
      if (numRef.current) numRef.current.textContent = String(Math.max(0, days));
      return;
    }
    const DURATION = 1200;
    const start = performance.now() + 300;
    let rafId: number;

    const tick = (now: number) => {
      if (!numRef.current) return;
      if (now < start) { rafId = requestAnimationFrame(tick); return; }
      const t = Math.min((now - start) / DURATION, 1);
      numRef.current.textContent = Math.round(easeOutExpo(t) * days).toString();
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [days]);

  if (days < 0) return null;

  const urgency =
    days <= 30  ? { ring: "border-red-500/40",    bg: "bg-red-500/[0.07]",    num: "text-red-400",    label: "text-red-300/80",    glow: "rgba(239,68,68,0.15)"  } :
    days <= 90  ? { ring: "border-amber-500/40",  bg: "bg-amber-500/[0.07]",  num: "text-amber-400",  label: "text-amber-300/80",  glow: "rgba(245,158,11,0.15)" } :
                  { ring: "border-primary/30",    bg: "bg-primary/[0.05]",    num: "text-primary",    label: "text-primary/70",    glow: "rgba(255,107,4,0.12)" };

  return (
    <div
      ref={cardRef}
      className={`relative flex items-center gap-4 rounded-2xl border px-5 py-4 overflow-hidden ${urgency.ring} ${urgency.bg}`}
      style={{ opacity: 0, transform: "translateY(12px)" }}
    >
      {/* Glow contextual */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${urgency.glow} 0%, transparent 65%)` }}
      />

      <div className="relative text-center shrink-0">
        <p className={`text-4xl font-black tabular-nums leading-none ${urgency.num}`}>
          <span ref={numRef}>0</span>
        </p>
        <p className={`text-[10px] font-semibold uppercase tracking-widest mt-0.5 ${urgency.label}`}>dias</p>
      </div>

      <div className="w-px h-10 bg-white/[0.08] shrink-0" />

      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">1º Turno — Eleições 2026</p>
        <p className="text-xs text-muted-foreground mt-0.5">4 de outubro de 2026 · Dep. Estadual PR</p>
      </div>
    </div>
  );
}
