"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Users,
  User,
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
  Church,
  Shield,
  ChevronsUpDown,
  Check,
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
  superAdminOnly?: boolean;
}[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/portal", icon: User, label: "Meu Portal" },
  { href: "/membros", icon: Users, label: "Membros", module: "MEMBERS" },
  { href: "/ministerios", icon: Church, label: "Ministérios", module: "MINISTRIES" },
  { href: "/aniversarios", icon: Cake, label: "Aniversários", module: "BIRTHDAYS" },
  { href: "/chamada", icon: ClipboardList, label: "Chamada", module: "ATTENDANCE" },
  { href: "/relatorios", icon: BarChart2, label: "Relatórios", module: "REPORTS" },
  { href: "/financeiro", icon: DollarSign, label: "Financeiro", module: "FINANCIAL" },
  { href: "/camisetas", icon: Shirt, label: "Camisetas", module: "SHIRTS" },
  { href: "/configuracoes", icon: Settings, label: "Configurações", adminOnly: true },
  { href: "/super-admin", icon: Shield, label: "Super Admin", superAdminOnly: true },
];

type EstablishmentOption = { establishmentId: string; name: string; logoBase64?: string | null; role: string };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [churchName, setChurchName] = useState("Porto Belo");
  const [churchLogoUrl, setChurchLogoUrl] = useState("");
  const [logoError, setLogoError] = useState(false);

  // Seletor de estabelecimento
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

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

  useEffect(() => {
    fetch("/api/user/establishments")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEstablishments(data); })
      .catch(() => {});
  }, []);

  async function switchEstablishment(eid: string) {
    if (eid === session?.user?.establishmentId || switching) return;
    setSwitching(true);
    setSwitcherOpen(false);
    await update({ selectedEstablishmentId: eid });
    router.refresh();
    setSwitching(false);
  }

  const initials = session?.user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  const isAdmin = session?.user?.role === "ADMIN";
  const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ?? false;
  const { canView } = usePermissions();
  const visibleItems = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
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
        {/* Header / Switcher */}
        <div className="p-4 border-b border-white/[0.06] relative">
          <button
            onClick={() => establishments.length > 1 && setSwitcherOpen((o) => !o)}
            disabled={switching}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-2 py-2 transition-all",
              establishments.length > 1
                ? "hover:bg-white/[0.04] cursor-pointer"
                : "cursor-default"
            )}
          >
            {churchLogoUrl && !logoError ? (
              <img
                src={churchLogoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-cover border border-primary/30 flex-shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center animate-glow-pulse flex-shrink-0">
                <Cross className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] tracking-[3px] uppercase text-primary/70">UMADC</p>
              <p className="text-sm font-bold text-foreground truncate">
                {switching ? "Trocando..." : churchName}
              </p>
            </div>
            {establishments.length > 1 && (
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && establishments.length > 1 && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-4 right-4 top-full mt-1 z-40 rounded-xl border border-white/[0.10] bg-slate-900 shadow-xl overflow-hidden">
                {establishments.map((e) => {
                  const active = e.establishmentId === session?.user?.establishmentId;
                  return (
                    <button
                      key={e.establishmentId}
                      onClick={() => switchEstablishment(e.establishmentId)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {e.logoBase64
                          ? <img src={e.logoBase64} alt="" className="w-full h-full object-cover" />
                          : <Cross className="w-3 h-3 text-primary" />
                        }
                      </div>
                      <span className="flex-1 truncate font-medium">{e.name}</span>
                      {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
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
