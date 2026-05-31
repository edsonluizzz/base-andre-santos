"use client";

import { cn } from "@/lib/utils";

interface ScoreBarProps {
  value: number | null | undefined; // 0-100
  className?: string;
  size?: "sm" | "md";
  showValue?: boolean;
}

/**
 * Barra de score com gradient red→yellow→green.
 * Usada em listas de colaboradores e perfil — mostra mobilizationScore (0-100).
 */
export function ScoreBar({ value, className, size = "sm", showValue = true }: ScoreBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));

  // Cor textual baseada na faixa
  const textColor =
    v >= 70 ? "text-green-400"
    : v >= 40 ? "text-amber-400"
    : v > 0 ? "text-red-400"
    : "text-muted-foreground/60";

  const barH = size === "md" ? "h-2" : "h-1.5";
  const numW = size === "md" ? "w-8" : "w-7";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div
        className={cn(
          "flex-1 min-w-12 max-w-32 rounded-full overflow-hidden relative",
          barH,
          "bg-white/[0.05]",
        )}
      >
        {/* Gradient fixo no fundo, máscara controla largura */}
        <div
          className={cn("h-full rounded-full transition-[width] duration-500")}
          style={{
            width: `${v}%`,
            background:
              v === 0
                ? "transparent"
                : "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)",
          }}
        />
      </div>
      {showValue && (
        <span className={cn("text-xs font-semibold tabular-nums shrink-0 text-right", textColor, numW)}>
          {v || "—"}
        </span>
      )}
    </div>
  );
}
