"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, MapPin, MessageCircle, Calendar,
  Megaphone, Settings, LogOut, Menu, X, Shield, Star, Map, BarChart2, Network, Trophy, FileText, Target, ClipboardList,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard",       minRole: "MEMBER" },
  { href: "/colaboradores", icon: Users,            label: "Colaboradores",   minRole: "MEMBER" },
  { href: "/minha-celula",  icon: Star,             label: "Minha Célula",    minRole: "MEMBER" },
  { href: "/celulas",       icon: Network,          label: "Células",         minRole: "MEMBER" },
  { href: "/ranking",       icon: Trophy,           label: "Ranking",         minRole: "MEMBER" },
  { href: "/mapa",          icon: Map,              label: "Mapa de Apoio",   minRole: "LEADER" },
  { href: "/zonas",         icon: MapPin,           label: "Zonas",           minRole: "LEADER" },
  { href: "/grupos",        icon: MessageCircle,    label: "Grupos WhatsApp", minRole: "LEADER" },
  { href: "/agenda",        icon: Calendar,         label: "Agenda",          minRole: "LEADER" },
  { href: "/relatorio",     icon: BarChart2,        label: "Relatório",       minRole: "LEADER" },
  { href: "/metas",         icon: Target,           label: "Metas",           minRole: "LEADER" },
  { href: "/tarefas",       icon: ClipboardList,    label: "Tarefas",         minRole: "ADMIN"  },
  { href: "/planejamento",  icon: FileText,         label: "Planejamento",    minRole: "ADMIN"  },
  { href: "/comunicados",   icon: Megaphone,        label: "Comunicados",     minRole: "ADMIN"  },
  { href: "/configuracoes", icon: Settings,         label: "Configurações",   minRole: "ADMIN"  },
  { href: "/super-admin",   icon: Shield,           label: "Super Admin",     minRole: "ADMIN"  },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Coordenador",
  MEMBER: "Colaborador",
};

export function Sidebar({
  serverRole,
  serverIsSuperAdmin,
}: {
  serverRole?: string;
  serverIsSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) menuButtonRef.current?.focus();
  }, [mobileOpen]);

  // Usa props do servidor (confiáveis) — cai de volta no useSession apenas se não passado
  const role = serverRole ?? session?.user?.role ?? "MEMBER";
  const isSuperAdmin = serverIsSuperAdmin ?? (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ?? false;
  const userRank = ROLE_RANK[role] ?? 0;

  const visibleItems = navItems.filter((item) => (ROLE_RANK[item.minRole] ?? 0) <= userRank);

  // Super Admin visível apenas para superAdmin (subset do ADMIN)
  const finalItems = visibleItems.filter((item) =>
    item.href === "/super-admin" ? isSuperAdmin : true
  );

  const initials = session?.user?.name
    ?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <>
      <button
        ref={menuButtonRef}
        className="fixed top-4 left-4 z-50 lg:hidden glass-card border border-white/[0.07] p-2 rounded-lg cursor-pointer"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
      >
        {mobileOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5 text-primary" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300",
          "border-r border-white/[0.06] bg-slate-950/90",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center animate-glow-pulse flex-shrink-0">
              <Star className="w-4 h-4 text-primary fill-primary/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[3px] uppercase text-primary/70">Base de Apoio 2026</p>
              <p className="text-sm font-bold text-foreground truncate">Base André Santos</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {finalItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_3px_0_0_#d4af37]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] hover:translate-x-0.5"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Notificações */}
        <div className="px-4 pb-2">
          <NotificationBell fullWidth />
        </div>

        {/* User footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={session?.user?.image ?? ""} referrerPolicy="no-referrer" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{session?.user?.name ?? "Usuário"}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[role] ?? "Colaborador"}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2 leading-tight">
            Desenvolvido por{" "}
            <span className="text-primary/60 font-medium">Edson Luiz Silva</span>
          </p>
        </div>
      </aside>
    </>
  );
}
