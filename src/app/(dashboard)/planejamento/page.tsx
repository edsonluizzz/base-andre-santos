import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { existsSync } from "fs";
import { join } from "path";
import {
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock,
  Target, BarChart2, Users, MapPin, Zap, Shield, Star,
  ChevronRight, Info, Brain, Megaphone, Heart,
  BookOpen, Lightbulb, Globe, Activity,
} from "lucide-react";

// ── Gap status ────────────────────────────────────────────────────────────────
type GapStatus = "resolved" | "partial" | "pending";

interface GapResult {
  status: GapStatus;
  detail: string;
}

async function colExists(table: string, col: string): Promise<boolean> {
  try {
    const r = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER(${table})
          AND LOWER(column_name) = LOWER(${col})
      ) as exists
    `;
    return r[0]?.exists ?? false;
  } catch { return false; }
}

async function tableExists(table: string): Promise<boolean> {
  try {
    const r = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE LOWER(table_name) = LOWER(${table})
      ) as exists
    `;
    return r[0]?.exists ?? false;
  } catch { return false; }
}

async function enumHasValue(enumType: string, value: string): Promise<boolean> {
  try {
    const r = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum pe
        JOIN pg_type pt ON pe.enumtypid = pt.oid
        WHERE pt.typname = ${enumType}
          AND pe.enumlabel = ${value}
      ) as exists
    `;
    return r[0]?.exists ?? false;
  } catch { return false; }
}

async function groupsTerritorialized(): Promise<number> {
  try {
    const r = await db.$queryRaw<Array<{ total: bigint; with_zone: bigint }>>`
      SELECT COUNT(*) as total, COUNT("zoneId") as with_zone
      FROM "WhatsAppGroup"
      WHERE "campaignId" = 'andre-santos-2026'
    `;
    const total = Number(r[0]?.total ?? 0);
    const withZone = Number(r[0]?.with_zone ?? 0);
    if (total === 0) return 0;
    return Math.round((withZone / total) * 100);
  } catch { return 0; }
}

async function checkAllGaps(): Promise<GapResult[]> {
  const [
    hasNeighborhood,
    hasChannel,
    hasSourceField,
    hasLeaderTypeEnum,
    hasMunGoal,
    hasMobScore,
    groupsPct,
  ] = await Promise.all([
    colExists("Collaborator", "neighborhood"),
    colExists("Collaborator", "channel"),
    colExists("Collaborator", "source"),
    enumHasValue("CollaboratorProfile", "LIDER_RELIGIOSO"),
    tableExists("MunicipalityGoal"),
    colExists("Collaborator", "mobilizationScore"),
    groupsTerritorialized(),
  ]);

  const hasFunnelPanel = existsSync(
    join(process.cwd(), "src/components/dashboard/funnel-panel.tsx")
  );

  return [
    // 0 — GAP 1: Tipo de liderança
    {
      status: hasLeaderTypeEnum ? "resolved" : "partial",
      detail: hasLeaderTypeEnum
        ? "Enum CollaboratorProfile contém LIDER_RELIGIOSO, EDUCADOR e demais valores"
        : "Enum atual (PASTOR, VEREADOR, EMPRESARIO…) cobre parcialmente; faltam LIDER_RELIGIOSO, EDUCADOR, FAMILIA, JOVEM",
    },
    // 1 — GAP 2: Campo bairro
    {
      status: hasNeighborhood ? "resolved" : "pending",
      detail: hasNeighborhood
        ? "Coluna neighborhood existe em Collaborator e está disponível no cadastro"
        : "Coluna neighborhood ausente na tabela Collaborator",
    },
    // 2 — GAP 3: Canal de origem
    {
      status: hasChannel ? "resolved" : hasSourceField ? "partial" : "pending",
      detail: hasChannel
        ? "Campo channel com enum (INSTAGRAM, WHATSAPP, EVENTO…) em uso"
        : hasSourceField
        ? "Campo source existe mas armazena string livre — sem enum de canal definido"
        : "Nenhum campo de canal de origem encontrado",
    },
    // 3 — GAP 4: Metas por município
    {
      status: hasMunGoal ? "resolved" : "pending",
      detail: hasMunGoal
        ? "Tabela MunicipalityGoal criada e disponível para configuração de metas"
        : "Tabela MunicipalityGoal não encontrada no banco",
    },
    // 4 — GAP 5: Score de potencial
    {
      status: hasMobScore ? "resolved" : "pending",
      detail: hasMobScore
        ? "Coluna mobilizationScore calculada e disponível em Collaborator"
        : "Coluna mobilizationScore ausente — nenhum score por colaborador",
    },
    // 5 — GAP 6: Painel funil em tempo real
    {
      status: hasFunnelPanel ? "resolved" : "pending",
      detail: hasFunnelPanel
        ? "Componente FunnelPanel encontrado e integrado ao dashboard"
        : "Componente src/components/dashboard/funnel-panel.tsx não encontrado",
    },
    // 6 — GAP 7: Grupos WhatsApp territorializados
    {
      status: groupsPct >= 70 ? "resolved" : groupsPct > 0 ? "partial" : "pending",
      detail:
        groupsPct >= 70
          ? `${groupsPct}% dos grupos WhatsApp têm zona/cidade atribuída`
          : groupsPct > 0
          ? `Apenas ${groupsPct}% dos grupos WhatsApp têm zona atribuída (meta: ≥ 70%)`
          : "Nenhum grupo WhatsApp com zona/cidade atribuída",
    },
  ];
}

// ── Helpers de display ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: GapStatus }) {
  if (status === "resolved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
        <CheckCircle2 className="w-3 h-3" /> Resolvido
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
        <Clock className="w-3 h-3" /> Parcial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
      <XCircle className="w-3 h-3" /> Pendente
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function PlanejamentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user.role ?? "MEMBER") !== "ADMIN") redirect("/dashboard");

  const gaps = await checkAllGaps();
  const resolved = gaps.filter((g) => g.status === "resolved").length;
  const partial  = gaps.filter((g) => g.status === "partial").length;
  const pending  = gaps.filter((g) => g.status === "pending").length;
  const progressPct = Math.round(((resolved + partial * 0.5) / gaps.length) * 100);

  const GAP_DEFS = [
    {
      num: "01", impacto: "ALTO",
      titulo: "Tipo de Liderança",
      desc: "Enum CollaboratorProfile precisa de valores LIDER_RELIGIOSO, EDUCADOR, FAMILIA, JOVEM, EMPREENDEDOR para segmentar comunicados e filtrar o mapa por nicho.",
    },
    {
      num: "02", impacto: "ALTO",
      titulo: "Campo Bairro no Cadastro",
      desc: "Cadastro público deve coletar bairro além de cidade. Essencial para territorialização granular dentro da RMC (Curitiba, SJP, Pinhais, Colombo, Araucária, FRG, Campo Largo, Almirante).",
    },
    {
      num: "03", impacto: "ALTO",
      titulo: "Canal de Origem do Cadastro",
      desc: "Rastrear de qual canal veio cada apoiador: Instagram, WhatsApp, evento físico, link direto. Sem isso, impossível saber qual ação digital converte mais.",
    },
    {
      num: "04", impacto: "ALTO",
      titulo: "Metas por Município",
      desc: "Tabela MunicipalityGoal com metas de colaboradores por cidade. Mapa deve mostrar atual vs. meta e colorir municípios conforme progresso.",
    },
    {
      num: "05", impacto: "MÉDIO",
      titulo: "Score de Potencial do Colaborador",
      desc: "Coluna mobilizationScore calculada automaticamente: status ativo +2, WhatsApp confirmado +1, indicações +1 cada, cidade RMC +1. Permite priorizar contatos.",
    },
    {
      num: "06", impacto: "MÉDIO",
      titulo: "Painel Funil em Tempo Real",
      desc: "Widget no dashboard mostrando: Instagram → Cadastro → Ativo → Célula. Necessita componente funnel-panel.tsx no dashboard.",
    },
    {
      num: "07", impacto: "MÉDIO",
      titulo: "Grupos WhatsApp por Território",
      desc: "≥ 70% dos grupos devem ter zoneId atribuído. O campo já existe no schema — o admin precisa associar cada grupo à sua cidade/zona.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[3px] uppercase text-primary/70 mb-1">
            Inteligência Estratégica
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Análise STRIDE × Base André Santos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cruzamento do relatório neural da STRIDE.IA com o sistema em produção · Atualizado automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2 border border-primary/20 self-start sm:self-auto">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-semibold">STRIDE.IA · Análise Neural</span>
        </div>
      </div>

      {/* ── KPIs estáticos ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Score Atual",    value: "68/100",  sub: "Pré-candidato em construção",        color: "text-yellow-400", icon: BarChart2  },
          { label: "Score Projetado",value: "76–82",   sub: "Com operação completa",              color: "text-green-400",  icon: TrendingUp },
          { label: "Sentimento +",   value: "91,4%",   sub: "Dos 336 comentários analisados",     color: "text-primary",    icon: Heart      },
          { label: "Engajamento",    value: "1,96%",   sub: "Posts próprios (50 analisados)",     color: "text-blue-400",   icon: Activity   },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card rounded-2xl p-5 border border-white/[0.07]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Progresso dos GAPs (dinâmico) ───────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Progresso de Implementação</h2>
            <p className="text-xs text-muted-foreground">Verificado ao vivo contra o banco de dados e os arquivos do projeto</p>
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <span className="flex items-center gap-1.5 text-green-400">
              <CheckCircle2 className="w-4 h-4" /> {resolved} resolvido{resolved !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Clock className="w-4 h-4" /> {partial} parcial{partial !== 1 ? "is" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <XCircle className="w-4 h-4" /> {pending} pendente{pending !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex-1 h-3 bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-green-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary shrink-0">{progressPct}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {resolved} de {gaps.length} gaps completamente resolvidos · {partial} parcialmente implementados
        </p>
      </section>

      {/* ── Contexto eleitoral ──────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">Contexto Eleitoral — Paraná 2026</h2>
        <p className="text-xs text-muted-foreground mb-5">Cenário proporcional para Deputado Estadual</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Eleitores PR",            value: "8,4 mi"    },
            { label: "Vagas Dep. Estadual",      value: "54"        },
            { label: "Quociente Eleitoral",      value: "~111.676"  },
            { label: "Cláusula Mínima (10%)",    value: "~11.268"   },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/20 p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Partido NOVO — Ativos</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /><span><strong className="text-foreground">Marca NOVO:</strong> atrai eleitor de direita, liberal-conservador, antipetista</span></li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /><span><strong className="text-foreground">Cauda majoritária:</strong> Deltan, Moro e Filipe podem puxar atenção</span></li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" /><span><strong className="text-foreground">Espaço evangélico:</strong> nicho pouco explorado dentro do NOVO</span></li>
            </ul>
          </div>
          <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Ponto Crítico</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              André pode fazer boa votação individual e <strong className="text-foreground">ainda depender da nominata do NOVO.</strong> O objetivo não pode ser só
              &ldquo;André fazer votos&rdquo; — precisa ser <strong className="text-foreground">André como um dos principais nomes da chapa.</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Risco: direita paranaense concentra votos em PL, PSD, PP, Republicanos. 37% dos deps. estaduais trocaram de partido na janela 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ── Scores STRIDE ───────────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-5">Scores Estratégicos — STRIDE.IA</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {[
            { label: "Base Digital",              score: 78, desc: "58k seguidores, boa média e picos fortes",                    color: "bg-yellow-400" },
            { label: "Sentimento Público",         score: 91, desc: "Comentários majoritariamente positivos, sem rejeição",        color: "bg-green-500"  },
            { label: "Potencial de Crescimento",   score: 82, desc: "Alto se construir agenda pública, não só religiosa",          color: "bg-green-400"  },
            { label: "Autoridade Simbólica",       score: 86, desc: "Pastor, pregador, teólogo, filósofo, escritor",              color: "bg-green-500"  },
            { label: "Conversão Política",         score: 48, desc: "Falta transformar a figura espiritual em legislativa",        color: "bg-yellow-500" },
            { label: "Risco de Rejeição",          score: 38, desc: "Baixo na base cristã; moderado no eleitor secular/NOVO",     color: "bg-red-400"    },
            { label: "Territorialização no PR",    score: 52, desc: "Base em Curitiba/SJP, mas presença nacional dilui conversão", color: "bg-yellow-400" },
            { label: "Competitividade Partidária", score: 57, desc: "NOVO tem vitrine forte, mas nominata precisa ser robusta",    color: "bg-yellow-400" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-sm font-bold text-primary">{item.score}/100</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Análise de sentimento ────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">Análise de Sentimento</h2>
        <p className="text-xs text-muted-foreground mb-5">336 comentários/respostas analisados via NLP</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { label: "Positivo", pct: 91.4, color: "bg-green-500",  dot: "bg-green-500",  desc: "Forte aprovação, admiração espiritual, respeito" },
              { label: "Neutro",   pct: 6.8,  color: "bg-slate-400",  dot: "bg-slate-400",  desc: "Perguntas, marcações, interações sem juízo"      },
              { label: "Spam",     pct: 1.8,  color: "bg-yellow-500", dot: "bg-yellow-500", desc: "Divulgações externas sem relação eleitoral"       },
              { label: "Negativo", pct: 0,    color: "bg-red-500",    dot: "bg-red-500",    desc: "Sem rejeição direta na amostra"                   },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-sm text-foreground">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{s.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Principais Expressões</p>
            <div className="flex flex-wrap gap-2">
              {["Glória a Deus","Homem de Deus","Que Deus te use","Pregou demais","Você é diferente","Minha referência","Vai ser benção","Deus te abençoe"].map((e) => (
                <span key={e} className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{e}</span>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-green-500/[0.06] border border-green-500/20 p-4">
              <p className="text-xs font-semibold text-green-400 mb-1">Interpretação STRIDE</p>
              <p className="text-xs text-muted-foreground leading-relaxed">A audiência de André é <strong className="text-foreground">afetiva, espiritual e reverente</strong> — não interage como audiência política tradicional, mas como comunidade de admiração. Isso é poderoso, mas exige transição cuidadosa.</p>
            </div>
            <div className="rounded-xl bg-primary/[0.06] border border-primary/20 p-4">
              <p className="text-xs font-semibold text-primary mb-1">Caminho correto</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Construir a candidatura como <strong className="text-foreground">missão pública, defesa da família e serviço ao Paraná</strong>. O erro seria entrar em pauta político-partidária dura e quebrar a imagem pastoral.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Onde está o voto ─────────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-5">Onde Está o Voto de André</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { num: "01", title: "Curitiba e Região Metropolitana",    icon: MapPin,   color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/[0.05]",    desc: "Núcleo natural. Curitiba, São José dos Pinhais, Pinhais, Colombo, Araucária, Fazenda Rio Grande, Campo Largo e Almirante Tamandaré." },
            { num: "02", title: "Cinturão Evangélico AD",             icon: Star,     color: "text-yellow-400", border: "border-yellow-400/20",  bg: "bg-yellow-400/[0.05]", desc: "Ecossistema assembleiano/pentecostal. Voto potencial vem de líderes, jovens, famílias e referências espirituais." },
            { num: "03", title: "Juventude Cristã",                   icon: Zap,      color: "text-blue-400",   border: "border-blue-400/20",    bg: "bg-blue-400/[0.05]",   desc: "Conteúdos de congresso, avivamento e Gideões — público de alta intensidade emocional. Bom para viralização e mobilização." },
            { num: "04", title: "Interior por Circuitos de Eventos",  icon: Globe,    color: "text-slate-400",  border: "border-slate-400/20",   bg: "bg-slate-400/[0.05]",  desc: "Presença em congressos fora da RMC gera autoridade, mas o que está fora do Paraná não gera voto direto." },
          ].map((item) => (
            <div key={item.num} className={`rounded-xl border ${item.border} ${item.bg} p-5`}>
              <div className="flex items-start gap-3">
                <div className={`text-3xl font-black ${item.color} opacity-30 leading-none shrink-0`}>{item.num}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <p className={`text-sm font-semibold ${item.color}`}>{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Posicionamento ───────────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-5">Estratégia de Posicionamento</h2>
        <div className="rounded-xl bg-slate-800/60 border border-white/[0.10] p-5 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Posicionamento Recomendado pela STRIDE</p>
          <p className="text-lg font-semibold text-foreground leading-relaxed">
            &ldquo;Um homem de fé e preparo, que decidiu servir o Paraná para
            <span className="text-primary"> proteger a família, defender a liberdade</span> e
            cuidar da <span className="text-primary">formação das próximas gerações</span>.&rdquo;
          </p>
        </div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pilares de Comunicação</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Heart,      label: "Família",          desc: "A família precisa voltar ao centro das políticas públicas."             },
            { icon: BookOpen,   label: "Educação",         desc: "Escola deve formar caráter, conhecimento e responsabilidade."           },
            { icon: Users,      label: "Juventude",        desc: "O Paraná precisa proteger e direcionar os jovens."                      },
            { icon: Shield,     label: "Liberdade",        desc: "O cidadão deve ter liberdade de fé, trabalho e consciência."            },
            { icon: Activity,   label: "Saúde Emocional",  desc: "Famílias destruídas geram jovens destruídos — Estado deve agir."        },
            { icon: Star,       label: "Transparência",    desc: "Política precisa de gente limpa, preparada e com valores."              },
          ].map((p) => (
            <div key={p.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <p.icon className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Simulação de votos ────────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">Simulação de Votos — Dep. Estadual PR</h2>
        <p className="text-xs text-muted-foreground mb-5">4 cenários projetados com base em estratégia e execução de campanha</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { num: "Cenário 1", title: "Inercial / sem estrutura política",           range: "8–14 mil votos",  result: "Suplência ou votação honrosa",      headerBg: "bg-red-600",    resultColor: "text-red-400",     desc: "André mantém apenas o conteúdo religioso, sem territorialização, agenda estadual ou organização de base.",                                   sistemaStatus: "Sistema atual suporta este nível", sistemaColor: "text-slate-400",  sistemaBg: "bg-slate-500/[0.08]"  },
            { num: "Cenário 2", title: "Base cristã organizada + Curitiba/SJP/RMC",  range: "18–28 mil votos", result: "Suplência forte ou disputa real",    headerBg: "bg-yellow-500", resultColor: "text-yellow-400",  desc: "André ativa sua base religiosa, transforma eventos em rede de apoiadores e produz conteúdo com linguagem pública.",                          sistemaStatus: "Sistema suporta com ajustes de perfil e bairro", sistemaColor: "text-yellow-400", sistemaBg: "bg-yellow-500/[0.08]" },
            { num: "Cenário 3", title: "Operação completa + NOVO + cauda majoritária",range: "32–48 mil votos", result: "Briga direta por cadeira",           headerBg: "bg-green-600",  resultColor: "text-green-400",   desc: "André se posiciona como candidato cristão preparado, trabalha territórios estratégicos e usa a força do NOVO.",                              sistemaStatus: "Sistema suporta com metas/canal — requer fechar GAPs ALTO", sistemaColor: "text-green-400", sistemaBg: "bg-green-500/[0.08]"  },
            { num: "Cenário 4", title: "Onda conservadora + nominata enxuta + recall",range: "50–68 mil votos", result: "Eleito com votação expressiva",      headerBg: "bg-green-800",  resultColor: "text-emerald-400", desc: "André como nome prioritário do NOVO, chapa majoritária cria onda real e rede estadual organizada.",                                           sistemaStatus: "Sistema suporta — fatores externos: nominata e tráfego pago", sistemaColor: "text-emerald-400", sistemaBg: "bg-emerald-500/[0.08]" },
          ].map((c) => (
            <div key={c.num} className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className={`${c.headerBg} px-4 py-2`}>
                <p className="text-xs font-bold text-white">{c.num}</p>
              </div>
              <div className="p-4 bg-white/[0.02]">
                <p className="text-sm font-semibold text-foreground mb-1">{c.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{c.desc}</p>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Faixa estimada</span>
                  <span className="font-bold text-foreground">{c.range}</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-muted-foreground">Resultado</span>
                  <span className={`font-semibold ${c.resultColor}`}>{c.result}</span>
                </div>
                <div className={`rounded-lg ${c.sistemaBg} px-3 py-2 flex items-start gap-1.5`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.sistemaColor}`} />
                  <p className={`text-xs ${c.sistemaColor}`}>{c.sistemaStatus}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Correlação STRIDE × Sistema ─────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">Correlação: STRIDE propõe × Sistema entrega</h2>
        <p className="text-xs text-muted-foreground mb-5">Item a item — o que já existe, o que falta e o que é serviço externo</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider pb-3 pr-4">Entregável STRIDE</th>
                <th className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider pb-3 px-4">Status</th>
                <th className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider pb-3 pl-4">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { e: "Formulário de apoiadores (cidade, WhatsApp)",                              s: "existe",  o: "Falta campo bairro para territorialização granular" },
                { e: "Grupos regionais por cidade",                                              s: "existe",  o: "Módulo /grupos ativo; campo zoneId já existe no schema" },
                { e: "Rastreio de origem do cadastro",                                          s: "existe",  o: "?ref=userId rastreia quem indicou; falta enum de canal" },
                { e: "Mapeamento por cidade priorizando RMC",                                   s: "existe",  o: "Mapa choropleth ativo; falta metas por município" },
                { e: "Segmentação: líder cristão, educador, jovem, pai, empreendedor",          s: "parcial", o: "profile enum tem PASTOR/VEREADOR/EMPRESARIO; faltam EDUCADOR, FAMILIA, JOVEM" },
                { e: "Relatórios de performance mensais",                                       s: "existe",  o: "XLSX 4 abas: Resumo, Cobertura, Colaboradores, Análise Política" },
                { e: "Funil de conversão",                                                      s: "existe",  o: "Aba Análise Política do XLSX; falta painel em tempo real" },
                { e: "Ranking de mobilização",                                                  s: "existe",  o: "/ranking em produção com scroll mobile" },
                { e: "Células por território",                                                  s: "existe",  o: "/celulas e /minha-celula com tiers automáticos" },
                { e: "Comunicados segmentados",                                                  s: "existe",  o: "/comunicados com filtro por audiência em tempo real" },
                { e: "Análise neural preditiva contínua",                                       s: "externo", o: "Core da oferta STRIDE — este relatório é a análise; não é infraestrutura" },
                { e: "Gestão de tráfego pago (Meta/Google Ads)",                                s: "externo", o: "Serviço de agência de mídia paga — não é sistema de CRM" },
                { e: "Copywriting político mensal",                                             s: "externo", o: "Produção criativa externa, não infraestrutura de CRM" },
                { e: "Estrutura de mobilização digital",                                        s: "existe",  o: "= Este sistema. CRM, células, grupos WA, ranking, mapa — em produção" },
              ].map((row) => {
                const badge =
                  row.s === "existe"  ? { label: "Existe",  cls: "bg-green-500/15 text-green-400 border-green-500/30"  } :
                  row.s === "parcial" ? { label: "Parcial", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" } :
                                        { label: "Externo", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30"      };
                return (
                  <tr key={row.e} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 text-xs text-foreground font-medium align-top">{row.e}</td>
                    <td className="py-3 px-4 align-top">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 pl-4 text-xs text-muted-foreground align-top">{row.o}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Breakdown R$300k ─────────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">O Que a STRIDE Realmente Vende por R$ 300.000</h2>
        <p className="text-xs text-muted-foreground mb-5">Desmembramento das 4 frentes e valor real de mercado</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { frente: "Análise neural preditiva",               valor: "R$ 15–25k",   real: true,  icon: Brain,      color: "text-green-400",  bg: "bg-green-500/[0.07]",  border: "border-green-500/20",  desc: "Já entregue neste PDF. Análise pontual — não é infraestrutura recorrente de alto custo."             },
            { frente: "Gestão de tráfego pago (Meta/Google)",   valor: "R$ 5–8k/mês", real: true,  icon: Target,     color: "text-blue-400",   bg: "bg-blue-500/[0.07]",   border: "border-blue-500/20",   desc: "Fee de agência de mídia. Serviço externo real que o sistema não substitui."                          },
            { frente: "Copywriting político + estratégia",      valor: "R$ 3–5k/mês", real: true,  icon: Lightbulb,  color: "text-yellow-400", bg: "bg-yellow-500/[0.07]", border: "border-yellow-500/20", desc: "Produção criativa mensal. Roteiros, textos, cartas de princípios. Externo."                          },
            { frente: "Estrutura de mobilização digital",       valor: "Já pago",     real: false, icon: Users,      color: "text-primary",    bg: "bg-primary/[0.07]",    border: "border-primary/20",    desc: "= nosso CRM em produção. Células, grupos WA, mapa, ranking, relatórios — tudo funcionando."          },
          ].map((f) => (
            <div key={f.frente} className={`rounded-xl border ${f.border} ${f.bg} p-4`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                  <p className={`text-sm font-semibold ${f.color}`}>{f.frente}</p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${f.real ? "text-foreground" : "text-primary"}`}>{f.valor}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              {!f.real && (
                <div className="mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">Substituído pelo nosso sistema</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-yellow-500/[0.07] border border-yellow-500/25 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400 mb-1">Conclusão do Breakdown</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Das 4 frentes, <strong className="text-foreground">2 já estão entregues pelo sistema</strong> (mobilização + relatórios). O valor real dos serviços externos equivale a <strong className="text-foreground">R$ 50–80k</strong> no mercado. A diferença é margem sobre infraestrutura que já existe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── GAPs críticos (dinâmico) ─────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">GAPs Críticos no Sistema</h2>
            <p className="text-xs text-muted-foreground">Status verificado ao vivo — atualiza automaticamente conforme as pendências são sanadas</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary/[0.07] border border-primary/20 px-3 py-1.5 self-start sm:self-auto">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-semibold">{resolved}/{gaps.length} resolvidos</span>
          </div>
        </div>
        <div className="space-y-3">
          {GAP_DEFS.map((gap, i) => {
            const gapResult = gaps[i];
            const rowBg =
              gapResult.status === "resolved" ? "bg-green-500/[0.04] border-green-500/15" :
              gapResult.status === "partial"  ? "bg-yellow-500/[0.04] border-yellow-500/15" :
                                               "bg-white/[0.02] border-white/[0.06]";
            const impactoCls =
              gap.impacto === "ALTO"  ? "bg-red-500/15 text-red-400 border-red-500/30" :
                                        "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
            return (
              <div key={gap.num} className={`flex items-start gap-4 rounded-xl border p-4 ${rowBg} transition-colors`}>
                <div className="text-2xl font-black text-muted-foreground/25 leading-none shrink-0 w-8 text-center">{gap.num}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{gap.titulo}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${impactoCls}`}>{gap.impacto}</span>
                    <StatusBadge status={gapResult.status} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{gap.desc}</p>
                  <p className={`text-xs font-medium italic ${
                    gapResult.status === "resolved" ? "text-green-400" :
                    gapResult.status === "partial"  ? "text-yellow-400" : "text-slate-500"
                  }`}>
                    → {gapResult.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recomendação estratégica ─────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-primary/20 gold-glow">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Recomendação Estratégica</h2>
            <p className="text-xs text-muted-foreground">Conclusão do cruzamento STRIDE × Sistema</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-red-500/[0.08] border border-red-500/25 p-4">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400 mb-1">Não contratar a STRIDE como sistema</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Nosso CRM já é a infraestrutura de mobilização que a STRIDE venderia por R$ 300k. Células, grupos WA, mapa, ranking, relatório XLSX com análise política — tudo em produção. Contratar seria pagar R$ 300k por algo que já existe.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-green-500/[0.08] border border-green-500/25 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-400 mb-1">Se contratar, apenas tráfego pago + conteúdo</p>
                <p className="text-xs text-muted-foreground leading-relaxed">O único valor real externo que a STRIDE entrega (e o sistema não substitui) é a gestão de tráfego pago segmentado e o copywriting político mensal. Valor justo de mercado: <strong className="text-foreground">R$ 8–13k/mês</strong> — não R$ 50k/mês.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-primary/[0.08] border border-primary/25 p-4">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Executar o plano das 4 semanas usando o sistema + fechar os GAPs</p>
                <p className="text-xs text-muted-foreground leading-relaxed">O roteiro semanal da STRIDE é excelente e 100% executável com nosso sistema. Com os {gaps.length} GAPs fechados, o sistema suporta o <strong className="text-foreground">Cenário 3 (32–48k votos)</strong> sem depender de infraestrutura externa. Progresso atual: <strong className="text-primary">{progressPct}% concluído</strong>.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Sistema desenvolvido por{" "}
              <strong className="text-foreground">Edson Luiz Silva</strong>
              {" "}· Verificação automática a cada acesso
            </span>
            <span className="text-primary font-medium">Confidencial — uso interno</span>
          </div>
        </div>
      </section>

    </div>
  );
}
