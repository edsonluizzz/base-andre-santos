import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { DisparoForm } from "./DisparoForm";

export const metadata = { title: "Novo disparo WhatsApp" };
export const dynamic = "force-dynamic";

export default async function DispararPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  if (session.user.role !== "ADMIN") redirect("/comunicados");

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Novo disparo WhatsApp</h1>
          <p className="text-xs lg:text-sm text-muted-foreground truncate">
            Envio em massa controlado · com pacing anti-ban
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
          color: "rgba(245,158,11,0.95)",
        }}
      >
        <p className="font-semibold mb-1">⚠️ Anti-ban: padrões recomendados</p>
        <ul className="text-xs space-y-0.5 opacity-90">
          <li>• Delay entre mensagens: <strong>5-10 min</strong> (padrão)</li>
          <li>• Limite diário: <strong>200 mensagens iniciadas/dia</strong></li>
          <li>• Mensagens muito iguais em sequência são detectadas — varie levemente o texto entre disparos</li>
          <li>• Se o número estiver em soft-ban recente, comece com 50/dia e suba gradualmente</li>
        </ul>
      </div>

      <DisparoForm />
    </div>
  );
}
