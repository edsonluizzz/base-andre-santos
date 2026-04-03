"use client";

import { useState } from "react";
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
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Membros",
    desc: "Cadastro completo com foto, telefone e vinculação de conta Google para cada membro.",
  },
  {
    icon: ClipboardList,
    title: "Chamada",
    desc: "Registro de presença por evento com insights automáticos sobre frequência.",
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    desc: "Controle de ofertas e despesas com relatórios mensais e ranking de contribuintes.",
  },
  {
    icon: Shirt,
    title: "Camisetas e Congressos",
    desc: "Gerencie pedidos, pagamentos e entregas de eventos do início ao fim.",
  },
  {
    icon: Cake,
    title: "Aniversários",
    desc: "Calendário completo com mensagens prontas para enviar no WhatsApp.",
  },
  {
    icon: BarChart2,
    title: "Relatórios",
    desc: "Exportação em PDF diretamente do navegador. Sem dependências externas.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Solicite sua demo",
    desc: "Preencha um formulário rápido com o nome da congregação e seu e-mail. Pronto em segundos.",
  },
  {
    n: "02",
    title: "Acesso imediato",
    desc: "Seu ambiente é criado automaticamente. Você recebe um e-mail de confirmação.",
  },
  {
    n: "03",
    title: "Equipe acessa",
    desc: "Login com conta Google. Sem senhas para lembrar. Seguro e simples.",
  },
];

// ─── Demo Modal ────────────────────────────────────────────────────────────────

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
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar congregação.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] p-8 relative"
        style={{ background: "#0d1117" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tudo pronto!</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              A congregação <strong className="text-white">{form.churchName}</strong> foi criada.
              Faça login com o Google usando o e-mail <strong className="text-white">{form.adminEmail}</strong>.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
            >
              Acessar o sistema
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Solicitar demo gratuita</h3>
              <p className="text-slate-400 text-sm">Seu ambiente é criado em segundos, sem burocracia.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  Nome da congregação *
                </label>
                <input
                  value={form.churchName}
                  onChange={(e) => set("churchName", e.target.value)}
                  placeholder="Ex: UMADC São Paulo"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  Seu nome
                </label>
                <input
                  value={form.adminName}
                  onChange={(e) => set("adminName", e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
                  E-mail (Google) *
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => set("adminEmail", e.target.value)}
                  placeholder="Ex: joao@gmail.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use o mesmo e-mail da sua conta Google para fazer login.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Criando seu acesso...</>
                ) : (
                  <>Criar meu acesso gratuitamente <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#06080F" }}>
      {/* BG gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)",
        }}
      />

      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}

      {/* NAVBAR */}
      <header className="relative z-20 border-b border-white/[0.06]"
        style={{ backdropFilter: "blur(20px)", background: "rgba(6,8,15,0.8)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
              <Cross className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">
              Ovile <span className="text-indigo-400">Gestão</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#recursos" className="text-sm text-slate-400 hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#como-funciona" className="text-sm text-slate-400 hover:text-white transition-colors">
              Como funciona
            </a>
            <button
              onClick={() => setDemoOpen(true)}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
            >
              Solicitar demo
            </button>
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-lg border border-white/[0.08] text-slate-300 hover:text-white hover:border-indigo-500/40 transition-all"
            >
              Entrar
            </Link>
          </nav>

          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.06] px-6 py-4 space-y-3">
            <a href="#recursos" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-400 hover:text-white">Recursos</a>
            <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-400 hover:text-white">Como funciona</a>
            <button onClick={() => { setMobileOpen(false); setDemoOpen(true); }} className="block text-sm text-indigo-400 hover:text-indigo-300">
              Solicitar demo
            </button>
            <Link href="/login" className="block text-sm text-slate-300 hover:text-white">Entrar</Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-indigo-300 tracking-wide">Sistema de gestão para igrejas</span>
        </div>

        <h1
          className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Organize sua congregação{" "}
          <span className="text-indigo-400">com inteligência</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Ovile Gestão centraliza membros, frequência, financeiro, camisetas e
          muito mais em um só lugar. Feito para a realidade da mocidade.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
          >
            Solicitar demo gratuita
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#recursos"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 font-medium text-sm transition-all"
          >
            Ver recursos
          </a>
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
          {[
            "Login com Google",
            "Dados isolados por congregação",
            "Exportação em PDF",
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[3px] uppercase text-indigo-400/70 mb-3">Recursos</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tudo que sua liderança precisa
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/[0.07] p-6 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(15,23,42,0.6)",
                boxShadow: "0 1px 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[3px] uppercase text-indigo-400/70 mb-3">Processo</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Simples de começar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="relative">
              <div
                className="rounded-xl border border-white/[0.07] p-6 h-full"
                style={{ background: "rgba(15,23,42,0.6)" }}
              >
                <p className="text-4xl font-bold text-indigo-500/20 mb-4 font-mono">{step.n}</p>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div
          className="rounded-2xl border border-indigo-500/20 p-10 md:p-16 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.8) 100%)",
          }}
        >
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pronto para começar?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Crie seu acesso agora. Sem burocracia, sem precisar falar com ninguém.
          </p>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
          >
            Criar meu acesso gratuitamente
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
              <Cross className="w-3 h-3 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-400">
              Ovile <span className="text-indigo-400">Gestão</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Desenvolvido pela UMADC Porto Belo · {new Date().getFullYear()}
          </p>
          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Acesso ao sistema →
          </Link>
        </div>
      </footer>
    </div>
  );
}
