import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { db as globalDb } from "@/lib/db"; // UserCampaign vive no banco global
import { Users, MapPin, MessageCircle, Calendar, TrendingUp, Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { TIER_LABEL, TIER_THRESHOLDS } from "@/lib/contribution";
import { ROLE_LABEL } from "@/lib/labels";
import { CopyButton } from "@/components/dashboard/copy-button";
import { FunnelPanel } from "@/components/dashboard/funnel-panel";
import { ConversionPanel } from "@/components/dashboard/conversion-panel";
import { InstagramPanel } from "@/components/dashboard/instagram-panel";
import { VelocityPanel } from "@/components/dashboard/velocity-panel";
import { ElectionCountdown } from "@/components/dashboard/election-countdown";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Suspense } from "react";

// Sempre dinâmico — evita qualquer interação com cache em edge/build
export const dynamic = "force-dynamic";

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
  REUNIAO: "Reunião", CULTO: "Culto", PANFLETAGEM: "Panfletagem",
  TREINAMENTO: "Treinamento", VISITA: "Visita", OUTRO: "Outro",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const userId = session.user.id;
  const { db, cid: CID } = getCampaignContext(session);

  const [[total, byRole, cityRaw, groups, zones, upcomingEvents], [myTotal, myActive, myTier]] = await Promise.all([
    Promise.all([
      db.collaborator.count({ where: { campaignId: CID, status: "ACTIVE" } }),
      db.collaborator.groupBy({ by: ["campaignRole"], where: { campaignId: CID, status: "ACTIVE" }, _count: { id: true } }),
      db.collaborator.findMany({ where: { campaignId: CID, status: "ACTIVE", city: { not: null } }, select: { city: true, supportStatus: true, campaignRole: true } }),
      db.whatsAppGroup.count({ where: { campaignId: CID } }),
      db.zone.count({ where: { campaignId: CID } }),
      db.event.findMany({ where: { campaignId: CID, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 5, include: { zone: { select: { name: true } } } }),
    ]),
    Promise.all([
      userId ? db.collaborator.count({ where: { campaignId: CID, registeredById: userId } }) : Promise.resolve(0),
      userId ? db.collaborator.count({ where: { campaignId: CID, registeredById: userId, status: "ACTIVE" } }) : Promise.resolve(0),
      userId ? globalDb.userCampaign.findFirst({ where: { userId, campaignId: CID }, select: { tier: true } }) : Promise.resolve(null),
    ]),
  ]);

  // Agregar cobertura por cidade
  type CityData = { total: number; confirmados: number; hasLeader: boolean };
  const cityAgg: Record<string, CityData> = {};
  for (const c of cityRaw) {
    const city = c.city!;
    if (!cityAgg[city]) cityAgg[city] = { total: 0, confirmados: 0, hasLeader: false };
    cityAgg[city].total++;
    if (c.supportStatus === "CONFIRMADO") cityAgg[city].confirmados++;
    if (["COORD_GERAL","COORD_REGIONAL","LIDER_MUNICIPAL","LIDER_BAIRRO"].includes(c.campaignRole)) cityAgg[city].hasLeader = true;
  }
  const topCities = Object.entries(cityAgg).sort((a, b) => b[1].total - a[1].total).slice(0, 12);

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
    <div className="space-y-5 lg:space-y-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          Bem-vindo, {session?.user?.name?.split(" ")[0]}. Visão geral da base de apoio.
        </p>
      </div>

      <ElectionCountdown />

      {/* Banner de boas-vindas para quem ainda não cadastrou ninguém */}
      {myTotal === 0 && (
        <Link href="/onboarding" className="block glass-card rounded-2xl p-4 lg:p-5 border border-primary/20 bg-primary/[0.04] hover:border-primary/40 transition-colors touchable tap-transparent">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-sm">Comece por aqui</p>
              <p className="text-xs text-muted-foreground mt-0.5">Veja como usar a base de apoio e compartilhe seu link de cadastro</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary shrink-0" />
          </div>
        </Link>
      )}

      {/* KPI Cards — 2 cols mobile (denso), 4 lg+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <KpiCard icon={<Users className="w-3.5 h-3.5 text-primary" />}         label="Colaboradores"  value={total}                 href="/colaboradores" color="text-primary"     delay={0} />
        <KpiCard icon={<MapPin className="w-3.5 h-3.5 text-blue-400" />}        label="Zonas"          value={zones}                 href="/zonas"         color="text-blue-400"    delay={1} />
        <KpiCard icon={<MessageCircle className="w-3.5 h-3.5 text-green-400" />} label="Grupos WA"      value={groups}                href="/grupos"        color="text-green-400"   delay={2} />
        <KpiCard icon={<Calendar className="w-3.5 h-3.5 text-purple-400" />}    label="Próx. Eventos"  value={upcomingEvents.length}  href="/agenda"        color="text-purple-400"  delay={3} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Colaboradores por cargo */}
        <div className="glass-card rounded-2xl p-4 lg:p-6 border border-border lg:col-span-1">
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
                  <div className="h-1.5 bg-foreground/[0.06] rounded-full">
                    <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minha Célula */}
        <div className="glass-card rounded-2xl p-4 lg:p-6 border border-border lg:col-span-1">
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
              <div className="rounded-xl p-3 text-center bg-foreground/[0.03] border border-foreground/[0.06]">
                <p className="text-2xl font-bold text-primary">{myTotal}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cadastrados</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-foreground/[0.03] border border-foreground/[0.06]">
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
        <div className="glass-card rounded-2xl p-4 lg:p-6 border border-border lg:col-span-1">
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
                    <p className="text-sm font-medium text-foreground line-clamp-2">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABEL[ev.type]}{ev.zone ? ` · ${ev.zone.name}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Funil de conversão (status agregado) */}
      <FunnelPanel />

      {/* Funil de conversão WhatsApp (ContactLog) */}
      <ConversionPanel />

      {/* Instagram Analytics */}
      <InstagramPanel />

      {/* Velocidade por município */}
      <Suspense fallback={<div className="glass-card rounded-2xl p-6 border border-border h-32 animate-pulse" />}>
        <VelocityPanel db={db} cid={CID} />
      </Suspense>

      {/* Cobertura por município */}
      {topCities.length > 0 && (
        <div className="glass-card rounded-2xl p-4 lg:p-6 border border-border">
          <div className="flex items-center justify-between mb-4 lg:mb-5">
            <h2 className="text-sm font-semibold text-foreground">Cobertura por Município</h2>
            <Link href="/relatorio" className="text-xs text-primary hover:text-primary/80">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
            {topCities.map(([city, data]) => {
              const pct = data.total > 0 ? Math.round((data.confirmados / data.total) * 100) : 0;
              const borderColor = data.hasLeader ? "border-green-500/25" : "border-border";
              return (
                <div key={city} className={`p-3 rounded-xl bg-white/[0.03] border ${borderColor} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{city}</p>
                    {data.hasLeader && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 ml-1" />}
                  </div>
                  <p className="text-xl font-bold text-primary">{data.total}</p>
                  {data.total > 0 && (
                    <div className="space-y-1">
                      <div className="h-1 rounded-full bg-foreground/[0.06]">
                        <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      {data.confirmados > 0 && (
                        <p className="text-[10px] text-green-400">{data.confirmados} confirmado{data.confirmados !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Com liderança</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />Sem liderança definida</span>
          </div>
        </div>
      )}

    </div>
  );
}
