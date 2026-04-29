import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CompletarPerfilForm } from "./completar-perfil-form";

export default async function CompletarPerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const collaborator = await db.collaborator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, phone: true, city: true, neighborhood: true, profile: true, name: true },
  });

  // Se já tem telefone preenchido → cadastro completo, vai ao dashboard
  if (collaborator?.phone) redirect("/dashboard");

  return (
    <CompletarPerfilForm
      userId={session.user.id}
      defaultName={session.user.name ?? ""}
      defaultEmail={session.user.email ?? ""}
    />
  );
}
