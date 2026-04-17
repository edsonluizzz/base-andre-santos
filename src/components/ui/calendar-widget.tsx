import { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  type: string;
  date: string;
};

const EVENT_TYPE_DOT: Record<string, string> = {
  CULTO:     "bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]",
  ENSAIO:    "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]",
  REUNIAO:   "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  RETIRO:    "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
  CELULA:    "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]",
  CONGRESSO: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
  BIRTHDAY:  "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]",
  OUTRO:     "bg-slate-400",
};

export function CalendarWidget({ 
  events, 
  onDayClick 
}: { 
  events: Event[]; 
  onDayClick: (date: Date) => void 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[2px] mt-0.5">Calendário Mensal</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 py-1 rounded text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors uppercase tracking-wider"
          >
            Hoje
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((day, idx) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString() + idx}
              onClick={() => onDayClick(day)}
              className={cn(
                "group relative min-h-[50px] p-1.5 rounded-xl border border-transparent transition-all cursor-pointer",
                isCurrentMonth ? "hover:bg-primary/5 hover:border-primary/20" : "opacity-20 pointer-events-none",
                isToday && "bg-primary/10 border-primary/30"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isToday ? "text-primary" : "text-slate-400 group-hover:text-white"
              )}>
                {format(day, "d")}
              </span>

              <div className="flex flex-wrap gap-1 mt-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div 
                    key={e.id} 
                    className={cn("w-1.5 h-1.5 rounded-full", EVENT_TYPE_DOT[e.type] || EVENT_TYPE_DOT.OUTRO)} 
                    title={e.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>

              {isCurrentMonth && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
