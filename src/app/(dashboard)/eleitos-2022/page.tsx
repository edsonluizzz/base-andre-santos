import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { EleitoralPanel } from "./EleitoralPanel";

export const metadata = { title: "Eleitos PR 2022" };

export default async function EleitoralPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Eleitos PR 2022</h1>
          <p className="text-xs lg:text-sm text-muted-foreground truncate">
            Dep. Estadual · Federal · Senador · Governador · Presidente
          </p>
        </div>
      </div>

      <EleitoralPanel />
    </div>
  );
}
