import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Ovile Eleitoral",
  description: "Gestão de base eleitoral",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0a1220" }}>
      <div className="flex flex-col items-center gap-8 text-center px-6">

        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}
        >
          <span className="text-2xl font-bold" style={{ color: "#d4af37" }}>O</span>
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Ovile Eleitoral</h1>
          <p className="text-slate-400 text-base">Gestão de base eleitoral</p>
        </div>

        {/* CTA */}
        <Link
          href="/entrar"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "#d4af37", color: "#0a1220" }}
        >
          Acessar o sistema
          <ArrowRight className="w-4 h-4" />
        </Link>

      </div>

      <p className="absolute bottom-6 text-xs text-slate-600">
        © {new Date().getFullYear()} Ovile Eleitoral
      </p>
    </div>
  );
}
