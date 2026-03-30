"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  Users,
  Cake,
  DollarSign,
  ClipboardList,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart2,
  Shirt,
  Cross,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermissions } from "@/context/permissions-context";
import type { PermissionModule } from "@/types/permissions";

const navItems: {
  href: string;
  icon: React.ElementType;
  label: string;
  module?: PermissionModule;
  adminOnly?: boolean;
}[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/membros", icon: Users, label: "Membros", module: "MEMBERS" },
  { href: "/aniversarios", icon: Cake, label: "Aniversários", module: "BIRTHDAYS" },
  { href: "/chamada", icon: ClipboardList, label: "Chamada", module: "ATTENDANCE" },
  { href: "/relatorios", icon: BarChart2, label: "Relatórios", module: "REPORTS" },
  { href: "/financeiro", icon: DollarSign, label: "Financeiro", module: "FINANCIAL" },
  { href: "/camisetas", icon: Shirt, label: "Camisetas", module: "SHIRTS" },
  { href: "/configuracoes", icon: Settings, label: "Configurações", adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [churchName, setChurchName] = useState("Porto Belo");
  const [churchLogoUrl, setChurchLogoUrl] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.churchName) setChurchName(s.churchName);
        setChurchLogoUrl(s.logoBase64 ?? "");
        setLogoError(false);
      })
      .catch(() => {});

    function onSettingsUpdated(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.churchName) setChurchName(detail.churchName);
      setChurchLogoUrl(detail.logoBase64 ?? "");
      setLogoError(false);
    }
    window.addEventListener("church-settings-updated", onSettingsUpdated);
    return () => window.removeEventListener("church-settings-updated", onSettingsUpdated);
  }, []);

  const initials = session?.user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  const isAdmin = session?.user?.role === "ADMIN";
  const { canView } = usePermissions();
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.module && !canView(item.module)) return false;
    return true;
  });

  const roleLabel =
    session?.user?.role === "ADMIN"
      ? "Administrador"
      : session?.user?.role === "LEADER"
      ? "Líder"
      : "Membro";

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden glass-card border border-white/[0.07] p-2 rounded-lg cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="w-5 h-5 text-primary" />
        ) : (
          <Menu className="w-5 h-5 text-primary" />
        )}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300",
          "border-r border-white/[0.06]",
          "bg-slate-950/80",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {churchLogoUrl && !logoError ? (
              <img
                src={churchLogoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-cover border border-primary/30"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center animate-glow-pulse">
                <Cross className="w-4 h-4 text-primary" />
              </div>
            )}
            <div>
              <p className="text-[10px] tracking-[3px] uppercase text-primary/70">
                UMADC
              </p>
              <p className="text-sm font-bold text-foreground">
                {churchName}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_3px_0_0_#6366F1]"
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
        <div className="px-4 pb-2 flex items-center gap-2">
          <NotificationBell />
          <span className="text-xs text-muted-foreground">Notificações</span>
        </div>

        {/* User footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {session?.user?.name ?? "Usuário"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
