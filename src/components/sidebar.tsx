"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, MessageCircle, Calendar,
  Megaphone, Settings, LogOut, Menu, X, Shield, Star, Map, BarChart2, Network, Target, ClipboardList, Camera, Award, Building2, Plus,
  ChevronLeft, ChevronRight, Sun, Moon, GraduationCap,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/contexts/sidebar-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const navItems = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Dashboard",       minRole: "MEMBER", superAdminOnly: false },
  { href: "/treinamento",    icon: GraduationCap,    label: "Treinamento",     minRole: "MEMBER", superAdminOnly: false },
  { href: "/colaboradores",  icon: Users,            label: "Colaboradores",   minRole: "MEMBER", superAdminOnly: false },
  { href: "/celulas",        icon: Network,          label: "Células",         minRole: "MEMBER", superAdminOnly: false },
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
  const { data: session, update } = useSession();
  const { isCollapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { theme, setTheme } = useTheme();
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Valores derivados — definidos antes dos hooks que os consomem
  const role = serverRole ?? session?.user?.role ?? "MEMBER";
  const isSuperAdmin = serverIsSuperAdmin ?? (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ?? false;
  const displayName  = serverName  || session?.user?.name  || "Usuário";
  const displayImage = serverImage || session?.user?.image || "";
  const activeCampaignId = (session?.user as { campaignId?: string })?.campaignId ?? "andre-santos-2026";
  const userRank = ROLE_RANK[role] ?? 0;
  const visibleItems = navItems.filter((item) => (ROLE_RANK[item.minRole] ?? 0) <= userRank);
  const finalItems = visibleItems.filter((item) =>
    item.superAdminOnly ? isSuperAdmin : true
  );
  const initials = displayName
    .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "U";
  const isLight = theme === "light";

  // Hooks que dependem de valores derivados
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchCampaigns();
  }, [isSuperAdmin, fetchCampaigns]);

  useEffect(() => {
    if (!mobileOpen) menuButtonRef.current?.focus();
  }, [mobileOpen]);

  async function switchCampaign(campaignId: string) {
    setSwitcherOpen(false);
    await update({ selectedCampaignId: campaignId });
    window.location.href = "/dashboard"; // limpa caches RSC
  }

  return (
    <TooltipProvider delayDuration={300}>
    <>
      {/* Mobile hamburger */}
      <button
        ref={menuButtonRef}
        className="fixed top-4 left-4 z-50 lg:hidden glass-card border border-border p-2 rounded-lg cursor-pointer"
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
          "border-r border-sidebar-border",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{
          // Background sólido (sem backdrop-blur — destrói scroll em iOS)
          backgroundColor: "rgba(10,18,32,0.98)",
        }}
      >
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border flex-shrink-0">
          <div className={cn("flex items-center gap-3 px-1 py-1.5", isCollapsed && "justify-center")}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center animate-glow-pulse flex-shrink-0">
              <Star className="w-4 h-4 text-primary fill-primary/30" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] tracking-[3px] uppercase text-primary/70">Gestão Eleitoral</p>
                <p className="text-sm font-bold text-sidebar-foreground truncate">Ovile · PR 2026</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 p-2 space-y-0.5 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
          {finalItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isCollapsed ? "px-0 justify-center" : "px-3",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-foreground/[0.05] hover:translate-x-0.5"
                )}
                style={active ? { boxShadow: "inset 3px 0 0 var(--primary)" } : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && item.label}
              </Link>
            );

            if (!isCollapsed) return <div key={item.href}>{linkEl}</div>;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Campaign switcher — visível apenas para super-admin */}
        {isSuperAdmin && !isCollapsed && campaigns.length > 1 && (
          <div className="px-3 pb-2 relative">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              title="Trocar campanha ativa"
            >
              <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="flex-1 text-left truncate text-muted-foreground">
                {campaigns.find((c) => c.id === activeCampaignId)?.name ?? activeCampaignId}
              </span>
              <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${switcherOpen ? "rotate-90" : ""}`} />
            </button>
            {switcherOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-white/[0.10] bg-sidebar overflow-hidden shadow-xl z-50">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => switchCampaign(c.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.06] text-left ${c.id === activeCampaignId ? "text-primary bg-primary/[0.06]" : "text-muted-foreground"}`}
                  >
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{c.name}</span>
                    {c.id === activeCampaignId && <span className="ml-auto text-[9px] text-primary">ativa</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notificações */}
        {!isCollapsed && (
          <div className="px-4 pb-2">
            <NotificationBell fullWidth />
          </div>
        )}

        {/* User footer */}
        <div className={cn("p-3 border-t border-sidebar-border", isCollapsed && "flex flex-col items-center gap-2")}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={displayImage} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
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

        {/* Barra inferior: tema + collapse (desktop) */}
        <div className="hidden lg:flex items-center border-t border-sidebar-border flex-shrink-0">
          {/* Toggle tema */}
          <button
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className={cn(
              "flex items-center justify-center py-2 text-muted-foreground hover:text-sidebar-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer",
              isCollapsed ? "w-full" : "flex-1"
            )}
            title={isLight ? "Mudar para tema escuro" : "Mudar para tema claro"}
          >
            {isLight
              ? <Moon className="w-4 h-4" />
              : <Sun className="w-4 h-4" />
            }
          </button>

          {/* Toggle sidebar */}
          <button
            onClick={toggle}
            className={cn(
              "flex items-center justify-center py-2 text-muted-foreground hover:text-sidebar-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer",
              isCollapsed ? "w-full" : "px-3"
            )}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>
    </>
    </TooltipProvider>
  );
}
