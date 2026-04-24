import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function SuperAdminPage() {
  const session = await auth();
  const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
  if (!isSuperAdmin) redirect("/dashboard");

  const [users, collaborators] = await Promise.all([
    db.user.count(),
    db.collaborator.count({ where: { campaignId: "andre-santos-2026" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="glass-card rounded-xl p-4 border border-white/[0.08] text-center">
          <p className="text-2xl font-bold text-primary">{users}</p>
          <p className="text-xs text-muted-foreground mt-1">Usuários</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/[0.08] text-center">
          <p className="text-2xl font-bold text-primary">{collaborators}</p>
          <p className="text-xs text-muted-foreground mt-1">Colaboradores</p>
        </div>
      </div>
    </div>
  );
}
