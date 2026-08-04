import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MeuPerfilForm } from "./meu-perfil-form";

export default async function MeuPerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <MeuPerfilForm
      sessionName={session.user.name ?? ""}
      sessionEmail={session.user.email ?? ""}
      sessionImage={session.user.image ?? ""}
    />
  );
}
