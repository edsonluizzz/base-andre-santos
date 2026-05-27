"use client";

import { useEffect, useRef } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { animate } from "animejs";

const ELECTION_DATE = new Date("2026-10-04T00:00:00-03:00");

export function ElectionCountdown() {
  const today = startOfDay(new Date());
  const days = differenceInDays(startOfDay(ELECTION_DATE), today);

  const numRef  = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numRef.current || days < 0) return;
    const obj = { val: 0 };
    animate(obj, {
      val: days,
      duration: 1200,
      delay: 300,
      ease: "outExpo",
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.val).toString();
      },
    });
  }, [days]);

  useEffect(() => {
    if (!cardRef.current || days < 0) return;
    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 600,
      delay: 200,
      ease: "outExpo",
    });
  }, [days]);

  if (days < 0) return null;

  const urgency =
    days <= 30  ? { ring: "border-red-500/40",    bg: "bg-red-500/[0.07]",    num: "text-red-400",    label: "text-red-300/80",    glow: "rgba(239,68,68,0.15)"   } :
    days <= 90  ? { ring: "border-amber-500/40",  bg: "bg-amber-500/[0.07]",  num: "text-amber-400",  label: "text-amber-300/80",  glow: "rgba(245,158,11,0.15)"  } :
                  { ring: "border-primary/30",    bg: "bg-primary/[0.05]",    num: "text-primary",    label: "text-primary/70",    glow: "rgba(212,175,55,0.12)"  };

  return (
    <div
      ref={cardRef}
      className={`relative flex items-center gap-4 rounded-2xl border px-5 py-4 overflow-hidden ${urgency.ring} ${urgency.bg}`}
      style={{ opacity: 0 }}
    >
      {/* Glow decorativo */}
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
