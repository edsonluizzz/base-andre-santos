"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { animate } from "animejs";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  color: string;
  delay?: number;
}

export function KpiCard({ icon: Icon, label, value, href, color, delay = 0 }: KpiCardProps) {
  const numRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!numRef.current) return;

    const obj = { val: 0 };
    animate(obj, {
      val: value,
      duration: 900,
      delay: delay * 80,
      ease: "outExpo",
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = Math.round(obj.val).toString();
        }
      },
    });
  }, [value, delay]);

  useEffect(() => {
    if (!cardRef.current) return;
    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      delay: delay * 80 + 100,
      ease: "outExpo",
    });
  }, [delay]);

  return (
    <Link
      ref={cardRef}
      href={href}
      className="glass-card rounded-2xl p-5 hover:border-primary/30 transition-colors border border-border group relative overflow-hidden"
      style={{ opacity: 0 }}
    >
      {/* Fundo glow ao hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-medium tracking-wide">{label}</span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-foreground/[0.04] border border-foreground/[0.06] group-hover:border-primary/20 transition-colors`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
          </div>
        </div>

        <p className={`text-3xl font-black tabular-nums leading-none ${color}`}>
          <span ref={numRef}>0</span>
        </p>

        {/* Barra decorativa */}
        <div className="mt-3 h-px w-0 group-hover:w-full transition-all duration-500 ease-out"
          style={{ background: `linear-gradient(to right, rgba(212,175,55,0.4), transparent)` }}
        />
      </div>
    </Link>
  );
}
