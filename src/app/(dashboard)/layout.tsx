import { Sidebar } from "@/components/sidebar";
import { PermissionsProvider } from "@/context/permissions-context";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { auth } from "@/lib/auth";
import { loadPermissionsForRole } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user?.role as string) ?? "MEMBER";
  const establishmentId = session?.user?.establishmentId ?? "default-porto-belo";
  const isAdmin = userRole === "ADMIN";
  const permissionsMap = await loadPermissionsForRole(
    userRole as "ADMIN" | "LEADER" | "MEMBER",
    establishmentId
  );

  return (
    <PermissionsProvider isAdmin={isAdmin} userRole={userRole} permissionsMap={permissionsMap}>
      <ImpersonationBanner />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen bg-background">
        <div className="hidden-print">
          <Sidebar />
        </div>
        <main id="main-content" className="flex-1 lg:ml-64 min-w-0 print-expand" tabIndex={-1}>
          <div className="p-6 lg:p-8 pt-16 lg:pt-8 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both">
            {children}
          </div>
        </main>
      </div>
    </PermissionsProvider>
  );
}
