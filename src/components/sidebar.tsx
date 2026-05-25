"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, MapPin, MessageCircle, Calendar,
  Megaphone, Settings, LogOut, Menu, X, Shield, Star, Map, BarChart2, Network, Trophy, FileText, Target, ClipboardList, Camera, Award, Building2, Plus,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/contexts/sidebar-context";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const navItems = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Dashboard",       minRole: "MEMBER", superAdminOnly: false },
  { href: "/colaboradores",  icon: Users,            label: "Colaboradores",   minRole: "MEMBER", superAdminOnly: false },
  { href: "/minha-celula",   icon: Star,             label: "Minha Célula",    minRole: "MEMBER", superAdminOnly: false },
  { href: "/celulas",        icon: Network,          label: "Células",         minRole: "MEMBER", superAdminOnly: false },
  { href: "/ranking",        icon: Trophy,           label: "Ranking",         minRole: "MEMBER", superAdminOnly: false },
  { href: "/mapa",           icon: Map,              label: "Mapa de Apoio",   minRole: "LEADER", superAdminOnly: false },
  { href: "/grupos",         icon: MessageCircle,    label: "Grupos WhatsApp", minRole: "LEADER", superAdminOnly: false },
  { href: "/agenda",         icon: Calendar,         label: "Agenda",          minRole: "LEADER", superAdminOnly: false },
  { href: "/relatorio",      icon: BarChart2,        label: "Relatório",       minRole: "LEADER", superAdminOnly: false },
  { href: "/metas",          icon: Target,           label: "Metas",           minRole: "LEADER", superAdminOnly: false },
  { href: "/instagram",      icon: Camera,           label: "Instagram",       minRole: "LEADER", superAdminOnly: false },
  { href: "/eleitos-2022",   icon: Award,            label: "Eleitos 2022",    minRole: "LEADER", superAdminOnly: false },
  { href: "/tarefas",        icon: ClipboardList,    label: "Tarefas",         minRole: "ADMIN",  superAdminOnly: false },
  { href: "/comunicados",    icon: Megaphone,        label: "Comunicados",     minRole: "ADMIN",  superAdminOnly: false },
  { href: "/configuracoes",  icon: Settings,         label: "Configurações",   minRole: "ADMIN",  superAdminOnly: false },
  { href: "/super-admin",    icon: Shield,           label: "Super Admin",     minRole: "ADMIN",  superAdminOnly: true  },
  { href: "/campanhas",      icon: Building2,        label: "Campanhas",       minRole: "ADMIN",  superAdminOnly: true  },
  { href: "/nova-campanha",  icon: Plus,             label: "Nova Campanha",   minRole: "ADMIN",  superAdminOnly: true  },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Coordenador",
  MEMBER: "Colaborador",
};

export function Sidebar({
  serverRole,
  serverIsSuperAdmin,
  serverName,
  serverImage,
}: {
  serverRole?: string;
  serverIsSuperAdmin?: boolean;
  serverName?: string;
  serverImage?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isCollapsed, toggle } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) menuButtonRef.current?.focus();
  }, [mobileOpen]);

  const role = serverRole ?? session?.user?.role ?? "MEMBER";
  const isSuperAdmin = serverIsSuperAdmin ?? (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ?? false;
  const displayName  = serverName  || session?.user?.name  || "Usuário";
  const displayImage = serverImage || session?.user?.image || "";
  const userRank = ROLE_RANK[role] ?? 0;

  const visibleItems = navItems.filter((item) => (ROLE_RANK[item.minRole] ?? 0) <= userRank);
  const finalItems = visibleItems.filter((item) =>
    item.superAdminOnly ? isSuperAdmin : true
  );

  const initials = displayName
    .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "U";

  return (
    <>
      {/* Mobile hamburger */}
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
          "fixed top-0 left-0 h-full max-h-[100dvh] z-40 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-hidden",
          "border-r border-white/[0.06] bg-slate-950/90",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
          <div className={cn("flex items-center gap-3 px-1 py-1.5", isCollapsed && "justify-center")}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center animate-glow-pulse flex-shrink-0">
              <Star className="w-4 h-4 text-primary fill-primary/30" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] tracking-[3px] uppercase text-primary/70">Ovile Eleitoral</p>
                <p className="text-sm font-bold text-foreground truncate">Ovile Eleitoral</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 p-2 space-y-0.5 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
          {finalItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isCollapsed ? "px-0 justify-center" : "px-3",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_3px_0_0_#d4af37]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] hover:translate-x-0.5"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Notificações */}
        {!isCollapsed && (
          <div className="px-4 pb-2">
            <NotificationBell fullWidth />
          </div>
        )}

        {/* User footer */}
        <div className={cn("p-3 border-t border-white/[0.06]", isCollapsed && "flex flex-col items-center gap-2")}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={displayImage} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
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
            </>
          ) : (
            <>
              <Avatar className="w-8 h-8" title={displayName}>
                <AvatarImage src={displayImage} referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Toggle button (desktop only) */}
        <button
          onClick={toggle}
          className="hidden lg:flex items-center justify-center w-full py-2 border-t border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex-shrink-0"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </aside>
    </>
  );
}
