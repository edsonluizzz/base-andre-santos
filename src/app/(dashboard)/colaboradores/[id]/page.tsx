import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, Mail, Calendar, Star, UserCheck, ShieldCheck, ShieldAlert, Monitor, Zap, Radio, PhoneCall } from "lucide-react";
import { InviteToSystem } from "@/components/collaborators/invite-to-system";
import { EditCollaboratorButton } from "@/components/collaborators/edit-collaborator-button";
import { ContactTimeline } from "@/components/collaborators/contact-timeline";
import { CONTRIBUTION_OPTIONS, TIER_LABEL } from "@/lib/contribution";
import { ROLE_LABEL, PROFILE_LABEL, STATUS_LABEL } from "@/lib/labels";
import { calcMobilizationScore } from "@/lib/mobilization";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";


const SUPPORT_LABEL: Record<string, { label: string; color: string }> = {
  CONFIRMADO: { label: "Confirmado", color: "text-green-400" },
  NEGOCIANDO: { label: "Negociando", color: "text-yellow-400" },
  NEUTRO:     { label: "Neutro",     color: "text-slate-400"  },
  ADVERSARIO: { label: "Adversário", color: "text-red-400"    },
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "bg-green-500/15 text-green-400 border-green-500/30",
  LEAD:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  INACTIVE: "bg-red-500/10 text-red-400 border-red-500/20",
};

const CONTRIB_LABEL = Object.fromEntries(CONTRIBUTION_OPTIONS.map((o) => [o.value, o.label]));

export default async function CollaboratorProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) notFound();
  const { db, cid: CID } = getCampaignContext(session);
  const isAdmin = ["ADMIN", "LEADER"].includes(session.user.role ?? "");

  const collaborator = await db.collaborator.findFirst({
    where: { id: params.id, campaignId: CID },
    include: {
      zones:          { include: { zone: true } },
      whatsappGroups: { include: { group: true } },
      attendances:    { include: { event: { select: { title: true, date: true, type: true } } }, orderBy: { event: { date: "desc" } } },
      registeredBy:   { select: { name: true, email: true } },
      user:           { select: { id: true, name: true, email: true, userCampaigns: { where: { campaignId: CID }, select: { tier: true, role: true } } } },
    },
  });

  if (!collaborator) notFound();

  const attendanceCount = collaborator.attendances.filter((a) => a.status === "PRESENT").length;
  const computedScore = calcMobilizationScore({
    profile: collaborator.profile,
    supportStatus: collaborator.supportStatus,
    status: collaborator.status,
    contributionTypes: collaborator.contributionTypes,
    attendanceCount,
  });

  const tier = collaborator.user?.userCampaigns?.[0]?.tier;
  const whatsappHref = collaborator.phone
    ? `https://wa.me/${collaborator.phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/colaboradores" className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{collaborator.name}</h1>
          <p className="text-xs text-muted-foreground">{PROFILE_LABEL[collaborator.profile]} · {ROLE_LABEL[collaborator.campaignRole]}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[collaborator.status]}`}>
            {STATUS_LABEL[collaborator.status]}
          </span>
        </div>
      </div>

      {/* Informações principais */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Informações</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {collaborator.phone && (
            <a href={whatsappHref!} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-green-400 transition-colors">
              <Phone className="w-4 h-4 shrink-0" /> {collaborator.phone}
            </a>
          )}
          {collaborator.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" /> {collaborator.email}
            </div>
          )}
          {(collaborator.city || collaborator.neighborhood) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              {[collaborator.city, collaborator.neighborhood].filter(Boolean).join(" · ")}
            </div>
          )}
          {collaborator.birthday && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              {new Date(collaborator.birthday + "T12:00:00").toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>

        {collaborator.supportStatus && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Apoio ao André:</span>
            <span className={`text-xs font-semibold ${SUPPORT_LABEL[collaborator.supportStatus]?.color}`}>
              {SUPPORT_LABEL[collaborator.supportStatus]?.label}
            </span>
          </div>
        )}

        {/* Canal, fonte e último contato */}
        <div className="grid sm:grid-cols-3 gap-2 pt-1 border-t border-white/[0.06]">
          {collaborator.channel && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Canal: <span className="text-foreground">{collaborator.channel}</span></span>
            </div>
          )}
          {collaborator.source && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Fonte: <span className="text-foreground">{collaborator.source.replace("_", " ")}</span></span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            {collaborator.lastContactedAt ? (
              <span>Contato: <span className={differenceInDays(new Date(), new Date(collaborator.lastContactedAt)) > 30 ? "text-amber-400" : "text-green-400"}>
                {differenceInDays(new Date(), new Date(collaborator.lastContactedAt)) === 0 ? "hoje" : `${differenceInDays(new Date(), new Date(collaborator.lastContactedAt))}d atrás`}
              </span></span>
            ) : (
              <span className="text-red-400/70">Nunca contatado</span>
            )}
          </div>
        </div>

        {collaborator.notes && (
          <div className="pt-1 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground">{collaborator.notes}</p>
          </div>
        )}

        {isAdmin && (
          <div className="pt-2 border-t border-white/[0.06]">
            {collaborator.lgpdConsent ? (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                LGPD: consentimento registrado
                {collaborator.lgpdConsentAt && (
                  <span className="text-muted-foreground">
                    em {new Date(collaborator.lgpdConsentAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400/70">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                LGPD: sem consentimento registrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formas de contribuição */}
      {collaborator.contributionTypes.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-3">Formas de Contribuição</h2>
          <div className="flex flex-wrap gap-2">
            {collaborator.contributionTypes.map((t) => (
              <span key={t} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {CONTRIB_LABEL[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Registrado por / Tier */}
      {(collaborator.registeredBy || tier) && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Célula</h2>
          {collaborator.registeredBy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="w-4 h-4" />
              Cadastrado por: <span className="text-foreground">{collaborator.registeredBy.name ?? collaborator.registeredBy.email}</span>
            </div>
          )}
          {tier && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              Nível: <span className="text-foreground font-medium">{TIER_LABEL[tier]}</span>
            </div>
          )}
        </div>
      )}

      {/* Zonas e Grupos */}
      {(collaborator.zones.length > 0 || collaborator.whatsappGroups.length > 0) && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Vínculos</h2>
          {collaborator.zones.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Zonas</p>
              <div className="flex flex-wrap gap-2">
                {collaborator.zones.map((z) => (
                  <span key={z.zone.id} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-foreground">
                    {z.zone.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {collaborator.whatsappGroups.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Grupos WhatsApp</p>
              <div className="flex flex-wrap gap-2">
                {collaborator.whatsappGroups.map((g) => (
                  <span key={g.group.id} className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                    {g.group.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score de mobilização explicado */}
      {isAdmin && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Score de Mobilização
            </h2>
            <span className="text-2xl font-bold text-primary">{computedScore}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full mb-4">
            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${computedScore}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Perfil", detail: PROFILE_LABEL[collaborator.profile] },
              { label: "Status", detail: STATUS_LABEL[collaborator.status] },
              { label: "Apoio", detail: SUPPORT_LABEL[collaborator.supportStatus]?.label ?? collaborator.supportStatus },
              { label: "Contribuições", detail: `${collaborator.contributionTypes.length} tipo${collaborator.contributionTypes.length !== 1 ? "s" : ""} (+${collaborator.contributionTypes.length * 3} pts)` },
              { label: "Presenças", detail: `${attendanceCount} evento${attendanceCount !== 1 ? "s" : ""} (+${Math.min(20, attendanceCount * 2)} pts)` },
            ].map(({ label, detail }) => (
              <div key={label} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium truncate ml-2">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de contato */}
      <ContactTimeline collaboratorId={collaborator.id} />

      {/* Presenças em eventos */}
      {collaborator.attendances.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Eventos</h2>
            <span className="text-xs text-muted-foreground">{attendanceCount} presença{attendanceCount !== 1 ? "s" : ""} confirmada{attendanceCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {collaborator.attendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{a.event.title}</span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(a.event.date), "dd/MM/yy", { locale: ptBR })}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    a.status === "PRESENT"   ? "bg-green-500/15 text-green-400 border-green-500/30" :
                    a.status === "JUSTIFIED" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {a.status === "PRESENT" ? "✓" : a.status === "JUSTIFIED" ? "J" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acesso ao sistema */}
      {isAdmin && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Acesso ao Sistema
          </h2>
          {collaborator.user ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Usuário ativo:{" "}
              <span className="text-foreground">{collaborator.user.name ?? collaborator.user.email ?? "—"}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Este colaborador ainda não tem acesso ao sistema. Convide-o para que possa fazer login e cadastrar outros apoiadores.
              </p>
              <InviteToSystem
                collaboratorId={collaborator.id}
                collaboratorName={collaborator.name}
                defaultEmail={collaborator.email}
              />
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <Link href="/colaboradores"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        {isAdmin && (
          <EditCollaboratorButton collaborator={{
            id: collaborator.id,
            name: collaborator.name,
            email: collaborator.email,
            phone: collaborator.phone,
            city: collaborator.city,
            neighborhood: collaborator.neighborhood,
            campaignRole: collaborator.campaignRole,
            status: collaborator.status,
            notes: collaborator.notes,
            birthday: collaborator.birthday,
            profile: collaborator.profile,
            supportStatus: collaborator.supportStatus,
            contributionTypes: collaborator.contributionTypes,
            registeredBy: collaborator.registeredBy,
          }} />
        )}
      </div>
    </div>
  );
}
