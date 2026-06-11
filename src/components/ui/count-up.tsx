"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Conta de 0 até `value` com easeOutCubic (motion sutil — redesign 3A).
 * RAF puro (sem dependência). Respeita prefers-reduced-motion. Reanima quando
 * o valor muda (ex: filtros recarregam os KPIs).
 */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const from = prevTarget.current === null ? 0 : prevTarget.current;
    prevTarget.current = target;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/** Número animado (count-up) formatado em pt-BR. */
export function CountUp({ value }: { value: number }) {
  const n = useCountUp(value);
  return <>{n.toLocaleString("pt-BR")}</>;
}
