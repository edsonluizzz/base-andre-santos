import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { EleitoralPanel } from "./EleitoralPanel";

export const metadata = { title: "Eleitos PR 2022" };

export default async function EleitoralPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Eleitos PR 2022</h1>
          <p className="text-sm text-muted-foreground">
            Dep. Estadual · Dep. Federal · Senador · Governador · Presidente
          </p>
        </div>
      </div>

      <EleitoralPanel />
    </div>
  );
}
