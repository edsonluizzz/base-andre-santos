import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NovaCampanhaForm } from "./NovaCampanhaForm";

export const metadata = { title: "Nova Campanha — ISSACAR.IA" };

export default async function NovaCampanhaPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/dashboard");

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nova Campanha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crie um novo tenant no ISSACAR.IA. Após criar, inicialize o banco com{" "}
          <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
            DATABASE_URL=&lt;url&gt; npx prisma db push
          </code>
        </p>
      </div>
      <NovaCampanhaForm />
    </div>
  );
}
