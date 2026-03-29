import { Sidebar } from "@/components/sidebar";
import { PermissionsProvider } from "@/context/permissions-context";
import { auth } from "@/lib/auth";
import { loadPermissionsForRole } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user?.role as string) ?? "MEMBER";
  const isAdmin = userRole === "ADMIN";
  const permissionsMap = await loadPermissionsForRole(userRole as "ADMIN" | "LEADER" | "MEMBER");

  return (
    <PermissionsProvider isAdmin={isAdmin} userRole={userRole} permissionsMap={permissionsMap}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0">
          <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
        </main>
      </div>
    </PermissionsProvider>
  );
}
