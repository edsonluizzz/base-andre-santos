"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  DollarSign,
  Shirt,
  Cake,
  BarChart2,
  CheckCircle,
  Menu,
  X,
  ArrowRight,
  Cross,
  Loader2,
  PartyPopper,
  Music2,
  Shield,
  Zap,
  Check,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ── Scroll animation hook ─────────────────────────────────────────────────────

function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Users,       title: "Membros",      color: "#a5b4fc", bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.3)",  desc: "Cadastro completo com foto, telefone e vinculação de conta Google para cada membro." },
  { icon: ClipboardList,title: "Chamada",     color: "#c4b5fd", bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)",  desc: "Registro de presença por evento com insights automáticos de frequência e ranking." },
  { icon: DollarSign,  title: "Financeiro",   color: "#6ee7b7", bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.3)", desc: "Controle de ofertas e despesas com DRE mensal automático e exportação em PDF." },
  { icon: Shirt,       title: "Congressos",   color: "#fcd34d", bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.3)", desc: "Pedidos de camisetas, controle de pagamentos e entregas do início ao fim." },
  { icon: Cake,        title: "Aniversários", color: "#fda4af", bg: "rgba(251,113,133,0.15)", border: "rgba(251,113,133,0.3)",desc: "Calendário mensal com atalho direto para enviar mensagem no WhatsApp." },
  { icon: BarChart2,   title: "Relatórios",   color: "#7dd3fc", bg: "rgba(56,189,248,0.15)",  border: "rgba(56,189,248,0.3)", desc: "Exportação em PDF direto do navegador. Sem dependências externas." },
];

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    desc: "Para conhecer o sistema",
    highlight: false,
    cta: "Começar grátis",
    features: ["Até 30 membros", "Chamada e eventos", "Financeiro básico", "Aniversários"],
    missing: ["Relatórios PDF", "Módulo Ministérios", "Camisetas e Congressos", "Suporte prioritário"],
  },
  {
    name: "Pro",
    price: "R$ 19,90",
    period: "/mês",
    desc: "Para congregações em crescimento",
    highlight: true,
    cta: "Assinar agora",
    features: [
      "Membros ilimitados",
      "Financeiro completo",
      "Relatórios e exportação PDF",
      "Módulo de Ministérios",
      "Camisetas e Congressos",
      "Portal do membro",
      "Suporte prioritário",
    ],
    missing: [],
  },
  {
    name: "Institucional",
    price: "Sob consulta",
    period: "",
    desc: "Múltiplas congregações",
    highlight: false,
    cta: "Falar com a equipe",
    features: [
      "Tudo do plano Pro",
      "Múltiplas congregações",
      "Painel administrativo central",
      "Relatórios consolidados",
      "Suporte dedicado",
      "Treinamento incluído",
    ],
    missing: [],
  },
];

const STEPS = [
  { n: "01", title: "Solicite acesso", desc: "Preencha o nome da congregação e seu e-mail Google. Pronto em 30 segundos." },
  { n: "02", title: "Ambiente criado", desc: "Seu espaço é configurado automaticamente. Dados isolados e seguros desde o início." },
  { n: "03", title: "Equipe online", desc: "Membros entram com conta Google. Sem senhas. Permissões por cargo (Líder / Membro)." },
];

// ── Dashboard mockup ──────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-3xl mx-auto select-none pointer-events-none">
      <div className="absolute inset-x-16 -bottom-6 h-24 rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(ellipse, #6366F1, transparent 70%)" }} />
      <div style={{ perspective: "1100px" }}>
        <div style={{ transform: "rotateX(5deg)", transformOrigin: "50% 100%" }}>
          {/* Screen bezel */}
          <div className="rounded-t-2xl overflow-hidden" style={{ border: "3px solid #1e2030", background: "#13141f", boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
            {/* Camera bar */}
            <div className="flex justify-center items-center" style={{ height: "18px", background: "#0c0d18", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#252535" }} />
            </div>
            {/* App */}
            <div className="flex" style={{ height: "340px", background: "#0d1128" }}>
              {/* Sidebar */}
              <div className="flex flex-col items-center gap-2 py-3" style={{ width: "44px", background: "rgba(10,14,36,0.95)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: "28px", height: "28px", background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.45)" }}>
                  <Cross style={{ width: "11px", height: "11px", color: "#a5b4fc" }} />
                </div>
                {[LayoutDashboard, Users, ClipboardList, DollarSign, BarChart2, Music2].map((Icon, i) => (
                  <div key={i} className="flex items-center justify-center rounded-lg" style={{ width: "30px", height: "30px", background: i === 0 ? "rgba(99,102,241,0.2)" : "transparent", border: i === 0 ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent" }}>
                    <Icon style={{ width: "13px", height: "13px", color: i === 0 ? "#a5b4fc" : "#4b6280" }} />
                  </div>
                ))}
              </div>
              {/* Main */}
              <div className="flex-1 overflow-hidden" style={{ padding: "14px" }}>
                {/* Page header */}
                <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>Dashboard</p>
                    <p style={{ fontSize: "8px", color: "#475569" }}>Visão geral da congregação</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }} />
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-1.5" style={{ marginBottom: "10px" }}>
                  {[
                    { label: "Membros",   value: "48",     color: "#a5b4fc" },
                    { label: "Presença",  value: "87%",    color: "#6ee7b7" },
                    { label: "Ofertas",   value: "R$3.2k", color: "#fcd34d" },
                    { label: "Eventos",   value: "12",     color: "#c4b5fd" },
                  ].map((s) => (
                    <div key={s.label} style={{ borderRadius: "8px", padding: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <p style={{ fontSize: "7px", color: "#94a3b8", marginBottom: "3px" }}>{s.label}</p>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div style={{ borderRadius: "8px", padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", marginBottom: "8px" }}>
                  <p style={{ fontSize: "7px", color: "#94a3b8", marginBottom: "6px" }}>Presença — últimos 6 meses</p>
                  <div className="flex items-end gap-1" style={{ height: "44px" }}>
                    {[62, 78, 52, 90, 68, 85].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? "rgba(99,102,241,0.9)" : "rgba(99,102,241,0.45)" }} />
                    ))}
                  </div>
                </div>
                {/* Members */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[{ name: "João Silva", role: "Líder" }, { name: "Maria Lima", role: "Membro" }, { name: "Pedro Ramos", role: "Líder" }].map((m) => (
                    <div key={m.name} className="flex items-center gap-1.5" style={{ borderRadius: "8px", padding: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(99,102,241,0.35)", border: "1px solid rgba(99,102,241,0.5)", flexShrink: 0 }} />
                      <div style={{ overflow: "hidden" }}>
                        <p style={{ fontSize: "7px", color: "#e2e8f0", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</p>
                        <p style={{ fontSize: "6px", color: "#64748b" }}>{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Base */}
          <div style={{ height: "9px", background: "linear-gradient(to bottom, #1a1a2e, #12121e)", borderRadius: "0 0 2px 2px", margin: "0 2px" }} />
          <div style={{ height: "5px", background: "#0e0e18", borderRadius: "0 0 20px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.9)" }} />
        </div>
      </div>
    </div>
  );
}

// ── Phone mockup ──────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative select-none pointer-events-none" style={{ width: "130px" }}>
      <div style={{ borderRadius: "28px", overflow: "hidden", border: "2.5px solid #1e2030", background: "#13141f", boxShadow: "0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
        <div className="flex justify-center items-center" style={{ height: "20px", background: "#0c0d18" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "4px", background: "#1e1e30" }} />
        </div>
        <div style={{ background: "#0d1128", padding: "10px", minHeight: "240px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: "10px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(99,102,241,0.35)", border: "1px solid rgba(99,102,241,0.5)" }} />
            <div>
              <p style={{ fontSize: "8px", color: "#f1f5f9", fontWeight: 600 }}>Meu Portal</p>
              <p style={{ fontSize: "6px", color: "#64748b" }}>João Silva</p>
            </div>
          </div>
          <div style={{ borderRadius: "10px", padding: "8px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)", marginBottom: "8px" }}>
            <p style={{ fontSize: "6px", color: "#a5b4fc", marginBottom: "2px" }}>SEU RANKING</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", lineHeight: 1 }}>3º</p>
            <p style={{ fontSize: "6px", color: "#94a3b8" }}>de 48 membros</p>
          </div>
          {[{ label: "Presenças", value: "28", color: "#6ee7b7" }, { label: "Ausências", value: "4", color: "#fca5a5" }].map((s) => (
            <div key={s.label} className="flex items-center justify-between" style={{ borderRadius: "8px", padding: "6px 8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "4px" }}>
              <span style={{ fontSize: "7px", color: "#94a3b8" }}>{s.label}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
          <p style={{ fontSize: "6px", color: "#64748b", margin: "8px 0 4px" }}>PRÓXIMOS EVENTOS</p>
          {["Culto — Sex 18/04", "Ensaio — Sáb 19/04"].map((e) => (
            <div key={e} style={{ borderRadius: "6px", padding: "5px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "3px" }}>
              <span style={{ fontSize: "6px", color: "#94a3b8" }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Demo Modal ────────────────────────────────────────────────────────────────

function DemoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ churchName: "", adminName: "", adminEmail: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.churchName.trim() || !form.adminEmail.trim()) {
      setError("Nome da congregação e e-mail são obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Erro ao criar congregação.");
      else setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl relative" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 64px rgba(0,0,0,0.8)" }}>
        {/* Top accent */}
        <div className="h-px rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />
        <div className="p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <PartyPopper className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tudo pronto!</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                <span className="text-white font-medium">{form.churchName}</span> foi criada com sucesso.
                Faça login com o Google usando <span className="text-white font-medium">{form.adminEmail}</span>.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                Acessar o sistema <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Solicitar acesso gratuito</h3>
                  <p className="text-slate-500 text-sm">Ambiente criado em segundos</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { field: "churchName", label: "Nome da congregação *", placeholder: "Ex: Igreja Central de São Paulo", type: "text" },
                  { field: "adminName",  label: "Seu nome",              placeholder: "Ex: João Silva",                 type: "text" },
                  { field: "adminEmail", label: "E-mail Google *",       placeholder: "Ex: joao@gmail.com",             type: "email" },
                ].map(({ field, label, placeholder, type }) => (
                  <div key={field}>
                    <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
                    <input
                      type={type}
                      value={form[field as keyof typeof form]}
                      onChange={(e) => set(field, e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                ))}

                {error && (
                  <p className="text-sm text-red-400 rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: loading ? "none" : "0 4px 16px rgba(99,102,241,0.3)" }}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando seu acesso...</> : <>Criar meu acesso gratuitamente <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-xs text-slate-600">
                  Sem cartão de crédito · Cancele quando quiser
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FadeIn wrapper ────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#0c0f1d" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heroFade { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow { 0%,100% { opacity:.15; } 50% { opacity:.25; } }
        .hero-anim { animation: heroFade 0.8s ease forwards; }
        .hero-anim-1 { animation: heroFade 0.8s ease 0.1s backwards; }
        .hero-anim-2 { animation: heroFade 0.8s ease 0.25s backwards; }
        .hero-anim-3 { animation: heroFade 0.8s ease 0.4s backwards; }
        .hero-anim-4 { animation: heroFade 0.8s ease 0.55s backwards; }
        .hero-anim-5 { animation: heroFade 0.8s ease 0.75s backwards; }
        .glow-pulse   { animation: pulse-glow 4s ease-in-out infinite; }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
      ` }} />

      {/* Background radial */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(60,70,160,0.55) 0%, transparent 65%)" }} />
      <div className="glow-pulse fixed pointer-events-none" style={{ top: "-20%", left: "30%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)", zIndex: 0 }} />

      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}

      {/* ── NAVBAR ── */}
      <header className="relative z-20 sticky top-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", background: "rgba(6,8,15,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-xl" style={{ width: "32px", height: "32px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <Cross className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">
              Ovile <span className="text-indigo-400">Gestão</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[["#recursos", "Recursos"], ["#como-funciona", "Como funciona"], ["#planos", "Planos"]].map(([href, label]) => (
              <a key={href} href={href} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors hover:bg-white/[0.04]">{label}</a>
            ))}
            <div className="w-px h-4 mx-2" style={{ background: "rgba(255,255,255,0.08)" }} />
            <button onClick={() => setDemoOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              Solicitar demo
            </button>
            <Link href="/login" className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Entrar
            </Link>
          </nav>

          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-6 py-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[["#recursos", "Recursos"], ["#como-funciona", "Como funciona"], ["#planos", "Planos"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white">{label}</a>
            ))}
            <button onClick={() => { setMobileOpen(false); setDemoOpen(true); }} className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              Solicitar demo
            </button>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 rounded-xl text-sm text-slate-300" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Entrar
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12 text-center">
        <div className="hero-anim-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 cursor-pointer" style={{ border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.06)" }} onClick={() => setDemoOpen(true)}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.6)" }} />
          <span className="text-xs text-indigo-300 tracking-wide">Novo: Módulo de Ministérios disponível</span>
          <ChevronRight className="w-3 h-3 text-indigo-400" />
        </div>

        <h1 className="hero-anim-2 text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05]" style={{ fontFamily: "var(--font-heading)" }}>
          Gerencie sua igreja{" "}
          <span style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            com inteligência
          </span>
        </h1>

        <p className="hero-anim-3 text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Ovile Gestão centraliza membros, frequência, financeiro, ministérios e muito mais
          em uma plataforma feita para a realidade da liderança evangélica brasileira.
        </p>

        <div className="hero-anim-4 flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button onClick={() => setDemoOpen(true)} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
            Solicitar demo gratuita <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#recursos" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-slate-300 hover:text-white font-medium text-sm transition-all" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            Ver recursos
          </a>
        </div>

        <div className="hero-anim-4 flex flex-wrap items-center justify-center gap-5 mb-16">
          {["Login com Google", "Dados isolados por congregação", "Exportação em PDF"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{t}
            </span>
          ))}
        </div>

        {/* Laptop mockup */}
        <div className="hero-anim-5">
          <DashboardMockup />
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <div className="relative z-10 py-10" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { value: "50+",    label: "Congregações ativas" },
            { value: "5.000+", label: "Membros gerenciados" },
            { value: "99.9%",  label: "Disponibilidade" },
            { value: "R$ 0",   label: "Para começar" },
          ].map((s) => (
            <div key={s.label} className="px-6">
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="recursos" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[4px] uppercase text-indigo-400/70 mb-3">Recursos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Tudo que sua liderança precisa
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">
            Cada módulo foi pensado para simplificar o dia a dia da gestão, sem curva de aprendizado.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 80}>
              <div className="card-hover h-full rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 1px 1px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── DEVICES ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="rounded-3xl overflow-hidden flex flex-col lg:flex-row" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {/* Left */}
          <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
            <FadeIn>
              <p className="text-xs tracking-[4px] uppercase text-indigo-400/70 mb-4">Acesse de qualquer lugar</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Desktop, celular ou tablet
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Interface totalmente responsiva. Líderes gerenciam pelo computador,
                membros consultam pelo celular. Cada um vê apenas o que é relevante para seu perfil.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Shield, text: "Permissões por cargo: Admin, Líder, Membro" },
                  { icon: Zap,    text: "Login com Google — sem senhas para lembrar" },
                  { icon: Users,  text: "Portal individual com ranking de presença" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <Icon className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <p className="text-sm text-slate-400">{text}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
          {/* Right — devices */}
          <div className="lg:w-1/2 flex items-center justify-center p-10 gap-6 relative">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.08), transparent 70%)" }} />
            <div className="flex items-end gap-6 relative z-10">
              <FadeIn delay={150}>
                <PhoneMockup />
              </FadeIn>
              {/* iPad mockup */}
              <FadeIn delay={300}>
                <div className="select-none pointer-events-none" style={{ width: "180px" }}>
                  <div style={{ borderRadius: "20px", overflow: "hidden", border: "2.5px solid #1e2030", background: "#13141f", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
                    <div className="flex justify-center items-center" style={{ height: "16px", background: "#0c0d18" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1e1e30" }} />
                    </div>
                    <div style={{ background: "#0d1128", padding: "10px", minHeight: "230px" }}>
                      <p style={{ fontSize: "8px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>Chamada — Culto 15/04</p>
                      {[
                        { name: "João Silva",  status: "P" },
                        { name: "Maria Lima",  status: "P" },
                        { name: "Pedro Ramos", status: "F" },
                        { name: "Ana Costa",   status: "P" },
                        { name: "Lucas Melo",  status: "J" },
                      ].map((m) => (
                        <div key={m.name} className="flex items-center justify-between" style={{ borderRadius: "8px", padding: "5px 8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "4px" }}>
                          <div className="flex items-center gap-2">
                            <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(99,102,241,0.35)", border: "1px solid rgba(99,102,241,0.5)" }} />
                            <span style={{ fontSize: "7px", color: "#cbd5e1" }}>{m.name}</span>
                          </div>
                          <span style={{ fontSize: "7px", fontWeight: 700, color: m.status === "P" ? "#6ee7b7" : m.status === "F" ? "#fca5a5" : "#fcd34d", background: m.status === "P" ? "rgba(52,211,153,0.15)" : m.status === "F" ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)", padding: "2px 6px", borderRadius: "4px" }}>{m.status === "P" ? "Presente" : m.status === "F" ? "Faltou" : "Justific."}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between" style={{ marginTop: "8px", padding: "5px 8px", borderRadius: "8px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.28)" }}>
                        <span style={{ fontSize: "7px", color: "#a5b4fc" }}>Frequência geral</span>
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#a5b4fc" }}>80%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[4px] uppercase text-indigo-400/70 mb-3">Processo</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Simples de começar
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 100}>
              <div className="h-full rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-5xl font-bold mb-5 font-mono" style={{ color: "rgba(99,102,241,0.18)" }}>{step.n}</p>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="planos" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <FadeIn className="text-center mb-16">
          <p className="text-xs tracking-[4px] uppercase text-indigo-400/70 mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Preço justo para cada etapa
          </h2>
          <p className="text-slate-500 mt-3 text-sm">Comece grátis, cresça quando precisar.</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 100}>
              <div className={`h-full rounded-2xl flex flex-col ${plan.highlight ? "relative" : ""}`}
                style={{
                  background: plan.highlight ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  border: plan.highlight ? "1px solid rgba(99,102,241,0.45)" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: plan.highlight ? "0 0 48px rgba(99,102,241,0.12)" : "none",
                }}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                      Mais popular
                    </span>
                  </div>
                )}
                {plan.highlight && <div className="h-px w-full rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />}
                <div className="p-7 flex-1 flex flex-col">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>{plan.price}</span>
                    <span className="text-slate-500 text-sm mb-1">{plan.period}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-7">{plan.desc}</p>

                  <div className="space-y-2.5 flex-1 mb-7">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="text-sm text-slate-300">{f}</span>
                      </div>
                    ))}
                    {plan.missing.map((f) => (
                      <div key={f} className="flex items-center gap-2.5 opacity-30">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <X className="w-2.5 h-2.5 text-slate-500" />
                        </div>
                        <span className="text-sm text-slate-500">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setDemoOpen(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={plan.highlight
                      ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <FadeIn>
          <div className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1), transparent 65%)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-64" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mx-auto mb-6" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                Pronto para começar?
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Crie o ambiente da sua congregação agora mesmo. Sem burocracia,
                sem cartão de crédito, sem precisar falar com ninguém.
              </p>
              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}
              >
                Criar meu acesso gratuitamente <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-slate-600 mt-4">Sem compromisso · Cancele quando quiser</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 px-6 py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-lg" style={{ width: "26px", height: "26px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <Cross className="w-3 h-3 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-400">
              Ovile <span className="text-indigo-400">Gestão</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            {[["#recursos", "Recursos"], ["#planos", "Planos"], ["#como-funciona", "Como funciona"]].map(([href, label]) => (
              <a key={href} href={href} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <p className="text-xs text-slate-700">ovile.com.br · {new Date().getFullYear()}</p>
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Acesso ao sistema →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
