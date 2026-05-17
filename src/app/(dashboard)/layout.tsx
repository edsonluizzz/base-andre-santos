import { Sidebar } from "@/components/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user.role ?? "MEMBER") as string;
  const isSuperAdmin = Boolean((session.user as { isSuperAdmin?: boolean }).isSuperAdmin);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden-print">
        <Sidebar serverRole={role} serverIsSuperAdmin={isSuperAdmin} />
      </div>
      <main className="flex-1 lg:ml-64 min-w-0 overflow-x-hidden">
        <div className="pt-16 px-4 pb-24 md:pl-16 md:pr-6 lg:p-8 animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out fill-mode-both">
          {children}
        </div>
      </main>
    </div>
  );
}
