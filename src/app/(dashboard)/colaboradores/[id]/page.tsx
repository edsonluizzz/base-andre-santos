import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, Mail, Calendar, Star, Users, UserCheck } from "lucide-react";
import { CONTRIBUTION_OPTIONS, TIER_LABEL } from "@/lib/contribution";

const CID = "andre-santos-2026";

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL: "Coord. Geral", COORD_REGIONAL: "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal", LIDER_BAIRRO: "Líder de Bairro", VOLUNTARIO: "Voluntário",
};
const PROFILE_LABEL: Record<string, string> = {
  APOIADOR: "Apoiador", PASTOR: "Pastor", PRESIDENTE_ASSOCIACAO: "Pres. Associação",
  LIDER_POLITICO: "Líder Político", VEREADOR: "Vereador",
  EMPRESARIO: "Empresário", LIDERANCA_COMUNITARIA: "Liderança Comunit.",
};
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
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Ativo", LEAD: "Lead", INACTIVE: "Inativo" };

const CONTRIB_LABEL = Object.fromEntries(CONTRIBUTION_OPTIONS.map((o) => [o.value, o.label]));

export default async function CollaboratorProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const isAdmin = ["ADMIN", "LEADER"].includes(session?.user?.role ?? "");

  const collaborator = await db.collaborator.findFirst({
    where: { id: params.id, campaignId: CID },
    include: {
      zones:          { include: { zone: true } },
      whatsappGroups: { include: { group: true } },
      attendances:    { include: { event: { select: { title: true, date: true, type: true } } }, orderBy: { event: { date: "desc" } }, take: 5 },
      registeredBy:   { select: { name: true, email: true } },
      user:           { select: { id: true, userCampaigns: { where: { campaignId: CID }, select: { tier: true, role: true } } } },
    },
  });

  if (!collaborator) notFound();

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

        {collaborator.notes && (
          <div className="pt-1 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground">{collaborator.notes}</p>
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

      {/* Presenças recentes */}
      {collaborator.attendances.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-3">Eventos Recentes</h2>
          <div className="space-y-2">
            {collaborator.attendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{a.event.title}</span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.event.date).toLocaleDateString("pt-BR")}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    a.status === "PRESENT" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                    a.status === "JUSTIFIED" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {a.status === "PRESENT" ? "Presente" : a.status === "JUSTIFIED" ? "Justificado" : "Ausente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      {isAdmin && (
        <div className="flex gap-3">
          <Link href={`/colaboradores`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      )}
    </div>
  );
}
