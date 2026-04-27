import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Users, MapPin, MessageCircle, Calendar, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import { TIER_LABEL, TIER_THRESHOLDS } from "@/lib/contribution";
import { CopyButton } from "@/components/dashboard/copy-button";

const CID = "andre-santos-2026";

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL:     "Coord. Geral",
  COORD_REGIONAL:  "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal",
  LIDER_BAIRRO:    "Líder de Bairro",
  VOLUNTARIO:      "Voluntário",
};

const ROLE_COLOR: Record<string, string> = {
  COORD_GERAL:     "text-yellow-400",
  COORD_REGIONAL:  "text-blue-400",
  LIDER_MUNICIPAL: "text-green-400",
  LIDER_BAIRRO:    "text-purple-400",
  VOLUNTARIO:      "text-slate-400",
};

const TIER_COLOR: Record<string, string> = {
  APOIADOR:    "text-slate-400",
  ATIVISTA:    "text-blue-400",
  LIDER_CELULA:"text-green-400",
  COORDENADOR: "text-yellow-400",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  REUNIAO: "Reunião", COMICIO: "Comício", PANFLETAGEM: "Panfletagem",
  TREINAMENTO: "Treinamento", VISITA: "Visita", OUTRO: "Outro",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [total, byRole, topCities, groups, zones, upcomingEvents, myTotal, myActive, myTier] = await Promise.all([
    db.collaborator.count({ where: { campaignId: CID, status: "ACTIVE" } }),
    db.collaborator.groupBy({ by: ["campaignRole"], where: { campaignId: CID, status: "ACTIVE" }, _count: { id: true } }),
    db.collaborator.groupBy({ by: ["city"], where: { campaignId: CID, status: "ACTIVE", city: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 6 }),
    db.whatsAppGroup.count({ where: { campaignId: CID } }),
    db.zone.count({ where: { campaignId: CID } }),
    db.event.findMany({ where: { campaignId: CID, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 5, include: { zone: { select: { name: true } } } }),
    userId ? db.collaborator.count({ where: { campaignId: CID, registeredById: userId } }) : Promise.resolve(0),
    userId ? db.collaborator.count({ where: { campaignId: CID, registeredById: userId, status: "ACTIVE" } }) : Promise.resolve(0),
    userId ? db.userCampaign.findFirst({ where: { userId, campaignId: CID }, select: { tier: true } }) : Promise.resolve(null),
  ]);

  const roleMap = Object.fromEntries(byRole.map((r) => [r.campaignRole, r._count.id]));
  const tier = myTier?.tier ?? "APOIADOR";

  const appUrl = process.env.APP_URL ?? "";
  const referralLink = userId ? `${appUrl}/cadastro?ref=${userId}` : "";

  function nextTierInfo() {
    if (tier === "APOIADOR") return { label: "Ativista", needed: Math.max(0, TIER_THRESHOLDS.ATIVISTA - myActive) };
    if (tier === "ATIVISTA") return { label: "Líder de Célula", needed: Math.max(0, TIER_THRESHOLDS.LIDER_CELULA - myActive) };
    return null;
  }
  const next = nextTierInfo();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo, {session?.user?.name?.split(" ")[0]}. Visão geral da base de apoio.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,         label: "Colaboradores", value: total,               href: "/colaboradores", color: "text-primary"    },
          { icon: MapPin,        label: "Zonas",          value: zones,               href: "/zonas",         color: "text-blue-400"   },
          { icon: MessageCircle, label: "Grupos WA",      value: groups,              href: "/grupos",        color: "text-green-400"  },
          { icon: Calendar,      label: "Próx. Eventos",  value: upcomingEvents.length, href: "/agenda",      color: "text-purple-400" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="glass-card rounded-2xl p-5 hover:border-primary/30 transition-colors border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colaboradores por cargo */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] lg:col-span-1">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Por Cargo</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(ROLE_LABEL).map(([role, label]) => {
              const count = roleMap[role] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={ROLE_COLOR[role]}>{label}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full">
                    <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minha Célula */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] lg:col-span-1">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Minha Célula</h2>
          </div>
          <div className="space-y-4">
            {/* Tier atual */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível atual</span>
              <span className={`text-sm font-bold ${TIER_COLOR[tier]}`}>{TIER_LABEL[tier]}</span>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center bg-white/[0.03] border border-white/[0.06]">
                <p className="text-2xl font-bold text-primary">{myTotal}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cadastrados</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-white/[0.03] border border-white/[0.06]">
                <p className="text-2xl font-bold text-green-400">{myActive}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ativos</p>
              </div>
            </div>

            {/* Progresso para próximo tier */}
            {next && (
              <p className="text-xs text-muted-foreground text-center">
                {next.needed === 0
                  ? `Pronto para ser ${next.label}!`
                  : `Faltam ${next.needed} ativo${next.needed !== 1 ? "s" : ""} para ${next.label}`}
              </p>
            )}
            {tier === "LIDER_CELULA" && (
              <p className="text-xs text-muted-foreground text-center">Coordenador é atribuído pelo admin</p>
            )}

            {/* Link de convite */}
            {referralLink && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Seu link de cadastro</p>
                <CopyButton value={referralLink} />
              </div>
            )}
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Próximos Eventos</h2>
            </div>
            <Link href="/agenda" className="text-xs text-primary hover:text-primary/80">Ver todos</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento agendado</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3">
                  <div className="text-center min-w-[36px]">
                    <p className="text-lg font-bold text-primary leading-none">{new Date(ev.date).getDate()}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">{new Date(ev.date).toLocaleDateString("pt-BR", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABEL[ev.type]}{ev.zone ? ` · ${ev.zone.name}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top municípios */}
      {topCities.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-5">Colaboradores por Município</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topCities.map((c) => (
              <div key={c.city} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xl font-bold text-primary">{c._count.id}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{c.city}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
