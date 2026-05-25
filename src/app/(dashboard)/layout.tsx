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
  const serverName  = session.user.name  ?? "";
  const serverImage = session.user.image ?? "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <div className="hidden-print">
          <Sidebar serverRole={role} serverIsSuperAdmin={isSuperAdmin} serverName={serverName} serverImage={serverImage} />
        </div>
        <SidebarMainWrapper>{children}</SidebarMainWrapper>
      </div>
    </SidebarProvider>
  );
}
