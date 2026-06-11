"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, Network, Menu } from "lucide-react";
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
  { href: "/celulas",       icon: Network,         label: "Células" },
];

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="app-bottomnav fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border pb-safe"
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
                "flex-1 flex flex-col items-center justify-center gap-1 tap-transparent touchable",
                "min-w-0 px-1",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
              <span className={cn("text-[10px] leading-none truncate w-full text-center", active && "font-semibold")}>
                {item.label}
              </span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
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
