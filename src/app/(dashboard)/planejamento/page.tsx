import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Target, BarChart2, Users, MapPin, Zap, Shield, Star,
  ChevronRight, Info, DollarSign, Brain, Megaphone,
  Heart, BookOpen, Lightbulb, Globe, Activity,
} from "lucide-react";

export default async function PlanejamentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user.role ?? "MEMBER") as string;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[3px] uppercase text-primary/70 mb-1">
            Inteligência Estratégica
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Análise STRIDE × Base André Santos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cruzamento do relatório neural da STRIDE.IA com o sistema em produção · Gerado em 07/05/2026
          </p>
        </div>
        <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2 border border-primary/20 self-start sm:self-auto">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-semibold">STRIDE.IA · Análise Neural</span>
        </div>
      </div>

      {/* ── KPIs da análise ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Score Atual", value: "68/100", sub: "Pré-candidato em construção", color: "text-yellow-400", icon: BarChart2 },
          { label: "Score Projetado", value: "76–82", sub: "Com operação completa", color: "text-green-400", icon: TrendingUp },
          { label: "Sentimento +", value: "91,4%", sub: "Dos 336 comentários analisados", color: "text-primary", icon: Heart },
          { label: "Engajamento", value: "1,96%", sub: "Posts próprios (50 analisados)", color: "text-blue-400", icon: Activity },
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

      {/* ── Contexto eleitoral ──────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">Contexto Eleitoral — Paraná 2026</h2>
        <p className="text-xs text-muted-foreground mb-5">Cenário proporcional para Deputado Estadual</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Eleitores PR", value: "8,4 mi" },
            { label: "Vagas Dep. Estadual", value: "54" },
            { label: "Quociente Eleitoral", value: "~111.676" },
            { label: "Cláusula Mínima (10%)", value: "~11.268" },
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

      {/* ── Scores detalhados ───────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-5">Scores Estratégicos — STRIDE.IA</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {[
            { label: "Base Digital",           score: 78, desc: "58k seguidores, boa média e picos fortes",                  color: "bg-yellow-400" },
            { label: "Sentimento Público",      score: 91, desc: "Comentários majoritariamente positivos, sem rejeição",      color: "bg-green-500" },
            { label: "Potencial de Crescimento",score: 82, desc: "Alto se construir agenda pública, não só religiosa",        color: "bg-green-400" },
            { label: "Autoridade Simbólica",    score: 86, desc: "Pastor, pregador, teólogo, filósofo, escritor",            color: "bg-green-500" },
            { label: "Conversão Política",      score: 48, desc: "Ainda falta transformar a figura espiritual em legislativa", color: "bg-yellow-500" },
            { label: "Risco de Rejeição",       score: 38, desc: "Baixo na base cristã; moderado no eleitor secular/NOVO",   color: "bg-red-400" },
            { label: "Territorialização no PR", score: 52, desc: "Base em Curitiba/SJP, mas presença nacional dilui conversão", color: "bg-yellow-400" },
            { label: "Competitividade Partidária",score:57, desc: "NOVO tem vitrine forte, mas nominata precisa ser robusta",  color: "bg-yellow-400" },
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
              { label: "Positivo", pct: 91.4, color: "bg-green-500", dot: "bg-green-500", desc: "Forte aprovação, admiração espiritual, respeito" },
              { label: "Neutro",   pct: 6.8,  color: "bg-slate-400", dot: "bg-slate-400", desc: "Perguntas, marcações, interações sem juízo" },
              { label: "Spam",     pct: 1.8,  color: "bg-yellow-500",dot: "bg-yellow-500",desc: "Divulgações externas sem relação eleitoral" },
              { label: "Negativo", pct: 0,    color: "bg-red-500",   dot: "bg-red-500",   desc: "Sem rejeição direta na amostra" },
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
            {
              num: "01", title: "Curitiba e Região Metropolitana",
              desc: "Núcleo natural. Base inicial em Curitiba, São José dos Pinhais, Pinhais, Colombo, Araucária, Fazenda Rio Grande, Campo Largo e Almirante Tamandaré.",
              icon: MapPin, color: "text-primary", border: "border-primary/20", bg: "bg-primary/[0.05]",
            },
            {
              num: "02", title: "Cinturão Evangélico AD",
              desc: "A força de André está no ecossistema assembleiano/pentecostal. Voto potencial vem de líderes, jovens, famílias e referências espirituais.",
              icon: Star, color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/[0.05]",
            },
            {
              num: "03", title: "Juventude Cristã",
              desc: "Conteúdos de congresso, avivamento, jovens e Gideões mostram conexão com público de alta intensidade emocional. Bom para viralização e mobilização.",
              icon: Zap, color: "text-blue-400", border: "border-blue-400/20", bg: "bg-blue-400/[0.05]",
            },
            {
              num: "04", title: "Interior por Circuitos de Eventos",
              desc: "Presença em eventos e congressos fora da RMC. Bom para autoridade, mas o que está fora do Paraná gera reputação — não necessariamente voto direto.",
              icon: Globe, color: "text-slate-400", border: "border-slate-400/20", bg: "bg-slate-400/[0.05]",
            },
          ].map((item) => (
            <div key={item.num} className={`rounded-xl border ${item.border} ${item.bg} p-5`}>
              <div className="flex items-start gap-3">
                <div className={`text-3xl font-black ${item.color} opacity-40 leading-none shrink-0`}>{item.num}</div>
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
            { icon: Heart,      label: "Família",         desc: "A família precisa voltar ao centro das políticas públicas." },
            { icon: BookOpen,   label: "Educação",        desc: "Escola deve formar caráter, conhecimento e responsabilidade." },
            { icon: Users,      label: "Juventude",       desc: "O Paraná precisa proteger e direcionar os jovens." },
            { icon: Shield,     label: "Liberdade",       desc: "O cidadão deve ter liberdade de fé, trabalho e consciência." },
            { icon: Activity,   label: "Saúde Emocional", desc: "Famílias destruídas geram jovens destruídos — Estado deve agir." },
            { icon: Star,       label: "Transparência",   desc: "Política precisa de gente limpa, preparada e com valores." },
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
        <p className="text-xs text-muted-foreground mb-5">4 cenários projetados pela STRIDE com base em estratégia e execução</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              num: "Cenário 1", title: "Inercial / sem estrutura política",
              range: "8 mil a 14 mil votos", result: "Suplência ou votação honrosa",
              desc: "André mantém apenas o conteúdo religioso, sem territorialização, agenda estadual ou organização de base.",
              headerBg: "bg-red-600", resultColor: "text-red-400",
              sistemaStatus: "Sistema atual suporta este nível",
              sistemaColor: "text-slate-400", sistemaBg: "bg-slate-500/[0.08]",
            },
            {
              num: "Cenário 2", title: "Base cristã organizada + Curitiba/SJP/RMC",
              range: "18 mil a 28 mil votos", result: "Suplência forte ou disputa real",
              desc: "André ativa sua base religiosa, transforma eventos em rede de apoiadores e produz conteúdo com linguagem pública.",
              headerBg: "bg-yellow-500", resultColor: "text-yellow-400",
              sistemaStatus: "Sistema suporta com ajustes de perfil e bairro",
              sistemaColor: "text-yellow-400", sistemaBg: "bg-yellow-500/[0.08]",
            },
            {
              num: "Cenário 3", title: "Operação completa + NOVO + cauda majoritária",
              range: "32 mil a 48 mil votos", result: "Briga direta por cadeira",
              desc: "André se posiciona como candidato cristão preparado, trabalha territórios estratégicos e usa a força do NOVO.",
              headerBg: "bg-green-600", resultColor: "text-green-400",
              sistemaStatus: "Sistema suporta com metas por município e canal de origem",
              sistemaColor: "text-green-400", sistemaBg: "bg-green-500/[0.08]",
            },
            {
              num: "Cenário 4", title: "Onda conservadora + nominata enxuta + recall evangélico",
              range: "50 mil a 68 mil votos", result: "Eleito com votação expressiva",
              desc: "André como nome prioritário do NOVO, chapa majoritária cria onda real e rede estadual organizada.",
              headerBg: "bg-green-800", resultColor: "text-emerald-400",
              sistemaStatus: "Sistema suporta — depende também de fatores externos (nominata, tráfego pago)",
              sistemaColor: "text-emerald-400", sistemaBg: "bg-emerald-500/[0.08]",
            },
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
                <th className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider pb-3 px-4">Status no Sistema</th>
                <th className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider pb-3 pl-4">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { entregavel: "Formulário de apoiadores (cidade, WhatsApp)", status: "existe", obs: "Falta campo bairro para territorialização granular" },
                { entregavel: "Grupos regionais por cidade", status: "existe", obs: "Módulo /grupos ativo, mas sem vínculo territorial automático" },
                { entregavel: "Rastreio de origem do cadastro", status: "existe", obs: "?ref=userId rastreia quem indicou, mas não o canal (Instagram, evento)" },
                { entregavel: "Mapeamento por cidade priorizando RMC", status: "existe", obs: "Mapa choropleth ativo; falta metas por município" },
                { entregavel: "Segmentação: líder cristão, educador, jovem, pai, empreendedor", status: "parcial", obs: "Campo profile existe com valores diferentes; precisa de enum novo" },
                { entregavel: "Relatórios de performance mensais", status: "existe", obs: "XLSX 4 abas: Resumo, Cobertura, Colaboradores, Análise Política" },
                { entregavel: "Funil de conversão", status: "existe", obs: "Aba Análise Política do XLSX; falta painel em tempo real no dashboard" },
                { entregavel: "Ranking de mobilização", status: "existe", obs: "/ranking em produção com scroll mobile" },
                { entregavel: "Células por território", status: "existe", obs: "/celulas e /minha-celula com tiers automáticos" },
                { entregavel: "Comunicados segmentados", status: "existe", obs: "/comunicados com filtro por audiência e contagem em tempo real" },
                { entregavel: "Análise neural preditiva contínua", status: "externo", obs: "Core da oferta STRIDE — este PDF é a análise; não é infraestrutura" },
                { entregavel: "Gestão de tráfego pago (Meta/Google Ads)", status: "externo", obs: "Não é sistema — é serviço de agência de mídia paga" },
                { entregavel: "Copywriting político mensal", status: "externo", obs: "Produção criativa externa, não infraestrutura de CRM" },
                { entregavel: "Estrutura de mobilização digital", status: "existe", obs: "= Este sistema. CRM, células, grupos WA, ranking, mapa — tudo em produção" },
              ].map((row) => {
                const badge =
                  row.status === "existe"  ? { label: "Existe", cls: "bg-green-500/15 text-green-400 border-green-500/30" } :
                  row.status === "parcial" ? { label: "Parcial", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" } :
                                            { label: "Externo", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
                return (
                  <tr key={row.entregavel} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 text-xs text-foreground font-medium align-top">{row.entregavel}</td>
                    <td className="py-3 px-4 align-top">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 pl-4 text-xs text-muted-foreground align-top">{row.obs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── O que a STRIDE realmente vende ───────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">O Que a STRIDE Realmente Vende por R$ 300.000</h2>
        <p className="text-xs text-muted-foreground mb-5">Desmembramento das 4 frentes e valor real de mercado</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            {
              frente: "Análise neural preditiva", valor: "R$ 15–25k", real: true,
              desc: "Já entregue neste PDF. Análise pontual — não é infraestrutura recorrente de alto custo.",
              icon: Brain, color: "text-green-400", bg: "bg-green-500/[0.07]", border: "border-green-500/20",
            },
            {
              frente: "Gestão de tráfego pago (Meta/Google Ads)", valor: "R$ 5–8k/mês", real: true,
              desc: "Fee de agência de mídia. Serviço externo real, que o sistema não substitui.",
              icon: Target, color: "text-blue-400", bg: "bg-blue-500/[0.07]", border: "border-blue-500/20",
            },
            {
              frente: "Copywriting político + estratégia de conteúdo", valor: "R$ 3–5k/mês", real: true,
              desc: "Produção criativa mensal. Roteiros, texts, cartas de princípios. Externo.",
              icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/[0.07]", border: "border-yellow-500/20",
            },
            {
              frente: "Estrutura de mobilização digital", valor: "Já pago", real: false,
              desc: "= nosso CRM em produção. Células, grupos WA, mapa, ranking, relatórios.",
              icon: Users, color: "text-primary", bg: "bg-primary/[0.07]", border: "border-primary/20",
            },
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
                Das 4 frentes, <strong className="text-foreground">2 já estão entregues pelo sistema</strong> (mobilização + relatórios).
                O valor real dos serviços externos (análise + mídia + conteúdo) equivale a <strong className="text-foreground">R$ 50–80k</strong> no mercado.
                A diferença é margem sobre infraestrutura que já existe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── GAPs identificados ───────────────────────────────────────────── */}
      <section className="glass-card rounded-2xl p-6 border border-white/[0.07]">
        <h2 className="text-lg font-bold text-foreground mb-1">GAPs Críticos no Sistema</h2>
        <p className="text-xs text-muted-foreground mb-5">O que a STRIDE identificou corretamente como ausente — ordenado por impacto eleitoral</p>
        <div className="space-y-3">
          {[
            {
              num: "01", impacto: "ALTO",  impactoCls: "bg-red-500/15 text-red-400 border-red-500/30",
              titulo: "Tipo de Liderança",
              desc: "Campo profile existe, mas com valores do sistema original. Faltam: LIDER_RELIGIOSO, EDUCADOR, FAMILIA, JOVEM, EMPREENDEDOR. Sem isso, comunicados e mapa não conseguem segmentar por nicho.",
            },
            {
              num: "02", impacto: "ALTO",  impactoCls: "bg-red-500/15 text-red-400 border-red-500/30",
              titulo: "Campo Bairro no Cadastro",
              desc: "O cadastro público coleta cidade, mas não bairro. Para territorialização granular na RMC (Curitiba, SJP, Pinhais, Colombo, Araucária, FRG, Campo Largo, Almirante Tamandaré) o bairro é essencial.",
            },
            {
              num: "03", impacto: "ALTO",  impactoCls: "bg-red-500/15 text-red-400 border-red-500/30",
              titulo: "Canal de Origem do Cadastro",
              desc: "?ref=userId rastreia quem indicou, mas não o CANAL (Instagram bio, Story, WhatsApp, evento físico). Sem isso, impossível saber qual ação digital converte mais apoiadores.",
            },
            {
              num: "04", impacto: "ALTO",  impactoCls: "bg-red-500/15 text-red-400 border-red-500/30",
              titulo: "Metas por Município / Painel RMC",
              desc: "O mapa mostra o que existe, não o que falta. Para o Cenário 3 (32–48k votos), precisa de META por cidade e painel mostrando atual vs. meta nos 8 municípios prioritários.",
            },
            {
              num: "05", impacto: "MÉDIO", impactoCls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
              titulo: "Score de Potencial do Colaborador",
              desc: "Não há score combinando: status ativo + WA confirmado + indicações + cidade estratégica + perfil de liderança. Isso permitiria priorizar quem contactar e quem promover.",
            },
            {
              num: "06", impacto: "MÉDIO", impactoCls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
              titulo: "Painel de Conversão em Tempo Real",
              desc: "O funil existe no XLSX mas não no dashboard em tempo real. Para executar o plano das 4 semanas, precisa ver diariamente: Instagram → Cadastro → Célula Ativa.",
            },
            {
              num: "07", impacto: "MÉDIO", impactoCls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
              titulo: "Grupos WhatsApp por Território",
              desc: "Os grupos existem sem vínculo territorial automático. O sistema deveria sugerir/criar grupo por cidade quando ela atinge X colaboradores.",
            },
          ].map((gap) => (
            <div key={gap.num} className="flex items-start gap-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <div className="text-2xl font-black text-muted-foreground/30 leading-none shrink-0 w-8 text-center">{gap.num}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{gap.titulo}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${gap.impactoCls}`}>{gap.impacto}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{gap.desc}</p>
              </div>
            </div>
          ))}
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
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nosso CRM já é a infraestrutura de mobilização que a STRIDE venderia por R$ 300k.
                  Células, grupos WA, mapa, ranking, relatório XLSX com análise política — tudo em produção.
                  Contratar a STRIDE como sistema seria pagar R$ 300k por algo que já existe.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-green-500/[0.08] border border-green-500/25 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-400 mb-1">Se contratar, apenas tráfego pago + conteúdo</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O único valor real externo que a STRIDE entrega (e o sistema não substitui) é a gestão de
                  tráfego pago segmentado geograficamente e o copywriting político mensal.
                  Valor justo de mercado: <strong className="text-foreground">R$ 8–13k/mês</strong> — não R$ 50k/mês.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-primary/[0.08] border border-primary/25 p-4">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Executar o plano das 4 semanas usando o sistema + fechar os GAPs</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O roteiro semanal da STRIDE é excelente e 100% executável com nosso sistema.
                  A conversão de audiência em base (Semana 2), a territorialização (Semana 3) e a
                  ativação política (Semana 4) são exatamente o que os módulos de cadastro, células,
                  grupos e mapa já fazem. Com os GAPs fechados, o sistema suporta o <strong className="text-foreground">Cenário 3 (32–48k votos)</strong> sem depender de infraestrutura externa.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <p className="text-xs text-muted-foreground text-center">
            Análise gerada pela SCRYTA para a Base André Santos · 07/05/2026 ·{" "}
            <span className="text-primary">Confidencial — uso interno</span>
          </p>
        </div>
      </section>

    </div>
  );
}
