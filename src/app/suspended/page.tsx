import Link from "next/link";
import { Cross, AlertTriangle } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#06080F" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #2d1a1a 0%, #06080F 65%)",
        }}
      />
      <div className="relative text-center px-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Cross className="w-3 h-3 text-indigo-400" />
          <p className="text-[11px] tracking-[4px] uppercase text-indigo-400/70">Ovile · Gestão</p>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Acesso suspenso</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          O acesso da sua congregação foi temporariamente suspenso.
          Entre em contato com o suporte para regularizar a situação.
        </p>
        <Link
          href="mailto:suporte@ovile.com.br"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          Contatar suporte
        </Link>
        <div className="mt-4">
          <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
