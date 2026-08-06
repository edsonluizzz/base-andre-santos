import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}
    >
      <div className="text-center px-4">
        <p className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: "rgba(255,107,4,0.6)" }}>Ovile Eleitoral</p>
        <h1 className="text-6xl font-bold text-white mb-3">404</h1>
        <p className="text-slate-400 text-sm mb-8">Esta página não existe ou foi movida.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "#ff6b04", color: "#0a1220" }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
