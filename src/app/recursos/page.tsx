import Link from "next/link";
import {
  Cross,
  Users,
  UserPlus,
  Music2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Cake,
  DollarSign,
  Shirt,
  FileBarChart,
  Bell,
  Settings,
  CreditCard,
  Shield,
  Smartphone,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Recursos — Ovile Gestão",
  description:
    "Tudo que sua liderança precisa para gerir membros, presença, financeiro e muito mais.",
};

const SECTIONS = [
  {
    number: "01",
    title: "Gestão de Membros",
    color: "#a5b4fc",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
    icon: Users,
    items: [
      "Ficha cadastral completa: nome, data de nascimento, telefone, e-mail, foto e observações.",
      "Status Ativo/Inativo com controle do ciclo de vida.",
      "Busca por nome ou telefone; filtros por status, ministério e gênero.",
      "Importação/exportação por planilha Excel (XLSX) — centenas de membros de uma vez.",
      "Convite via WhatsApp direto do card do membro.",
      "Vinculação automática do e-mail ao login Google do membro.",
    ],
  },
  {
    number: "02",
    title: "Entrada de Novos Membros",
    color: "#c4b5fd",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    icon: UserPlus,
    items: [
      "Código de convite (Join Code) gerado ou revogado direto nas Configurações.",
      "Entrada via link: o membro faz login com o Google e já está dentro — sem formulário.",
      "Notificação ao admin quando alguém entra via link.",
      "E-mail automático ao promover um membro a Líder ou Admin.",
    ],
  },
  {
    number: "03",
    title: "Ministérios e Departamentos",
    color: "#86efac",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
    icon: Music2,
    items: [
      "Criação ilimitada de grupos: Louvor, Kids, Jovens, Intercessão e outros.",
      "Coordenadores e membros definidos por ministério.",
      "Filtro por ministério em eventos, chamada e financeiro.",
    ],
  },
  {
    number: "04",
    title: "Eventos e Calendário",
    color: "#fcd34d",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.25)",
    icon: Calendar,
    items: [
      "Calendário interativo no dashboard — clique em qualquer dia para criar ou ver um evento.",
      "Tipos: Culto, Ensaio, Reunião, Retiro e outros.",
      "Notificação automática para todos os membros ao criar um evento.",
      "Link direto para o evento — compartilhe com um clique.",
    ],
  },
  {
    number: "05",
    title: "Presença (Chamada) e QR Code",
    color: "#c4b5fd",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    icon: ClipboardList,
    items: [
      "Registro de chamada: Presente, Ausente ou Justificado.",
      "Justificativa de falta com campo de texto.",
      "RSVP — membros confirmam presença pelo portal antes do evento.",
      "Botão direto para contatar ausentes pelo WhatsApp.",
      "QR Code: projete ou imprima e deixe o membro confirmar a própria presença pelo celular.",
    ],
  },
  {
    number: "06",
    title: "Portal do Membro",
    color: "#fda4af",
    bg: "rgba(251,113,133,0.12)",
    border: "rgba(251,113,133,0.25)",
    icon: LayoutDashboard,
    items: [
      "Área exclusiva com histórico de presença e próximos eventos.",
      "Confirmação de presença (RSVP) diretamente pelo portal.",
      "Atualização de perfil pelo próprio membro.",
      "Tour de onboarding na primeira vez (guia em 3 telas).",
    ],
  },
  {
    number: "07",
    title: "Comunicados",
    color: "#7dd3fc",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
    icon: Megaphone,
    items: [
      "Envio para toda a congregação com escolha de destinatários.",
      "Entrega simultânea por e-mail e notificação in-app.",
      "Histórico completo de tudo que foi enviado.",
    ],
  },
  {
    number: "08",
    title: "Aniversariantes",
    color: "#fda4af",
    bg: "rgba(251,113,133,0.12)",
    border: "rgba(251,113,133,0.25)",
    icon: Cake,
    items: [
      "Página de aniversariantes por mês.",
      "Parabenização automática todo dia às 8h por e-mail e notificação.",
      "Aniversários marcados como pontos no calendário do dashboard.",
    ],
  },
  {
    number: "09",
    title: "Gestão Financeira",
    color: "#6ee7b7",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.25)",
    icon: DollarSign,
    items: [
      "Registro de ofertas e entradas vinculadas a membro, evento ou ministério.",
      "Controle de despesas por categoria (Alimentação, Transporte, Material…).",
      "Múltiplas contas bancárias: banco, caixa interno e PIX.",
      "DRE mensal e anual: entradas vs. saídas com transparência total.",
      "Métodos de pagamento: Dinheiro e PIX.",
    ],
  },
  {
    number: "10",
    title: "Camisetas e Congressos",
    color: "#f9a8d4",
    bg: "rgba(236,72,153,0.10)",
    border: "rgba(236,72,153,0.25)",
    icon: Shirt,
    badge: "PRO",
    items: [
      "Pedidos organizados por tamanho (PP ao XXG), cor e quantidade — sem papel.",
      "Fluxo de produção: Pendente → Pago → Em Produção → Pronto → Entregue.",
      "Upload de comprovante de pagamento pelo membro; validação pelo admin.",
      "Preço configurável por congresso ou lote.",
    ],
  },
  {
    number: "11",
    title: "Relatórios",
    color: "#a5f3fc",
    bg: "rgba(6,182,212,0.10)",
    border: "rgba(6,182,212,0.25)",
    icon: FileBarChart,
    badge: "PRO",
    items: [
      "Exportação de dados de presença, membros e financeiro.",
      "Relatório semanal automático por e-mail toda segunda-feira.",
    ],
  },
  {
    number: "12",
    title: "Notificações",
    color: "#fde68a",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.25)",
    icon: Bell,
    items: [
      "Sino in-app sempre atualizado com central de notificações.",
      "E-mails automáticos para aniversários, eventos, promoções e comunicados.",
    ],
  },
  {
    number: "13",
    title: "Configurações e Permissões",
    color: "#d1d5db",
    bg: "rgba(156,163,175,0.10)",
    border: "rgba(156,163,175,0.25)",
    icon: Settings,
    items: [
      "Dados da congregação: nome e logo.",
      "Código de convite: gere ou revogue a qualquer momento.",
      "Gestão de usuários: adicione, promova ou remova membros da equipe.",
      "Permissões por cargo (Admin, Líder, Membro) — módulo por módulo.",
    ],
  },
  {
    number: "14",
    title: "Assinatura",
    color: "#86efac",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
    icon: CreditCard,
    items: [
      "Portal do Stripe para atualizar cartão, trocar de plano ou ver histórico.",
      "Plano FREE (até 50 membros) e PRO (ilimitado, R$ 29,99/mês).",
    ],
  },
  {
    number: "15",
    title: "Segurança e Privacidade",
    color: "#a5b4fc",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
    icon: Shield,
    items: [
      "Login com Google — sem senha para lembrar ou vazar.",
      "Dados isolados por congregação — nenhuma congregação acessa dados de outra.",
      "Hierarquia de acesso: Admin, Líder e Membro.",
      "Conformidade LGPD: Termos de Uso e Política de Privacidade.",
    ],
  },
  {
    number: "16",
    title: "App no Celular (PWA)",
    color: "#7dd3fc",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
    icon: Smartphone,
    items: [
      "Instale sem loja de apps — adicione à tela inicial em iOS e Android.",
      "Abre em tela cheia, sem barra do navegador.",
    ],
  },
];

export default function RecursosPage() {
  return (
    <div className="min-h-screen" style={{ background: "#06080F", color: "#e2e8f0" }}>
      {/* Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #1e2456 0%, #06080F 65%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-16">
        {/* Nav */}
        <div className="flex items-center gap-3 mb-14">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
              <Cross className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
              Ovile
            </span>
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm text-slate-500">Recursos</span>
        </div>

        {/* Hero */}
        <div className="mb-16">
          <p className="text-xs tracking-[4px] uppercase text-indigo-400/70 mb-3">
            Funcionalidades
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tudo que sua liderança precisa
          </h1>
          <p className="text-slate-400 text-base max-w-xl leading-relaxed">
            Cada módulo foi pensado para simplificar o dia a dia da gestão, sem
            curva de aprendizado.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div
              key={s.number}
              className="rounded-2xl p-6 md:p-8"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-semibold text-white">{s.title}</h2>
                    {s.badge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(99,102,241,0.2)",
                          border: "1px solid rgba(99,102,241,0.4)",
                          color: "#a5b4fc",
                        }}
                      >
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">#{s.number}</p>
                </div>
              </div>

              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                      style={{ background: s.color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 0 24px rgba(99,102,241,0.35)",
            }}
          >
            Começar grátis
            <ChevronRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-slate-600 mt-3">Sem cartão de crédito necessário</p>
        </div>
      </div>
    </div>
  );
}
