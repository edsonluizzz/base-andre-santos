"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles,
  Users,
  UserPlus,
  Trophy,
  Gauge,
  MessageCircle,
  Smartphone,
  Shield,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckProps {
  candidateName: string;
  userName: string;
  userRole: string;
}

type Slide = {
  icon: typeof Sparkles;
  badge: string;
  title: string;
  body: React.ReactNode;
  accent: string;
};

export function TreinamentoDeck({ candidateName, userName, userRole }: DeckProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const firstName = userName.split(" ")[0] || "apoiador";
  const roleLabel =
    userRole === "ADMIN" ? "Administrador"
    : userRole === "LEADER" ? "Coordenador"
    : "Colaborador";

  const slides: Slide[] = [
    {
      icon: Sparkles,
      badge: "Bem-vindo",
      title: `Olá, ${firstName}.`,
      accent: "from-primary/20 to-primary/5",
      body: (
        <>
          <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Este é o <strong className="text-foreground">sistema oficial</strong> da
            base de apoio do <strong className="text-primary">{candidateName}</strong> a
            Deputado Estadual pelo Paraná em 2026.
          </p>
          <p className="text-base text-muted-foreground/80 mt-4">
            Você está na frente de uma das ferramentas mais avançadas de gestão eleitoral do
            Brasil. Em poucos minutos vamos te mostrar como funciona.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Você é: {roleLabel}</span>
          </div>
        </>
      ),
    },
    {
      icon: Users,
      badge: "Como funciona",
      title: "O sistema em uma frase.",
      accent: "from-blue-500/20 to-blue-500/5",
      body: (
        <>
          <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Cada apoiador cadastrado é registrado no banco de dados central, classificado por
            zona e nível de engajamento, e contatado automaticamente pelo WhatsApp para
            entrar no grupo dos apoiadores.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Cadastro inteligente — telefone, cidade, zona e perfil",
              "WhatsApp automático — convite e boas-vindas sem você levantar um dedo",
              "Ranking ao vivo — o sistema mostra quem está mobilizando mais",
              "Mapa de apoio — cobertura por município, bairro e zona eleitoral",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span className="text-sm lg:text-base text-foreground/80">{t}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      icon: UserPlus,
      badge: "Passo a passo",
      title: "Cadastre seu primeiro apoiador.",
      accent: "from-green-500/20 to-green-500/5",
      body: (
        <>
          <p className="text-base text-muted-foreground mb-4">
            É rápido — cerca de 30 segundos por pessoa.
          </p>
          <ol className="space-y-3">
            {[
              ["1", "Toque em Colaboradores no menu inferior."],
              ["2", 'Toque no botão "Novo" no topo da tela.'],
              ["3", "Preencha nome, telefone e cidade. O resto é opcional."],
              ["4", 'Salve. O sistema dispara o convite WhatsApp automaticamente se a pessoa for um lead com telefone.'],
              ["5", "Pronto. A pessoa entra na sua célula e conta nos seus indicadores."],
            ].map(([num, text]) => (
              <li key={num} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">
                  {num}
                </div>
                <p className="text-sm lg:text-base text-foreground/85 leading-relaxed pt-0.5">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </>
      ),
    },
    {
      icon: Trophy,
      badge: "Ranking",
      title: "Como você sobe de nível.",
      accent: "from-yellow-500/20 to-yellow-500/5",
      body: (
        <>
          <p className="text-base text-muted-foreground mb-4">
            Quanto mais apoiadores ativos você cadastra, mais alto é o seu nível.
          </p>
          <div className="space-y-3">
            {[
              { tier: "Colaborador", desc: "Você começa aqui. Cadastra livremente seus contatos.", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
              { tier: "Coordenador", desc: "Quando seu time cresce, você vira referência regional.", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
              { tier: "Administrador", desc: "Acesso completo. Toma decisões estratégicas da base.", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
            ].map((t) => (
              <div key={t.tier} className="glass-card rounded-xl p-4 border border-white/[0.06]">
                <div className={cn("inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2", t.color)}>
                  {t.tier}
                </div>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4 italic">
            Veja o ranking ao vivo na aba <strong>Ranking</strong>.
          </p>
        </>
      ),
    },
    {
      icon: Gauge,
      badge: "Mobilização",
      title: "Score de engajamento.",
      accent: "from-rose-500/20 to-rose-500/5",
      body: (
        <>
          <p className="text-base text-muted-foreground mb-5">
            Cada apoiador tem um <strong className="text-foreground">score de 0 a 100</strong> calculado
            automaticamente com base na atividade dele.
          </p>
          <div className="space-y-4">
            {[
              { value: 85, label: "Engajado", color: "text-green-400", desc: "Está confirmado, responde rápido, foi contatado recentemente." },
              { value: 55, label: "Moderado", color: "text-amber-400", desc: "Cadastrado, mas há tempo sem contato." },
              { value: 20, label: "Frio", color: "text-red-400", desc: "Precisa de reativação. O sistema pode mandar mensagem pra ele." },
            ].map((row) => (
              <div key={row.value} className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.value}%`,
                      background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)",
                    }}
                  />
                </div>
                <div className="min-w-[120px]">
                  <p className={cn("text-sm font-semibold", row.color)}>{row.value} · {row.label}</p>
                  <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      icon: MessageCircle,
      badge: "Automação",
      title: "O WhatsApp trabalha sozinho.",
      accent: "from-emerald-500/20 to-emerald-500/5",
      body: (
        <>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Você não precisa mandar mensagem para cada apoiador. O sistema faz isso por você.
          </p>
          <div className="mt-6 space-y-4">
            <div className="glass-card rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/[0.04]">
              <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                1 · Convite automático
              </p>
              <p className="text-sm text-foreground/85">
                Assim que o apoiador é cadastrado como lead, ele recebe um convite formal pelo
                WhatsApp para entrar no grupo oficial.
              </p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/[0.04]">
              <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                2 · Resposta SIM/NÃO
              </p>
              <p className="text-sm text-foreground/85">
                Quem responde <strong>SIM</strong> recebe o link do grupo e vira apoiador ativo.
                Quem responde <strong>NÃO</strong> é desativado com respeito.
              </p>
            </div>
            <div className="glass-card rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/[0.04]">
              <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                3 · Reativação inteligente
              </p>
              <p className="text-sm text-foreground/85">
                Apoiadores frios há muito tempo recebem uma mensagem cordial de retomada — só
                quando você decide, e só em massa controlada.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Smartphone,
      badge: "Mobilidade",
      title: "Use no celular.",
      accent: "from-cyan-500/20 to-cyan-500/5",
      body: (
        <>
          <p className="text-base text-muted-foreground mb-5">
            O sistema foi feito primeiro para o celular. Você pode instalar como aplicativo e
            usar offline.
          </p>
          <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.05] to-transparent">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Como adicionar à tela inicial
            </p>
            <ul className="text-sm text-foreground/80 space-y-2">
              <li>
                <strong className="text-cyan-400">iPhone:</strong> abra no Safari, toque em
                Compartilhar e depois &quot;Adicionar à Tela de Início&quot;.
              </li>
              <li>
                <strong className="text-cyan-400">Android:</strong> abra no Chrome, toque nos
                três pontinhos e depois &quot;Adicionar à tela inicial&quot;.
              </li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4">
            Vai parecer um aplicativo nativo. Sem App Store, sem download. Só abrir e usar.
          </p>
        </>
      ),
    },
    {
      icon: Shield,
      badge: "Compliance",
      title: "Sigilo e respeito ao apoiador.",
      accent: "from-purple-500/20 to-purple-500/5",
      body: (
        <>
          <p className="text-base text-muted-foreground mb-4">
            Estamos em conformidade com a LGPD e com a legislação eleitoral.
          </p>
          <ul className="space-y-3">
            {[
              ["Dados protegidos", "Telefones, endereços e mensagens ficam em banco seguro com acesso por níveis."],
              ["Consentimento ativo", "Quem responde NÃO é desativado imediatamente. Sem insistência."],
              ["Termo de uso", 'Antes de 16 de agosto de 2026, o sistema usa "base de apoio", não "campanha" — exigência legal pré-eleitoral.'],
              ["Auditoria", "Cada mensagem enviada fica registrada com data, usuário e canal."],
            ].map(([title, desc]) => (
              <li key={title} className="flex gap-3">
                <div className="w-1 h-auto rounded-full bg-purple-400/40 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      icon: Heart,
      badge: "Vamos juntos",
      title: `Conte com a gente, ${firstName}.`,
      accent: "from-primary/30 to-primary/5",
      body: (
        <>
          <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Cada apoiador que você cadastra é um voto a mais somado, uma rua a mais coberta,
            uma comunidade a mais representada.
          </p>
          <p className="text-base text-foreground/85 mt-4 leading-relaxed">
            Se ficar com qualquer dúvida, peça ajuda à sua coordenação. Estamos juntos do
            primeiro cadastro até a posse.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <a
              href="/dashboard"
              className="glass-card rounded-xl p-4 border border-white/[0.08] hover:border-primary/40 transition-colors text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Voltar para</p>
              <p className="text-sm font-semibold text-foreground">Dashboard</p>
            </a>
            <a
              href="/colaboradores"
              className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.10] transition-colors text-center"
            >
              <p className="text-xs text-primary/80 mb-1">Cadastrar agora</p>
              <p className="text-sm font-semibold text-primary">Apoiadores</p>
            </a>
          </div>
        </>
      ),
    },
  ];

  // ─── Navegação ────────────────────────────────────────────────────────
  const goTo = useCallback((i: number) => {
    if (!scrollerRef.current) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    const w = scrollerRef.current.clientWidth;
    scrollerRef.current.scrollTo({ left: clamped * w, behavior: "smooth" });
  }, [slides.length]);

  // Detecta slide ativo pelo scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        const i = Math.round(el.scrollLeft / w);
        setIndex(i);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Teclado
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      if (e.key === "Home") { goTo(0); }
      if (e.key === "End") { goTo(slides.length - 1); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [index, goTo, slides.length]);

  // Mount + entrada animada via anime.js v4
  useEffect(() => {
    setMounted(true);
    import("animejs")
      .then(({ animate }) => {
        animate(".treino-hero", {
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 700,
          ease: "outCubic",
          delay: 80,
        });
      })
      .catch(() => {});
  }, []);

  const progress = ((index + 1) / slides.length) * 100;

  return (
    <div className="-mt-4 -mx-3 lg:-mt-8 lg:-mx-8 lg:-mb-8 relative">
      {/* Top bar: badge + progresso + contador */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-white/[0.06] px-4 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xs lg:text-sm font-semibold text-foreground truncate">
              Treinamento · {candidateName}
            </p>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums shrink-0">
            {index + 1} / {slides.length}
          </p>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Scroller horizontal com scroll-snap */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none touch-pan-x"
        style={{ scrollBehavior: mounted ? "smooth" : "auto" }}
      >
        {slides.map((s, i) => {
          const Icon = s.icon;
          return (
            <section
              key={i}
              data-index={i}
              className="w-full shrink-0 snap-center min-h-[calc(100dvh-9rem)] lg:min-h-[calc(100dvh-7rem)] flex items-center justify-center px-5 lg:px-12 py-8"
              aria-roledescription="slide"
              aria-label={`${s.badge} — ${s.title}`}
            >
              <div className={cn(
                "max-w-2xl w-full",
                i === index && "treino-hero",
              )}>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.10] bg-gradient-to-r mb-5",
                  s.accent,
                )}>
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-foreground/90">
                    {s.badge}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-5xl font-bold text-foreground leading-tight mb-6 lg:mb-8">
                  {s.title}
                </h2>
                <div className="text-foreground/90">{s.body}</div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Controles inferiores: setas + dots */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20 px-4 pb-3 lg:px-8">
        <div className="glass-card rounded-2xl border border-white/[0.08] px-3 py-2 flex items-center gap-2 shadow-xl mx-auto max-w-md backdrop-blur-xl">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Slide anterior"
            className="touch-target w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 py-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40",
                )}
              />
            ))}
          </div>

          <button
            onClick={() => goTo(index + 1)}
            disabled={index === slides.length - 1}
            aria-label="Próximo slide"
            className="touch-target w-10 h-10 rounded-xl bg-primary/15 hover:bg-primary/25 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-primary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
