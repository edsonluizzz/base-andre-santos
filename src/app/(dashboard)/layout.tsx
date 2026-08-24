import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { SidebarMainWrapper } from "@/components/sidebar-main-wrapper";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user.role ?? "MEMBER") as string;
  const isSuperAdmin = Boolean((session.user as { isSuperAdmin?: boolean }).isSuperAdmin);
  const isFinanceAdmin = Boolean((session.user as { isFinanceAdmin?: boolean }).isFinanceAdmin);
  const moduleScope = session.user.moduleScope ?? "full";
  const serverName  = session.user.name  ?? "";
  const serverImage = session.user.image ?? "";

  return (
    <SidebarProvider>
      {/* Sem bg-background aqui: o fundo é o body + os orbs (.app-bg). Um fundo
          sólido neste wrapper tapava os orbs e matava o efeito de vidro. */}
      <div className="flex min-h-screen">
        <div className="hidden-print">
          <Sidebar serverRole={role} serverIsSuperAdmin={isSuperAdmin} serverIsFinanceAdmin={isFinanceAdmin} serverModuleScope={moduleScope} serverName={serverName} serverImage={serverImage} />
        </div>
        <SidebarMainWrapper>{children}</SidebarMainWrapper>
      </div>
    </SidebarProvider>
  );
}
