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
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Network,
  Map,
  Calendar,
  BarChart2,
  Target,
  Award,
  ClipboardList,
  Send,
  Megaphone,
  Settings,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tour dos menus — espelha a navegação real do sistema (ver navItems em sidebar.tsx),
// agrupado por papel. Cada apoiador vê só os grupos que tem acesso.
const ROLE_RANK_DECK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const MENU_TOUR: {
  group: string;
  badge: string;
  minRank: number;
  accent: string;
  groupIcon: typeof Sparkles;
  items: { icon: typeof Sparkles; label: string; what: string }[];
}[] = [
  {
    group: "Seu menu principal",
    badge: "Menu · Base",
    minRank: 0,
    accent: "from-blue-500/20 to-blue-500/5",
    groupIcon: Compass,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", what: "Sua visão geral: total de apoiadores, próximos eventos e o andamento da base num relance." },
      { icon: GraduationCap, label: "Treinamento", what: "Este tutorial. Volte aqui sempre que tiver dúvida de como usar o sistema." },
      { icon: Users, label: "Colaboradores", what: "O coração do sistema. Cadastre e acompanhe seus apoiadores — nome, telefone, cidade e status." },
      { icon: Network, label: "Células", what: "Sua rede. Veja quem você indicou e como o seu time está crescendo." },
    ],
  },
  {
    group: "Ferramentas de coordenação",
    badge: "Menu · Coordenação",
    minRank: 1,
    accent: "from-emerald-500/20 to-emerald-500/5",
    groupIcon: Map,
    items: [
      { icon: Map, label: "Mapa de Apoio", what: "Onde está a sua força: cobertura por município, bairro e zona eleitoral no mapa." },
      { icon: Calendar, label: "Agenda", what: "Eventos da campanha — reuniões, gravações, podcasts. Crie, edite e registre presença." },
      { icon: BarChart2, label: "Relatório", what: "Os números da base: crescimento, conversão e desempenho por região." },
      { icon: Target, label: "Metas", what: "Quanto falta: metas de votos e de lideranças por cidade." },
      { icon: Award, label: "Eleitos 2022", what: "Referência eleitoral: quem se elegeu em 2022 e onde foram os votos." },
    ],
  },
  {
    group: "Administração",
    badge: "Menu · Administração",
    minRank: 2,
    accent: "from-yellow-500/20 to-yellow-500/5",
    groupIcon: Settings,
    items: [
      { icon: ClipboardList, label: "Tarefas", what: "Organização do time: pendências e responsáveis." },
      { icon: Send, label: "WhatsApp", what: "Central de mensagens: disparos, grupos e atendimento da base." },
      { icon: Megaphone, label: "Comunicados", what: "Avisos oficiais para toda a base de apoio." },
      { icon: Settings, label: "Configurações", what: "Ajustes da campanha: equipe, integrações e preferências." },
    ],
  },
];

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
  const firstName = userName.split(" ")[0] || "apoiador";
  const roleLabel =
    userRole === "ADMIN" ? "Administrador"
    : userRole === "LEADER" ? "Coordenador"
    : "Colaborador";

  // Tour dos menus filtrado pelo papel do usuário — cada grupo vira um slide.
  const userRank = ROLE_RANK_DECK[userRole] ?? 0;
  const menuSlides: Slide[] = MENU_TOUR.filter((g) => userRank >= g.minRank).map((g) => ({
    icon: g.groupIcon,
    badge: g.badge,
    title: g.group,
    accent: g.accent,
    body: (
      <>
        <p className="text-sm lg:text-base text-muted-foreground mb-4">
          O que você encontra em cada item do menu:
        </p>
        <ul className="space-y-2.5">
          {g.items.map((it) => (
            <li key={it.label} className="flex items-start gap-3 glass-card rounded-xl p-3 border border-white/[0.06]">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <it.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{it.label}</p>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 leading-relaxed">{it.what}</p>
              </div>
            </li>
          ))}
        </ul>
      </>
    ),
  }));

  const slides: Slide[] = [
    {
      icon: Sparkles,
      badge: "Bem-vindo",
      title: `Olá, ${firstName}.`,
      accent: "from-primary/20 to-primary/5",
      body: (
        <>
          <p className="text-base lg:text-xl text-muted-foreground leading-relaxed">
            Este é o <strong className="text-foreground">sistema oficial</strong> da
            base de apoio do <strong className="text-primary">{candidateName}</strong> a
            Deputado Estadual pelo Paraná em 2026.
          </p>
          <p className="text-sm lg:text-base text-muted-foreground/80 mt-3">
            Em poucos minutos vamos te mostrar como funciona uma das ferramentas mais avançadas
            de gestão eleitoral do Brasil.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Você é: {roleLabel}</span>
          </div>
        </>
      ),
    },
    {
      icon: Compass,
      badge: "Visão geral",
      title: "Vamos passar por cada menu.",
      accent: "from-blue-500/20 to-blue-500/5",
      body: (
        <>
          <p className="text-base lg:text-xl text-muted-foreground leading-relaxed">
            O sistema é dividido em menus, e cada um tem uma função clara. Nos próximos
            passos você vai ver <strong className="text-foreground">exatamente o que fazer em cada um</strong> —
            só aparecem os que fazem parte do seu acesso de <strong className="text-primary">{roleLabel}</strong>.
          </p>
          <p className="text-sm lg:text-base text-muted-foreground/80 mt-3">
            No celular, os principais ficam na barra de baixo; o restante fica no botão
            <strong className="text-foreground"> Menu</strong>.
          </p>
        </>
      ),
    },
    ...menuSlides,
    {
      icon: UserPlus,
      badge: "Passo a passo",
      title: "Cadastre seu primeiro apoiador.",
      accent: "from-green-500/20 to-green-500/5",
      body: (
        <>
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            É rápido — cerca de 30 segundos por pessoa.
          </p>
          <ol className="space-y-2.5">
            {[
              ["1", "Toque em Colaboradores no menu inferior."],
              ["2", 'Toque em "Novo" no topo da tela.'],
              ["3", "Preencha nome, telefone e cidade. O resto é opcional."],
              ["4", "Salve. O sistema dispara o convite WhatsApp automaticamente."],
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
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            Quanto mais apoiadores ativos você cadastra, mais alto é o seu nível.
          </p>
          <div className="space-y-2.5">
            {[
              { tier: "Colaborador", desc: "Você começa aqui. Cadastra livremente seus contatos.", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
              { tier: "Coordenador", desc: "Quando seu time cresce, você vira referência regional.", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
              { tier: "Administrador", desc: "Acesso completo. Toma decisões estratégicas da base.", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
            ].map((t) => (
              <div key={t.tier} className="glass-card rounded-xl p-3.5 border border-white/[0.06]">
                <div className={cn("inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-1.5", t.color)}>
                  {t.tier}
                </div>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
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
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            Cada apoiador tem um <strong className="text-foreground">score de 0 a 100</strong> calculado
            pelo sistema com base na atividade.
          </p>
          <div className="space-y-3">
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
                <div className="min-w-[110px]">
                  <p className={cn("text-xs lg:text-sm font-semibold", row.color)}>{row.value} · {row.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">{row.desc}</p>
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
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
            Você não precisa mandar mensagem para cada apoiador. O sistema faz isso.
          </p>
          <div className="mt-4 space-y-2.5">
            {[
              ["1 · Convite automático", "Assim que o apoiador é cadastrado, recebe um convite formal pelo WhatsApp para entrar no grupo oficial."],
              ["2 · Resposta SIM/NÃO", "Quem responde SIM recebe o link do grupo e vira apoiador ativo. Quem responde NÃO é desativado com respeito."],
              ["3 · Reativação inteligente", "Apoiadores frios há muito tempo recebem mensagem cordial de retomada — só quando você decide."],
            ].map(([title, desc]) => (
              <div key={title} className="glass-card rounded-xl p-3.5 border border-emerald-500/20 bg-emerald-500/[0.04]">
                <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                  {title}
                </p>
                <p className="text-sm text-foreground/85">{desc}</p>
              </div>
            ))}
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
          <p className="text-sm lg:text-base text-muted-foreground mb-4">
            O sistema foi feito primeiro para o celular. Você pode instalar como aplicativo.
          </p>
          <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.05] to-transparent">
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
          <p className="text-xs text-muted-foreground/70 mt-3">
            Vai parecer um aplicativo nativo. Sem App Store, sem download.
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
          <p className="text-sm lg:text-base text-muted-foreground mb-3">
            Estamos em conformidade com a LGPD e com a legislação eleitoral.
          </p>
          <ul className="space-y-2.5">
            {[
              ["Dados protegidos", "Telefones, endereços e mensagens ficam em banco seguro com acesso por níveis."],
              ["Consentimento ativo", "Quem responde NÃO é desativado imediatamente. Sem insistência."],
              ["Termo de uso", 'Antes de 16/08/2026, o sistema usa "base de apoio" — exigência legal pré-eleitoral.'],
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
          <p className="text-base lg:text-xl text-muted-foreground leading-relaxed">
            Cada apoiador que você cadastra é um voto a mais somado, uma rua a mais coberta,
            uma comunidade a mais representada.
          </p>
          <p className="text-sm lg:text-base text-foreground/85 mt-3 leading-relaxed">
            Se ficar com dúvida, peça ajuda à sua coordenação. Estamos juntos do primeiro
            cadastro até a posse.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href="/dashboard"
              className="glass-card rounded-xl p-3.5 border border-white/[0.08] hover:border-primary/40 transition-colors text-center"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Voltar para</p>
              <p className="text-sm font-semibold text-foreground">Dashboard</p>
            </a>
            <a
              href="/colaboradores"
              className="glass-card rounded-xl p-3.5 border border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.10] transition-colors text-center"
            >
              <p className="text-xs text-primary/80 mb-0.5">Cadastrar agora</p>
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
    const h = scrollerRef.current.clientHeight;
    scrollerRef.current.scrollTo({ top: clamped * h, behavior: "smooth" });
  }, [slides.length]);

  // Detecta slide ativo pelo scroll vertical
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = el.clientHeight;
        if (h === 0) return;
        const i = Math.round(el.scrollTop / h);
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
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(index + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === "Home") goTo(0);
      if (e.key === "End") goTo(slides.length - 1);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [index, goTo, slides.length]);

  // Entrada animada via anime.js v4
  useEffect(() => {
    import("animejs")
      .then(({ animate }) => {
        animate(".treino-hero", {
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 600,
          ease: "outCubic",
          delay: 80,
        });
      })
      .catch(() => {});
  }, [index]);

  const progress = ((index + 1) / slides.length) * 100;

  return (
    <div
      className="relative -mt-4 -mx-3 lg:-mt-8 lg:-mx-8 lg:-mb-8 flex flex-col h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] lg:h-[100dvh]"
    >
      {/* Top bar — fixa (sem backdrop-blur: destrói scroll em iOS) */}
      <div className="shrink-0 z-20 bg-background/98 border-b border-white/[0.06] px-4 py-3 lg:px-8 lg:py-4">
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

      {/* Scroller vertical com snap — ocupa o espaço restante */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-none overscroll-contain"
        style={{ scrollBehavior: "smooth" }}
      >
        {slides.map((s, i) => {
          const Icon = s.icon;
          return (
            <section
              key={i}
              data-index={i}
              className="w-full snap-start flex items-center justify-center px-5 lg:px-12 py-8"
              style={{ minHeight: "100%" }}
              aria-roledescription="slide"
              aria-label={`${s.badge} — ${s.title}`}
            >
              <div className={cn(
                "max-w-2xl w-full",
                i === index && "treino-hero",
              )}>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.10] bg-gradient-to-r mb-4",
                  s.accent,
                )}>
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-foreground/90">
                    {s.badge}
                  </span>
                </div>
                <h2 className="text-2xl lg:text-5xl font-bold text-foreground leading-tight mb-5 lg:mb-7">
                  {s.title}
                </h2>
                <div className="text-foreground/90">{s.body}</div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Controles flutuantes — embaixo, acima do bottom-nav mobile */}
      <div
        className="absolute right-3 lg:right-6 z-30 flex flex-col gap-2"
        style={{
          bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Slide anterior"
          className="touch-target w-11 h-11 rounded-full glass-card border border-white/[0.10] hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-lg"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
          aria-label="Próximo slide"
          className="touch-target w-11 h-11 rounded-full bg-primary/90 hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-primary-foreground transition-colors shadow-lg shadow-primary/30"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Dots indicator — barra lateral esquerda */}
      <div
        className="absolute left-3 lg:left-6 z-30 flex flex-col gap-1.5 items-center"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir para slide ${i + 1}`}
            className={cn(
              "rounded-full transition-all duration-300",
              i === index
                ? "w-1.5 h-6 bg-primary"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
