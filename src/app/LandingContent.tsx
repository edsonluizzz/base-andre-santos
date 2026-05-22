"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, Map, MessageSquare, CalendarDays,
  Trophy, Target, LayoutDashboard, Network,
  ArrowRight, ShieldCheck, ChevronDown,
} from "lucide-react";

const MODULES = [
  { icon: Users, label: "Colaboradores", desc: "Perfis completos, score de mobilização e histórico" },
  { icon: Map, label: "Mapa PR", desc: "Cobertura territorial choropleth por município" },
  { icon: MessageSquare, label: "Grupos WhatsApp", desc: "Gestão e territorialização de grupos" },
  { icon: CalendarDays, label: "Agenda", desc: "Eventos, presenças e sync Google Calendar" },
  { icon: Trophy, label: "Ranking", desc: "Engajamento e liderança da equipe" },
  { icon: Target, label: "Metas", desc: "Projeção de votos cruzada com eleitos 2022" },
  { icon: LayoutDashboard, label: "Dashboard", desc: "KPIs, velocidade semanal e funil de conversão" },
  { icon: Network, label: "Células", desc: "Organização hierárquica da base de apoio" },
];

export function LandingContent() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero fade-in
    const hero = heroRef.current;
    if (hero) {
      hero.style.opacity = "0";
      hero.style.transform = "translateY(24px)";
      const t = setTimeout(() => {
        hero.style.transition = "opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)";
        hero.style.opacity = "1";
        hero.style.transform = "translateY(0)";
      }, 80);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    // Scroll reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        :root { --gold: #d4af37; --bg: #0a1220; }

        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-slow-rev { to { transform: rotate(-360deg); } }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes badge-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo-ring-outer {
          animation: spin-slow 12s linear infinite;
        }
        .logo-ring-inner {
          animation: spin-slow-rev 8s linear infinite;
        }
        .logo-float {
          animation: float 5s ease-in-out infinite;
        }
        .hero-badge {
          animation: badge-in 0.6s cubic-bezier(.16,1,.3,1) both;
        }
        .hero-badge:nth-child(2) { animation-delay: 0.15s; }
        .hero-badge:nth-child(3) { animation-delay: 0.3s; }

        [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
        }
        [data-reveal][data-visible="true"] {
          opacity: 1;
          transform: translateY(0);
        }
        [data-reveal][data-delay="1"] { transition-delay: 0.08s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.16s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.24s; }
        [data-reveal][data-delay="4"] { transition-delay: 0.32s; }
        [data-reveal][data-delay="5"] { transition-delay: 0.40s; }
        [data-reveal][data-delay="6"] { transition-delay: 0.48s; }
        [data-reveal][data-delay="7"] { transition-delay: 0.56s; }
        [data-reveal][data-delay="8"] { transition-delay: 0.64s; }

        .module-card {
          background: rgba(13,27,42,0.85);
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 16px;
          padding: 1.5rem;
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
        }
        .module-card:hover {
          border-color: rgba(212,175,55,0.28);
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(212,175,55,0.07);
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--gold);
          color: #0a1220;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.9rem 2rem;
          border-radius: 14px;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
        }
        .cta-btn:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .grid-bg {
          background-image: radial-gradient(circle at 1px 1px, rgba(212,175,55,0.055) 1px, transparent 0);
          background-size: 44px 44px;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent);
        }

        @media (min-width: 640px) {
          .modules-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 900px) {
          .modules-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>

        {/* Grid texture */}
        <div className="grid-bg" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* Ambient glow top */}
        <div style={{
          position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 65%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* ─── HERO ─── */}
        <section style={{
          position: "relative", zIndex: 1,
          minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "5rem 1.5rem 3rem",
          textAlign: "center",
        }}>
          <div ref={heroRef} style={{ maxWidth: 700, width: "100%" }}>

            {/* Animated logo */}
            <div className="logo-float" style={{ display: "inline-block", marginBottom: "2.5rem", position: "relative" }}>
              {/* Outer spinning ring */}
              <svg className="logo-ring-outer" width="110" height="110" style={{ position: "absolute", inset: "-15px", pointerEvents: "none" }}>
                <rect x="4" y="4" width="102" height="102" rx="28"
                  fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="1"
                  strokeDasharray="8 6" />
              </svg>
              {/* Inner spinning ring */}
              <svg className="logo-ring-inner" width="96" height="96" style={{ position: "absolute", inset: "-8px", pointerEvents: "none" }}>
                <rect x="3" y="3" width="90" height="90" rx="22"
                  fill="none" stroke="rgba(212,175,55,0.10)" strokeWidth="1"
                  strokeDasharray="4 8" />
              </svg>
              {/* Logo box */}
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: "rgba(212,175,55,0.09)",
                border: "1px solid rgba(212,175,55,0.32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 30px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.15)",
              }}>
                <span style={{
                  fontSize: 34, fontWeight: 900, color: "#d4af37",
                  fontFamily: "var(--font-display, var(--font-sans))",
                  letterSpacing: "-1px",
                }}>O</span>
              </div>
            </div>

            {/* Eyebrow */}
            <p style={{
              fontSize: "0.7rem", letterSpacing: "5px", textTransform: "uppercase",
              color: "rgba(212,175,55,0.65)", marginBottom: "1rem",
            }}>
              Paraná · 2026
            </p>

            {/* Main title */}
            <h1 style={{
              fontSize: "clamp(3.5rem, 11vw, 7.5rem)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontWeight: 400,
              letterSpacing: "0.04em",
              lineHeight: 0.92,
              color: "white",
              marginBottom: "0.4em",
            }}>
              OVILE<br />
              <span style={{
                WebkitTextStroke: "1px rgba(212,175,55,0.7)",
                color: "transparent",
              }}>ELEITORAL</span>
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: "1rem", color: "rgba(148,163,184,0.85)",
              marginBottom: "2.5rem", letterSpacing: "0.02em",
            }}>
              Plataforma de gestão de base eleitoral
            </p>

            {/* Pills / badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "2.5rem" }}>
              {["Colaboradores", "Mapa PR", "Metas TSE", "Google Calendar"].map((tag, i) => (
                <span key={tag} className="hero-badge" style={{
                  fontSize: "0.72rem", letterSpacing: "0.03em",
                  color: "rgba(212,175,55,0.75)",
                  background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.18)",
                  borderRadius: 999, padding: "0.3rem 0.9rem",
                }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* CTA */}
            <Link href="/login" className="cta-btn">
              Acessar o sistema <ArrowRight size={15} />
            </Link>

          </div>

          {/* Scroll indicator */}
          <div style={{
            position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            opacity: 0.3,
          }}>
            <span style={{ fontSize: "0.65rem", letterSpacing: "3px", textTransform: "uppercase", color: "white" }}>scroll</span>
            <ChevronDown size={14} color="white" />
          </div>
        </section>

        <div className="divider" style={{ position: "relative", zIndex: 1 }} />

        {/* ─── MODULES ─── */}
        <section style={{ position: "relative", zIndex: 1, padding: "6rem 1.5rem", maxWidth: 1160, margin: "0 auto" }}>

          <div data-reveal style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p style={{
              fontSize: "0.68rem", letterSpacing: "5px", textTransform: "uppercase",
              color: "rgba(212,175,55,0.6)", marginBottom: "0.75rem",
            }}>
              Plataforma completa
            </p>
            <h2 style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontWeight: 400, letterSpacing: "0.04em",
              color: "white",
            }}>
              MÓDULOS DO SISTEMA
            </h2>
          </div>

          <div className="modules-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.875rem" }}>
            {MODULES.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className="module-card"
                data-reveal
                data-delay={String(i + 1)}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(212,175,55,0.09)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <Icon size={17} color="#d4af37" />
                </div>
                <p style={{ fontWeight: 600, color: "white", fontSize: "0.875rem", marginBottom: "0.35rem" }}>{label}</p>
                <p style={{ fontSize: "0.77rem", color: "rgba(148,163,184,0.75)", lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" style={{ position: "relative", zIndex: 1 }} />

        {/* ─── ACCESS SECTION ─── */}
        <section style={{ position: "relative", zIndex: 1, padding: "6rem 1.5rem 8rem", textAlign: "center" }}>

          <div data-reveal style={{ maxWidth: 480, margin: "0 auto" }}>
            <p style={{
              fontSize: "0.68rem", letterSpacing: "5px", textTransform: "uppercase",
              color: "rgba(212,175,55,0.6)", marginBottom: "3rem",
            }}>
              Portal de acesso
            </p>

            <div style={{
              background: "rgba(13,27,42,0.9)",
              border: "1px solid rgba(212,175,55,0.18)",
              borderRadius: 24, padding: "2.75rem 2rem",
              boxShadow: "0 2px 0 rgba(212,175,55,0.12), 0 40px 80px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: "rgba(212,175,55,0.09)",
                border: "1px solid rgba(212,175,55,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}>
                <ShieldCheck size={22} color="#d4af37" />
              </div>

              <h3 style={{
                fontSize: "1.5rem",
                fontFamily: "var(--font-display, var(--font-sans))",
                fontWeight: 400, letterSpacing: "0.05em",
                color: "white", marginBottom: "0.75rem",
              }}>
                ACESSO RESTRITO
              </h3>

              <p style={{
                fontSize: "0.85rem", color: "rgba(148,163,184,0.75)",
                lineHeight: 1.65, marginBottom: "2rem",
              }}>
                Esta plataforma é de uso exclusivo da equipe de gestão da base de apoio.
                Faça login com sua conta Google autorizada.
              </p>

              <Link href="/login" className="cta-btn" style={{ width: "100%", justifyContent: "center" }}>
                Entrar com Google
              </Link>

              <p style={{ marginTop: "1.25rem", fontSize: "0.72rem", color: "rgba(148,163,184,0.3)" }}>
                Ovile Eleitoral · Gestão de base eleitoral
              </p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
