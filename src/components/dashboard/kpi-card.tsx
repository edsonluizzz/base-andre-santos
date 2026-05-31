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

export function KpiCard({ icon, label, value, href, color, delay = 0 }: KpiCardProps) {
  const numRef  = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);

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
      className="glass-card rounded-2xl p-3 lg:p-5 border border-border group relative overflow-hidden touchable tap-transparent"
      style={{ opacity: 0, transform: "translateY(16px)" }}
    >
      {/* Glow hover radial */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 lg:mb-3">
          <span className="text-[10px] lg:text-xs text-muted-foreground font-medium tracking-wide truncate pr-1">{label}</span>
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center bg-foreground/[0.04] border border-foreground/[0.06] group-hover:border-primary/20 transition-colors shrink-0">
            {icon}
          </div>
        </div>

        <p className={`text-2xl lg:text-3xl font-black tabular-nums leading-none ${color}`}>
          <span ref={numRef}>0</span>
        </p>

        {/* Barra decorativa */}
        <div
          className="mt-2 lg:mt-3 h-px w-0 group-hover:w-full transition-all duration-500 ease-out"
          style={{ background: "linear-gradient(to right, rgba(212,175,55,0.4), transparent)" }}
        />
      </div>
    </Link>
  );
}
