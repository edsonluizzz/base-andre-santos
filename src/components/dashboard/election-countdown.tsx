import { differenceInDays, startOfDay } from "date-fns";

// Primeiro turno das eleições estaduais 2026
const ELECTION_DATE = new Date("2026-10-04T00:00:00-03:00");

export function ElectionCountdown() {
  const today = startOfDay(new Date());
  const days = differenceInDays(startOfDay(ELECTION_DATE), today);

  if (days < 0) return null;

  const urgency =
    days <= 30  ? { ring: "border-red-500/40",    bg: "bg-red-500/[0.07]",    num: "text-red-400",    label: "text-red-300/80"    } :
    days <= 90  ? { ring: "border-amber-500/40",  bg: "bg-amber-500/[0.07]",  num: "text-amber-400",  label: "text-amber-300/80"  } :
                  { ring: "border-primary/30",    bg: "bg-primary/[0.05]",    num: "text-primary",    label: "text-primary/70"    };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${urgency.ring} ${urgency.bg}`}>
      <div className="text-center shrink-0">
        <p className={`text-4xl font-black tabular-nums leading-none ${urgency.num}`}>{days}</p>
        <p className={`text-[10px] font-semibold uppercase tracking-widest mt-0.5 ${urgency.label}`}>dias</p>
      </div>
      <div className="w-px h-10 bg-white/[0.08] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">1º Turno — Eleições 2026</p>
        <p className="text-xs text-muted-foreground mt-0.5">4 de outubro de 2026 · Dep. Estadual PR</p>
      </div>
    </div>
  );
}
