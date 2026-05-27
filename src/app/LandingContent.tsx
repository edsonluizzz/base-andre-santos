"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, Map, MessageSquare, CalendarDays,
  Trophy, Target, LayoutDashboard, Network,
  ArrowRight, ShieldCheck, ChevronDown,
} from "lucide-react";
import { animate, stagger } from "animejs";

const MODULES = [
  { icon: Users,         label: "Colaboradores", desc: "Perfis completos, score de mobilização e histórico" },
  { icon: Map,           label: "Mapa PR",        desc: "Cobertura territorial choropleth por município" },
  { icon: MessageSquare, label: "Grupos WhatsApp",desc: "Gestão e territorialização de grupos" },
  { icon: CalendarDays,  label: "Agenda",         desc: "Eventos, presenças e sync Google Calendar" },
  { icon: Trophy,        label: "Ranking",        desc: "Engajamento e liderança da equipe" },
  { icon: Target,        label: "Metas",          desc: "Projeção de votos cruzada com eleitos 2022" },
  { icon: LayoutDashboard, label: "Dashboard",    desc: "KPIs, velocidade semanal e funil de conversão" },
  { icon: Network,       label: "Células",        desc: "Organização hierárquica da base de apoio" },
];

export function LandingContent() {
  const heroRef  = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero fade-in
    if (heroRef.current) {
      animate(heroRef.current, {
        opacity: [0, 1],
        translateY: [28, 0],
        duration: 900,
        delay: 80,
        ease: "outExpo",
      });
    }
    // Badges stagger
    if (badgesRef.current) {
      animate(badgesRef.current.querySelectorAll(".badge-item"), {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 500,
        delay: stagger(120, { start: 500 }),
        ease: "outExpo",
      });
    }
  }, []);

  useEffect(() => {
    // Scroll reveal para módulos
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = (entry.target as HTMLElement).querySelectorAll(".module-card-item");
            animate(cards, {
              opacity: [0, 1],
              translateY: [24, 0],
              duration: 600,
              delay: stagger(70),
              ease: "outExpo",
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    if (modulesRef.current) observer.observe(modulesRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1220]">

      {/* Grid texture */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.05) 1px, transparent 0)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Glow ambiental */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      {/* ─── HERO ─── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 text-center">
        <div ref={heroRef} className="max-w-2xl w-full" style={{ opacity: 0 }}>

          {/* Logo animado */}
          <div className="relative inline-block mb-10">
            {/* Anel externo giratório */}
            <svg
              className="absolute pointer-events-none animate-[spin_12s_linear_infinite]"
              width="110" height="110"
              style={{ inset: "-15px" }}
            >
              <rect x="4" y="4" width="102" height="102" rx="28"
                fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="1"
                strokeDasharray="8 6"
              />
            </svg>
            {/* Anel interno giratório reverso */}
            <svg
              className="absolute pointer-events-none animate-[spin_8s_linear_infinite_reverse]"
              width="96" height="96"
              style={{ inset: "-8px" }}
            >
              <rect x="3" y="3" width="90" height="90" rx="22"
                fill="none" stroke="rgba(212,175,55,0.10)" strokeWidth="1"
                strokeDasharray="4 8"
              />
            </svg>
            {/* Caixa do logo */}
            <div className="w-20 h-20 rounded-[20px] flex items-center justify-center animate-[float_5s_ease-in-out_infinite]"
              style={{
                background: "rgba(212,175,55,0.09)",
                border: "1px solid rgba(212,175,55,0.32)",
                boxShadow: "0 0 30px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.15)",
              }}
            >
              <span className="text-[34px] font-black text-gold leading-none" style={{ fontFamily: "var(--font-display, var(--font-sans))", letterSpacing: "-1px" }}>
                O
              </span>
            </div>
          </div>

          {/* Eyebrow */}
          <p className="text-[0.7rem] tracking-[5px] uppercase text-gold/65 mb-4">
            Paraná · 2026
          </p>

          {/* Título principal */}
          <h1
            className="font-normal leading-[0.92] text-white mb-4"
            style={{
              fontSize: "clamp(3.5rem, 11vw, 7.5rem)",
              fontFamily: "var(--font-display, var(--font-sans))",
              letterSpacing: "0.04em",
            }}
          >
            OVILE<br />
            <span style={{ WebkitTextStroke: "1px rgba(212,175,55,0.7)", color: "transparent" }}>
              ELEITORAL
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-base text-slate-400/85 mb-10 tracking-wide">
            Plataforma de gestão de base eleitoral
          </p>

          {/* Badges */}
          <div ref={badgesRef} className="flex flex-wrap gap-2 justify-center mb-10">
            {["Colaboradores", "Mapa PR", "Metas TSE", "Google Calendar"].map((tag) => (
              <span
                key={tag}
                className="badge-item text-[0.72rem] tracking-[0.03em] text-gold/75 bg-gold/[0.07] border border-gold/[0.18] rounded-full px-[0.9rem] py-[0.3rem]"
                style={{ opacity: 0 }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-gold text-[#0a1220] font-bold text-[0.95rem] px-8 py-[0.9rem] rounded-[14px] transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
          >
            Acessar o sistema <ArrowRight size={15} />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30">
          <span className="text-[0.65rem] tracking-[3px] uppercase text-white">scroll</span>
          <ChevronDown size={14} color="white" />
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px mx-6" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)" }} />

      {/* ─── MODULES ─── */}
      <section className="relative z-10 px-6 py-24 max-w-[1160px] mx-auto">

        <div className="text-center mb-14">
          <p className="text-[0.68rem] tracking-[5px] uppercase text-gold/60 mb-3">
            Plataforma completa
          </p>
          <h2
            className="text-white font-normal"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontFamily: "var(--font-display, var(--font-sans))",
              letterSpacing: "0.04em",
            }}
          >
            MÓDULOS DO SISTEMA
          </h2>
        </div>

        <div ref={modulesRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[0.875rem]">
          {MODULES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="module-card-item rounded-2xl p-6 border transition-all duration-250 hover:-translate-y-1 group"
              style={{
                opacity: 0,
                background: "rgba(13,27,42,0.85)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.28)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(212,175,55,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.055)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-4 bg-gold/[0.09] border border-gold/20">
                <Icon size={17} color="#d4af37" />
              </div>
              <p className="font-semibold text-white text-sm mb-1.5">{label}</p>
              <p className="text-[0.77rem] text-slate-400/75 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px mx-6" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)" }} />

      {/* ─── ACESSO ─── */}
      <section className="relative z-10 px-6 py-24 pb-32 text-center">
        <div className="max-w-sm mx-auto">

          <p className="text-[0.68rem] tracking-[5px] uppercase text-gold/60 mb-12">
            Portal de acesso
          </p>

          <div
            className="rounded-3xl px-8 py-11"
            style={{
              background: "rgba(13,27,42,0.9)",
              border: "1px solid rgba(212,175,55,0.18)",
              boxShadow: "0 2px 0 rgba(212,175,55,0.12), 0 40px 80px rgba(0,0,0,0.4)",
            }}
          >
            {/* Ícone */}
            <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center mx-auto mb-6 bg-gold/[0.09] border border-gold/25">
              <ShieldCheck size={22} color="#d4af37" />
            </div>

            <h3
              className="text-white text-2xl font-normal mb-3"
              style={{ fontFamily: "var(--font-display, var(--font-sans))", letterSpacing: "0.05em" }}
            >
              ACESSO RESTRITO
            </h3>

            <p className="text-[0.85rem] text-slate-400/75 leading-relaxed mb-8">
              Esta plataforma é de uso exclusivo da equipe de gestão da base de apoio.
              Faça login com sua conta Google autorizada.
            </p>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 bg-gold text-[#0a1220] font-bold text-[0.95rem] px-8 py-[0.9rem] rounded-[14px] transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
            >
              Entrar com Google
            </Link>

            <p className="mt-5 text-[0.72rem] text-slate-400/30">
              Ovile Eleitoral · Gestão de base eleitoral
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
