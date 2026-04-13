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
  { icon: Users,        title: "Membros",      color: "#a5b4fc", bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.3)",  desc: "Tenha todos os dados dos membros na palma da mão, com foto, contato rápido e histórico completo." },
  { icon: ClipboardList,title: "Chamada",      color: "#c4b5fd", bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.3)",  desc: "Identifique membros ausentes e combata a evasão antes que aconteça, com um clique." },
  { icon: DollarSign,   title: "Financeiro",   color: "#6ee7b7", bg: "rgba(52,211,153,0.15)",   border: "rgba(52,211,153,0.3)",  desc: "Transparência total. Gere relatórios financeiros claros e DRE automático para prestar contas em segundos." },
  { icon: Shirt,        title: "Congressos",   color: "#fcd34d", bg: "rgba(251,191,36,0.15)",   border: "rgba(251,191,36,0.3)",  desc: "Fim da bagunça nos pedidos de camisetas. Controle tamanhos, pagamentos e entregas sem estresse." },
  { icon: Cake,         title: "Aniversários", color: "#fda4af", bg: "rgba(251,113,133,0.15)",  border: "rgba(251,113,133,0.3)", desc: "Nunca mais esqueça um aniversário. Receba notificações e envie parabéns no WhatsApp com um toque." },
  { icon: BarChart2,    title: "Relatórios",   color: "#7dd3fc", bg: "rgba(56,189,248,0.15)",   border: "rgba(56,189,248,0.3)",  desc: "Relatórios profissionais em PDF para prestar contas à liderança com agilidade e precisão." },
];

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    desc: "Para conhecer o sistema",
    highlight: false,
    cta: "Começar grátis",
    features: ["Até 10 membros", "Chamada e eventos", "Financeiro básico", "Aniversários"],
    missing: ["Relatórios PDF", "Módulo Ministérios", "Camisetas e Congressos", "Suporte prioritário"],
  },
  {
    name: "Pro",
    price: "R$ 29,99",
    period: "/mês",
    desc: "Tudo o que você precisa para automatizar sua rotina",
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

// ── Dashboard mockup animado ──────────────────────────────────────────────────

const BAR_HEIGHTS = [62, 78, 52, 90, 68, 85];
const STATS = [
  { label: "Membros",  value: "48",     color: "#a5b4fc" },
  { label: "Presença", value: "87%",    color: "#6ee7b7" },
  { label: "Ofertas",  value: "R$3.2k", color: "#fcd34d" },
  { label: "Eventos",  value: "12",     color: "#c4b5fd" },
];

function DashboardMockup() {
  const [ready, setReady] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setReady(true), 500);
    const t2 = setTimeout(() => setStatsVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="relative w-full max-w-3xl mx-auto select-none pointer-events-none"
      style={{ animation: "floatY 7s ease-in-out infinite" }}
    >
      {/* Glow shadow that pulses with float */}
      <div
        className="absolute inset-x-16 -bottom-6 h-24 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #6366F1, transparent 70%)",
          animation: "shadowPulse 7s ease-in-out infinite",
        }}
      />

      <div style={{ perspective: "1100px" }}>
        <div style={{ transform: "rotateX(5deg)", transformOrigin: "50% 100%" }}>
          {/* Screen bezel — skeuomorphic */}
          <div
            className="rounded-t-2xl overflow-hidden"
            style={{
              border: "2px solid #252540",
              background: "linear-gradient(160deg, #1a1b30 0%, #0e0f1e 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.9), 0 60px 120px rgba(0,0,0,0.7)",
            }}
          >
            {/* Camera bar */}
            <div
              className="flex justify-center items-center"
              style={{
                height: "18px",
                background: "linear-gradient(180deg, #0a0b16 0%, #0c0d18 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "radial-gradient(circle, #2a2a42, #1a1a2e)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)" }} />
            </div>

            {/* App */}
            <div
              className="flex"
              style={{
                height: "340px",
                background: "linear-gradient(160deg, #0f1228 0%, #0a0e22 100%)",
              }}
            >
              {/* Sidebar — skeuomorphic */}
              <div
                className="flex flex-col items-center gap-2 py-3"
                style={{
                  width: "44px",
                  background: "linear-gradient(180deg, rgba(10,12,28,0.98) 0%, rgba(8,10,22,0.98) 100%)",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "inset -1px 0 0 rgba(0,0,0,0.4), 1px 0 8px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-lg mb-2"
                  style={{
                    width: "28px", height: "28px",
                    background: "linear-gradient(145deg, rgba(120,124,255,0.35) 0%, rgba(80,85,220,0.2) 100%)",
                    border: "1px solid rgba(99,102,241,0.5)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(99,102,241,0.25)",
                  }}
                >
                  <Cross style={{ width: "11px", height: "11px", color: "#a5b4fc" }} />
                </div>
                {[LayoutDashboard, Users, ClipboardList, DollarSign, BarChart2, Music2].map((Icon, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: "30px", height: "30px",
                      background: i === 0 ? "linear-gradient(145deg, rgba(99,102,241,0.3), rgba(80,83,200,0.15))" : "transparent",
                      border: i === 0 ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                      boxShadow: i === 0 ? "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(99,102,241,0.2)" : "none",
                    }}
                  >
                    <Icon style={{ width: "13px", height: "13px", color: i === 0 ? "#a5b4fc" : "#3a4e66" }} />
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-hidden" style={{ padding: "14px" }}>
                {/* Page header */}
                <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>Dashboard</p>
                    <p style={{ fontSize: "8px", color: "#475569" }}>Visão geral da congregação</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "6px", padding: "2px 5px" }}>
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#6ee7b7", animation: "liveBlip 2s ease-in-out infinite" }} />
                      <span style={{ fontSize: "6px", color: "#6ee7b7", fontWeight: 600 }}>AO VIVO</span>
                    </div>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(99,102,241,0.35), rgba(80,83,200,0.2))", border: "1px solid rgba(99,102,241,0.35)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }} />
                  </div>
                </div>

                {/* Stats — animated fade in */}
                <div className="grid grid-cols-4 gap-1.5" style={{ marginBottom: "10px" }}>
                  {STATS.map((s, i) => (
                    <div
                      key={s.label}
                      style={{
                        borderRadius: "8px",
                        padding: "8px",
                        background: "linear-gradient(145deg, rgba(28,32,58,0.95) 0%, rgba(18,22,44,0.98) 100%)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.4)",
                        opacity: statsVisible ? 1 : 0,
                        transform: statsVisible ? "translateY(0)" : "translateY(6px)",
                        transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                      }}
                    >
                      <p style={{ fontSize: "7px", color: "#64748b", marginBottom: "3px" }}>{s.label}</p>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: s.color, textShadow: `0 0 8px ${s.color}40` }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart — bars grow */}
                <div
                  style={{
                    borderRadius: "8px",
                    padding: "10px",
                    background: "linear-gradient(145deg, rgba(22,26,50,0.95) 0%, rgba(14,18,38,0.98) 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.5)",
                    marginBottom: "8px",
                  }}
                >
                  <p style={{ fontSize: "7px", color: "#64748b", marginBottom: "6px" }}>Presença — últimos 6 meses</p>
                  <div className="flex items-end gap-1" style={{ height: "44px" }}>
                    {BAR_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: ready ? `${h}%` : "0%",
                          background: i === 5
                            ? "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)"
                            : "linear-gradient(180deg, rgba(129,140,248,0.65) 0%, rgba(99,102,241,0.35) 100%)",
                          boxShadow: i === 5 ? "0 0 6px rgba(99,102,241,0.5)" : "none",
                          transition: `height 0.7s cubic-bezier(0.34,1.4,0.64,1) ${i * 90}ms`,
                          borderRadius: "2px 2px 0 0",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Members */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[{ name: "João Silva", role: "Líder" }, { name: "Maria Lima", role: "Membro" }, { name: "Pedro Ramos", role: "Líder" }].map((m, i) => (
                    <div
                      key={m.name}
                      className="flex items-center gap-1.5"
                      style={{
                        borderRadius: "8px",
                        padding: "6px",
                        background: "linear-gradient(145deg, rgba(22,26,50,0.95) 0%, rgba(14,18,38,0.98) 100%)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.4)",
                        opacity: statsVisible ? 1 : 0,
                        transform: statsVisible ? "translateY(0)" : "translateY(4px)",
                        transition: `opacity 0.5s ease ${300 + i * 80}ms, transform 0.5s ease ${300 + i * 80}ms`,
                      }}
                    >
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(129,140,248,0.5), rgba(99,102,241,0.25))", border: "1px solid rgba(99,102,241,0.5)", flexShrink: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }} />
                      <div style={{ overflow: "hidden" }}>
                        <p style={{ fontSize: "7px", color: "#e2e8f0", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</p>
                        <p style={{ fontSize: "6px", color: "#475569" }}>{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Laptop base — skeuomorphic */}
          <div style={{ height: "10px", background: "linear-gradient(180deg, #1e1f36 0%, #141525 100%)", borderRadius: "0 0 3px 3px", margin: "0 2px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }} />
          <div style={{ height: "5px", background: "linear-gradient(180deg, #0e0e1e 0%, #09091a 100%)", borderRadius: "0 0 24px 24px", boxShadow: "0 12px 40px rgba(0,0,0,0.9), 0 20px 60px rgba(0,0,0,0.6)" }} />
        </div>
      </div>
    </div>
  );
}

// ── Phone mockup ──────────────────────────────────────────────────────────────

function PhoneMockup() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative select-none pointer-events-none" style={{ width: "130px" }}>
      <div
        style={{
          borderRadius: "28px",
          overflow: "hidden",
          border: "2px solid #252540",
          background: "linear-gradient(160deg, #1a1b30 0%, #0e0f1e 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.85), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Notch */}
        <div className="flex justify-center items-center" style={{ height: "20px", background: "linear-gradient(180deg, #0a0b16, #0c0d18)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "4px", background: "linear-gradient(180deg, #1e1e32, #16162a)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }} />
        </div>

        <div style={{ background: "linear-gradient(160deg, #0f1228 0%, #0a0e22 100%)", padding: "10px", minHeight: "240px" }}>
          {/* Header */}
          <div className="flex items-center gap-2" style={{ marginBottom: "10px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(129,140,248,0.5), rgba(99,102,241,0.25))", border: "1px solid rgba(99,102,241,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }} />
            <div>
              <p style={{ fontSize: "8px", color: "#f1f5f9", fontWeight: 600 }}>Meu Portal</p>
              <p style={{ fontSize: "6px", color: "#475569" }}>João Silva</p>
            </div>
          </div>

          {/* Ranking card */}
          <div
            style={{
              borderRadius: "10px",
              padding: "8px",
              background: "linear-gradient(145deg, rgba(100,104,255,0.25) 0%, rgba(80,83,220,0.12) 100%)",
              border: "1px solid rgba(99,102,241,0.4)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(99,102,241,0.2)",
              marginBottom: "8px",
              opacity: ready ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
          >
            <p style={{ fontSize: "6px", color: "#a5b4fc", marginBottom: "2px" }}>SEU RANKING</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "white", lineHeight: 1, textShadow: "0 0 20px rgba(165,180,252,0.4)" }}>3º</p>
            <p style={{ fontSize: "6px", color: "#94a3b8" }}>de 48 membros</p>
          </div>

          {[{ label: "Presenças", value: "28", color: "#6ee7b7" }, { label: "Ausências", value: "4", color: "#fca5a5" }].map((s, i) => (
            <div
              key={s.label}
              className="flex items-center justify-between"
              style={{
                borderRadius: "8px",
                padding: "6px 8px",
                background: "linear-gradient(145deg, rgba(22,26,50,0.95) 0%, rgba(14,18,38,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.4)",
                marginBottom: "4px",
                opacity: ready ? 1 : 0,
                transform: ready ? "translateX(0)" : "translateX(8px)",
                transition: `opacity 0.4s ease ${200 + i * 100}ms, transform 0.4s ease ${200 + i * 100}ms`,
              }}
            >
              <span style={{ fontSize: "7px", color: "#64748b" }}>{s.label}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, textShadow: `0 0 6px ${s.color}40` }}>{s.value}</span>
            </div>
          ))}

          <p style={{ fontSize: "6px", color: "#475569", margin: "8px 0 4px" }}>PRÓXIMOS EVENTOS</p>
          {["Culto — Sex 18/04", "Ensaio — Sáb 19/04"].map((e, i) => (
            <div
              key={e}
              style={{
                borderRadius: "6px",
                padding: "5px 8px",
                background: "linear-gradient(145deg, rgba(18,22,42,0.98) 0%, rgba(12,15,30,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 4px rgba(0,0,0,0.4)",
                marginBottom: "3px",
                opacity: ready ? 1 : 0,
                transition: `opacity 0.4s ease ${500 + i * 100}ms`,
              }}
            >
              <span style={{ fontSize: "6px", color: "#64748b" }}>{e}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}>
      <div
        className="w-full max-w-md rounded-2xl relative"
        style={{
          background: "linear-gradient(160deg, #0e1020 0%, #090c1c 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 32px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.5)",
        }}
      >
        <div className="h-px rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.7), transparent)" }} />
        <div className="p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "linear-gradient(145deg, rgba(52,211,153,0.15), rgba(16,185,129,0.06))",
                  border: "1px solid rgba(52,211,153,0.3)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(52,211,153,0.15)",
                }}
              >
                <PartyPopper className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tudo pronto!</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                <span className="text-white font-medium">{form.churchName}</span> foi criada com sucesso.
                Faça login com o Google usando <span className="text-white font-medium">{form.adminEmail}</span>.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all active:translate-y-px"
                style={{
                  background: "linear-gradient(180deg, #7c7ff5 0%, #5355d8 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(99,102,241,0.4)",
                }}
              >
                Acessar o sistema <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(145deg, rgba(120,124,255,0.2), rgba(80,85,220,0.08))",
                    border: "1px solid rgba(99,102,241,0.3)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sua congregação organizada</h3>
                  <p className="text-slate-500 text-sm">Em segundos, dê adeus às planilhas</p>
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
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                      style={{
                        background: "linear-gradient(145deg, rgba(14,18,38,0.98), rgba(10,12,28,0.98))",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,0,0,0.2)",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(99,102,241,0.55)";
                        e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.4), 0 0 0 2px rgba(99,102,241,0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255,255,255,0.08)";
                        e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,0,0,0.2)";
                      }}
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
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all active:translate-y-px disabled:opacity-60"
                  style={{
                    background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(180deg, #7c7ff5 0%, #5355d8 100%)",
                    boxShadow: loading ? "none" : "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 4px 16px rgba(99,102,241,0.35)",
                  }}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando seu acesso...</> : <>Criar minha congregação <ArrowRight className="w-4 h-4" /></>}
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

// ── iPad mockup animado ───────────────────────────────────────────────────────

function IPadMockup() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(t);
  }, []);

  const rows = [
    { name: "João Silva",  status: "P" },
    { name: "Maria Lima",  status: "P" },
    { name: "Pedro Ramos", status: "F" },
    { name: "Ana Costa",   status: "P" },
    { name: "Lucas Melo",  status: "J" },
  ];

  return (
    <div className="select-none pointer-events-none" style={{ width: "180px" }}>
      <div
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          border: "2px solid #252540",
          background: "linear-gradient(160deg, #1a1b30 0%, #0e0f1e 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.6), 0 20px 60px rgba(0,0,0,0.85)",
        }}
      >
        <div className="flex justify-center items-center" style={{ height: "16px", background: "linear-gradient(180deg, #0a0b16, #0c0d18)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.5)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "radial-gradient(circle, #2a2a42, #1a1a2e)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)" }} />
        </div>
        <div style={{ background: "linear-gradient(160deg, #0f1228 0%, #0a0e22 100%)", padding: "10px", minHeight: "230px" }}>
          <p style={{ fontSize: "8px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>Chamada — Culto 15/04</p>
          {rows.map((m, i) => (
            <div
              key={m.name}
              className="flex items-center justify-between"
              style={{
                borderRadius: "8px",
                padding: "5px 8px",
                background: "linear-gradient(145deg, rgba(22,26,50,0.95) 0%, rgba(14,18,38,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.4)",
                marginBottom: "4px",
                opacity: ready ? 1 : 0,
                transform: ready ? "translateX(0)" : "translateX(-8px)",
                transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
              }}
            >
              <div className="flex items-center gap-2">
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(129,140,248,0.5), rgba(99,102,241,0.25))", border: "1px solid rgba(99,102,241,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }} />
                <span style={{ fontSize: "7px", color: "#cbd5e1" }}>{m.name}</span>
              </div>
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 700,
                  color: m.status === "P" ? "#6ee7b7" : m.status === "F" ? "#fca5a5" : "#fcd34d",
                  background: m.status === "P" ? "rgba(52,211,153,0.12)" : m.status === "F" ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.12)",
                  border: `1px solid ${m.status === "P" ? "rgba(52,211,153,0.25)" : m.status === "F" ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.25)"}`,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {m.status === "P" ? "Presente" : m.status === "F" ? "Faltou" : "Justific."}
              </span>
            </div>
          ))}
          <div
            className="flex items-center justify-between"
            style={{
              marginTop: "8px",
              padding: "5px 8px",
              borderRadius: "8px",
              background: "linear-gradient(145deg, rgba(100,104,255,0.2), rgba(80,83,220,0.1))",
              border: "1px solid rgba(99,102,241,0.3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(99,102,241,0.15)",
              opacity: ready ? 1 : 0,
              transition: "opacity 0.4s ease 500ms",
            }}
          >
            <span style={{ fontSize: "7px", color: "#a5b4fc" }}>Frequência geral</span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#a5b4fc", textShadow: "0 0 8px rgba(165,180,252,0.4)" }}>80%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#080b18" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heroFade    { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow  { 0%,100% { opacity:.12; } 50% { opacity:.22; } }
        @keyframes floatY      { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
        @keyframes shadowPulse { 0%,100% { opacity:.28; transform: scaleX(1); } 50% { opacity:.12; transform: scaleX(0.8); } }
        @keyframes liveBlip    { 0%,100% { opacity:1; box-shadow: 0 0 0 2px rgba(52,211,153,0.3); } 50% { opacity:0.4; box-shadow: 0 0 0 4px rgba(52,211,153,0.06); } }
        @keyframes grainShift  { 0% { transform: translate(0,0); } 50% { transform: translate(-1%,-1%); } 100% { transform: translate(0,0); } }

        .hero-anim   { animation: heroFade 0.8s ease forwards; }
        .hero-anim-1 { animation: heroFade 0.8s ease 0.10s backwards; }
        .hero-anim-2 { animation: heroFade 0.8s ease 0.25s backwards; }
        .hero-anim-3 { animation: heroFade 0.8s ease 0.40s backwards; }
        .hero-anim-4 { animation: heroFade 0.8s ease 0.55s backwards; }
        .hero-anim-5 { animation: heroFade 0.8s ease 0.75s backwards; }
        .glow-pulse  { animation: pulse-glow 4s ease-in-out infinite; }

        .skeu-card {
          background: linear-gradient(145deg, rgba(20,24,48,0.97) 0%, rgba(12,15,32,0.99) 100%);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 4px 8px rgba(0,0,0,0.4),
            0 16px 40px rgba(0,0,0,0.55);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .skeu-card:hover {
          transform: translateY(-4px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 8px 20px rgba(0,0,0,0.5),
            0 24px 56px rgba(0,0,0,0.65);
        }

        .skeu-btn {
          background: linear-gradient(180deg, #7c7ff5 0%, #5355d8 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.28),
            inset 0 -2px 0 rgba(0,0,0,0.25),
            0 1px 3px rgba(0,0,0,0.4),
            0 6px 20px rgba(99,102,241,0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .skeu-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.28),
            inset 0 -2px 0 rgba(0,0,0,0.25),
            0 4px 8px rgba(0,0,0,0.4),
            0 12px 28px rgba(99,102,241,0.5);
        }
        .skeu-btn:active {
          transform: translateY(1px);
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.3),
            inset 0 -1px 0 rgba(0,0,0,0.2),
            0 1px 2px rgba(0,0,0,0.3),
            0 2px 8px rgba(99,102,241,0.25);
        }

        .skeu-btn-ghost {
          background: linear-gradient(180deg, rgba(30,34,60,0.8) 0%, rgba(18,22,44,0.9) 100%);
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .skeu-btn-ghost:hover {
          transform: translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 4px 12px rgba(0,0,0,0.4);
        }
        .skeu-btn-ghost:active { transform: translateY(1px); }

        .skeu-icon {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 2px 8px rgba(0,0,0,0.3);
        }
      ` }} />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(50,60,150,0.6) 0%, transparent 65%)" }} />
      <div className="glow-pulse fixed pointer-events-none" style={{ top: "-20%", left: "30%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)", zIndex: 0 }} />

      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}

      {/* ── NAVBAR ── */}
      <header
        className="relative z-20 sticky top-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          background: "rgba(5,7,14,0.88)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.5)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-xl skeu-icon"
              style={{
                width: "32px", height: "32px",
                background: "linear-gradient(145deg, rgba(120,124,255,0.2), rgba(80,85,220,0.08))",
                border: "1px solid rgba(99,102,241,0.35)",
              }}
            >
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
            <button onClick={() => setDemoOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white skeu-btn">
              Solicitar demo
            </button>
            <Link href="/login" className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors skeu-btn-ghost">
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
            <button onClick={() => { setMobileOpen(false); setDemoOpen(true); }} className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium text-white skeu-btn">
              Solicitar demo
            </button>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 rounded-xl text-sm text-slate-300 skeu-btn-ghost">
              Entrar
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12 text-center">
        <div
          className="hero-anim-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 cursor-pointer"
          style={{
            border: "1px solid rgba(99,102,241,0.25)",
            background: "linear-gradient(145deg, rgba(18,22,48,0.95), rgba(12,15,34,0.98))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)",
          }}
          onClick={() => setDemoOpen(true)}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.7)", animation: "liveBlip 2s ease-in-out infinite" }} />
          <span className="text-xs text-indigo-300 tracking-wide">Novo: Módulo de Ministérios disponível</span>
          <ChevronRight className="w-3 h-3 text-indigo-400" />
        </div>

        <h1 className="hero-anim-2 text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.05]" style={{ fontFamily: "var(--font-heading)" }}>
          Organize sua igreja sem{" "}
          <span style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            planilhas confusas
          </span>
        </h1>

        <p className="hero-anim-3 text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Dê adeus à desorganização. Gestão financeira, chamada inteligente e portal de membros 
          em um único sistema feito para lideranças modernas.
        </p>

        <div className="hero-anim-4 flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-sm skeu-btn"
          >
            Começar a organizar agora <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#recursos"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-slate-300 hover:text-white font-medium text-sm skeu-btn-ghost"
          >
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

        {/* Dashboard animado */}
        <div className="hero-anim-5">
          <DashboardMockup />
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <div
        className="relative z-10 py-10"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(10,12,28,0.8) 0%, rgba(8,10,22,0.9) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { value: "100%",   label: "Dados Protegidos" },
            { value: "Suporte", label: "Em Português" },
            { value: "99.9%",  label: "Disponibilidade" },
            { value: "R$ 0",   label: "Para começar" },
          ].map((s) => (
            <div key={s.label} className="px-6">
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)", textShadow: "0 0 20px rgba(165,180,252,0.2)" }}>{s.value}</p>
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
              <div className="skeu-card h-full rounded-2xl p-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 skeu-icon"
                  style={{
                    background: `linear-gradient(145deg, ${f.bg}, rgba(0,0,0,0.1))`,
                    border: `1px solid ${f.border}`,
                  }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color, filter: `drop-shadow(0 0 4px ${f.color}60)` }} />
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
        <div
          className="rounded-3xl overflow-hidden flex flex-col lg:flex-row"
          style={{
            background: "linear-gradient(145deg, rgba(16,20,44,0.98) 0%, rgba(10,13,30,0.99) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.7)",
          }}
        >
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
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 skeu-icon"
                      style={{
                        background: "linear-gradient(145deg, rgba(120,124,255,0.15), rgba(80,85,220,0.06))",
                        border: "1px solid rgba(99,102,241,0.25)",
                      }}
                    >
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
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.07), transparent 70%)" }} />
            <div className="flex items-end gap-6 relative z-10">
              <FadeIn delay={150}>
                <PhoneMockup />
              </FadeIn>
              <FadeIn delay={300}>
                <IPadMockup />
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
              <div
                className="skeu-card h-full rounded-2xl p-7"
              >
                <p
                  className="text-5xl font-bold mb-5 font-mono"
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "1px rgba(99,102,241,0.25)",
                    textShadow: "0 0 30px rgba(99,102,241,0.08)",
                  }}
                >
                  {step.n}
                </p>
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
              <div
                className={`h-full rounded-2xl flex flex-col ${plan.highlight ? "relative" : ""}`}
                style={{
                  background: plan.highlight
                    ? "linear-gradient(145deg, rgba(30,32,75,0.98) 0%, rgba(18,20,55,0.99) 100%)"
                    : "linear-gradient(145deg, rgba(16,20,44,0.98) 0%, rgba(10,13,30,0.99) 100%)",
                  border: plan.highlight ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: plan.highlight
                    ? "inset 0 1px 0 rgba(165,180,252,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.15), 0 24px 60px rgba(0,0,0,0.6)"
                    : "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.5)",
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="px-4 py-1 rounded-full text-xs font-semibold text-white"
                      style={{
                        background: "linear-gradient(180deg, #7c7ff5 0%, #5355d8 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(99,102,241,0.4)",
                      }}
                    >
                      Mais popular
                    </span>
                  </div>
                )}
                {plan.highlight && <div className="h-px w-full rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(165,180,252,0.6), transparent)" }} />}
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
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 skeu-icon"
                          style={{
                            background: "linear-gradient(145deg, rgba(52,211,153,0.18), rgba(16,185,129,0.06))",
                            border: "1px solid rgba(52,211,153,0.3)",
                          }}
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="text-sm text-slate-300">{f}</span>
                      </div>
                    ))}
                    {plan.missing.map((f) => (
                      <div key={f} className="flex items-center gap-2.5 opacity-25">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <X className="w-2.5 h-2.5 text-slate-600" />
                        </div>
                        <span className="text-sm text-slate-500">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setDemoOpen(true)}
                    className={`w-full py-3 rounded-xl text-sm font-semibold ${plan.highlight ? "skeu-btn text-white" : "skeu-btn-ghost"}`}
                    style={!plan.highlight ? { color: "#94a3b8" } : {}}
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
          <div
            className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(14,18,44,0.98) 0%, rgba(8,11,28,0.99) 100%)",
              border: "1px solid rgba(99,102,241,0.25)",
              boxShadow: "inset 0 1px 0 rgba(165,180,252,0.08), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.08), 0 24px 60px rgba(0,0,0,0.7)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08), transparent 65%)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-64" style={{ background: "linear-gradient(90deg, transparent, rgba(165,180,252,0.6), transparent)" }} />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mx-auto mb-6 skeu-icon"
                style={{
                  background: "linear-gradient(145deg, rgba(120,124,255,0.2), rgba(80,85,220,0.08))",
                  border: "1px solid rgba(99,102,241,0.35)",
                }}
              >
                <Sparkles className="w-5 h-5 text-indigo-400" style={{ filter: "drop-shadow(0 0 4px rgba(165,180,252,0.5))" }} />
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
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm skeu-btn"
              >
                Criar minha congregação <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-slate-600 mt-4">Sem compromisso · Cancele quando quiser</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 px-6 py-8"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(8,10,22,0.95) 0%, rgba(5,7,16,0.98) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-lg skeu-icon"
              style={{
                width: "26px", height: "26px",
                background: "linear-gradient(145deg, rgba(120,124,255,0.15), rgba(80,85,220,0.06))",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
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

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <p className="text-xs text-slate-700">ovile.com.br · {new Date().getFullYear()}</p>
            <Link href="/termos" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Privacidade</Link>
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Acesso ao sistema →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
