import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NovaCampanhaForm } from "./NovaCampanhaForm";

export const metadata = { title: "Nova Campanha — Ovile Eleitoral" };

export default async function NovaCampanhaPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/dashboard");

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title">Nova Campanha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crie um novo tenant no Ovile Eleitoral. Após criar, inicialize o banco com{" "}
          <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
            DATABASE_URL=&lt;url&gt; npx prisma db push
          </code>
        </p>
      </div>
      <NovaCampanhaForm />
    </div>
  );
}
