"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, BarChart2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Início" },
  { href: "/colaboradores", icon: Users,           label: "Apoiadores" },
  { href: "/agenda",        icon: Calendar,        label: "Agenda" },
  { href: "/relatorio",     icon: BarChart2,       label: "Relatório" },
];

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border pb-safe"
      style={{
        // Background sólido (sem blur) — backdrop-blur destrói scroll em iOS
        backgroundColor: "rgba(10,18,32,0.98)",
      }}
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-14">
        {PRIMARY_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 tap-transparent touchable",
                "min-w-0 px-1",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
              <span className={cn("text-[10px] leading-none truncate w-full text-center", active && "font-semibold")}>
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 h-0.5 w-10 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 tap-transparent touchable text-muted-foreground min-w-0 px-1"
          aria-label="Mais opções"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}
