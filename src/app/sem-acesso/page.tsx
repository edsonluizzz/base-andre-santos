import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}
    >
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div>
          <p className="text-xs tracking-[3px] uppercase mb-2" style={{ color: "rgba(212,175,55,0.7)" }}>
            Ovile Eleitoral
          </p>
          <h1 className="text-2xl font-bold text-white">Acesso restrito</h1>
          <p className="text-slate-400 mt-3 leading-relaxed text-sm">
            Este sistema é de uso exclusivo da equipe de apoio de André Santos.
            Para ter acesso, você precisa ser convidado pelo administrador.
          </p>
        </div>

        <div className="rounded-2xl px-5 py-4 text-sm text-slate-400 space-y-2 text-left"
          style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="font-medium text-white">Como obter acesso?</p>
          <p>• Fale com um coordenador ou administrador da base</p>
          <p>• Informe seu Gmail para que possam te convidar</p>
          <p>• Após o convite, faça login com o mesmo Gmail</p>
        </div>

        <Link
          href="/login"
          className="block text-sm rounded-xl py-3 px-6 transition-all"
          style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#d4af37" }}
        >
          Tentar com outra conta Google
        </Link>
      </div>
    </div>
  );
}
