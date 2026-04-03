"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  TrendingUp,
  Trophy,
  UserX,
  Shirt,
  Phone,
  Cake,
  CalendarCheck2,
  Loader2,
  Camera,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";
type ShirtOrderStatus =
  | "PENDING"
  | "PAID"
  | "PRODUCTION"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

type PortalData =
  | { linked: false }
  | {
      linked: true;
      member: {
        id: string;
        name: string;
        phone: string | null;
        photoUrl: string | null;
        birthday: string | null;
        status: "ACTIVE" | "INACTIVE";
      };
      attendances: Array<{
        id: string;
        status: AttendanceStatus;
        event: { id: string; title: string; type: string; date: string };
      }>;
      stats: {
        total: number;
        present: number;
        attendanceRate: number | null;
        rankPosition: number;
        totalActive: number;
      };
      shirtOrders: Array<{
        id: string;
        size: string;
        quantity: number;
        paidAmount: number;
        totalAmount: number;
        status: ShirtOrderStatus;
        congress: { id: string; name: string; date: string };
      }>;
    };

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
};

const ATTENDANCE_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "text-emerald-400",
  ABSENT: "text-destructive",
  JUSTIFIED: "text-yellow-400",
};

const SHIRT_STATUS_LABELS: Record<ShirtOrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  PRODUCTION: "Em produção",
  READY: "Pronto para retirada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const SHIRT_STATUS_STYLES: Record<ShirtOrderStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400",
  PAID: "bg-emerald-500/10 text-emerald-400",
  PRODUCTION: "bg-blue-500/10 text-blue-400",
  READY: "bg-primary/10 text-accent-foreground",
  DELIVERED: "bg-muted/20 text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

// ─── Main Component ───────────────────────────────────────────────────────────

type UpcomingEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  location: string | null;
  rsvpCount: number;
  myRsvp: boolean;
};

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    const res = await fetch("/api/events/rsvp");
    if (res.ok) setUpcomingEvents(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/me").then((r) => r.json()),
      fetchUpcoming(),
    ])
      .then(([portalData]) => { setData(portalData); setLoading(false); })
      .catch(() => setLoading(false));
  }, [fetchUpcoming]);

  async function handleRsvp(event: UpcomingEvent) {
    setRsvpLoading(event.id);
    try {
      if (event.myRsvp) {
        const res = await fetch(`/api/events/rsvp?eventId=${event.id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("Confirmação cancelada");
          fetchUpcoming();
        }
      } else {
        const res = await fetch("/api/events/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
        });
        if (res.ok) {
          toast.success("Presença confirmada!");
          fetchUpcoming();
        } else {
          const err = await res.json();
          toast.error(err.error ?? "Erro ao confirmar");
        }
      }
    } finally {
      setRsvpLoading(null);
    }
  }

  if (loading) return <PortalSkeleton />;

  if (!data || !data.linked) return <UnlinkedState />;

  const { stats, attendances, shirtOrders } = data;
  const [member, setMember] = useState(data.member);
  const activeOrders = shirtOrders.filter((o) => o.status !== "CANCELLED");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Meu Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu histórico e informações pessoais</p>
      </div>

      {/* Profile Card */}
      <ProfileCard
        member={member}
        onPhotoUpdate={(url) => setMember((m) => ({ ...m, photoUrl: url }))}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Presenças"
          value={`${stats.present} / ${stats.total}`}
          icon={CheckCircle2}
          description="nos últimos eventos registrados"
        />
        <StatCard
          title="Frequência"
          value={stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—"}
          icon={TrendingUp}
          variant={
            stats.attendanceRate !== null && stats.attendanceRate >= 70
              ? "success"
              : "default"
          }
          description={
            stats.attendanceRate !== null
              ? stats.attendanceRate >= 70
                ? "Ótima frequência!"
                : "Continue vindo mais!"
              : "Sem eventos registrados"
          }
        />
        <StatCard
          title="Ranking"
          value={stats.totalActive > 0 ? `${stats.rankPosition}º` : "—"}
          icon={Trophy}
          variant="purple"
          description={`de ${stats.totalActive} membros ativos`}
        />
      </div>

      {/* Upcoming Events RSVP */}
      {upcomingEvents.length > 0 && (
        <UpcomingEventsSection
          events={upcomingEvents}
          rsvpLoading={rsvpLoading}
          onRsvp={handleRsvp}
          memberLinked={data.linked}
        />
      )}

      {/* Attendance History */}
      <AttendanceHistory attendances={attendances} />

      {/* Shirt Orders */}
      <ShirtOrdersSection orders={activeOrders} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileCard({
  member,
  onPhotoUpdate,
}: {
  member: Extract<PortalData, { linked: true }>["member"];
  onPhotoUpdate: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/portal/photo", { method: "POST", body: form });
    if (res.ok) {
      const { photoUrl } = await res.json();
      onPhotoUpdate(photoUrl);
      toast.success("Foto atualizada!");
    } else {
      toast.error("Erro ao enviar foto");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleRemove() {
    const res = await fetch("/api/portal/photo", { method: "DELETE" });
    if (res.ok) { onPhotoUpdate(null); toast.success("Foto removida"); }
  }

  return (
    <div className="glass-card p-6 flex items-center gap-5">
      <div className="relative flex-shrink-0 group">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-16 h-16 rounded-full object-cover border border-primary/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
            {initials}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Alterar foto"
        >
          {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
        {member.phone && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            {member.phone}
          </p>
        )}
        {member.birthday && (
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Cake className="w-3.5 h-3.5" />
            Aniversário: {member.birthday}
          </p>
        )}
        {member.photoUrl && (
          <button onClick={handleRemove} className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors">
            Remover foto
          </button>
        )}
      </div>
    </div>
  );
}

function AttendanceHistory({
  attendances,
}: {
  attendances: Extract<PortalData, { linked: true }>["attendances"];
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4">Histórico de Frequência</h2>
      {attendances.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground text-sm">
          Nenhum evento registrado ainda.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium">Evento</th>
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell">Data</th>
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((a, i) => (
                <tr
                  key={a.id}
                  className={`border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                >
                  <td className="px-4 py-2.5 text-foreground font-medium">
                    {a.event.title}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                    {format(new Date(a.event.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${ATTENDANCE_STYLES[a.status]}`}>
                      {ATTENDANCE_LABELS[a.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ShirtOrdersSection({
  orders,
}: {
  orders: Extract<PortalData, { linked: true }>["shirtOrders"];
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4">Pedidos de Camiseta</h2>
      {orders.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Shirt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum pedido de camiseta encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const paidPercent =
              o.totalAmount > 0
                ? Math.min(100, Math.round((o.paidAmount / o.totalAmount) * 100))
                : 0;

            return (
              <div key={o.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{o.congress.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(o.congress.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                      {" · "}Tamanho {o.size}
                      {o.quantity > 1 && ` · Qtd: ${o.quantity}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${SHIRT_STATUS_STYLES[o.status]}`}
                  >
                    {SHIRT_STATUS_LABELS[o.status]}
                  </span>
                </div>

                {/* Payment progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Pagamento</span>
                    <span>
                      R$ {o.paidAmount.toFixed(2)} / R$ {o.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UnlinkedState() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Meu Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu histórico e informações pessoais</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Conta não vinculada</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Seu perfil Google ainda não foi vinculado a um participante.
            Entre em contato com o administrador para fazer a vinculação.
          </p>
        </div>
      </div>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="glass-card p-6 flex items-center gap-5">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="glass-card p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Events RSVP ─────────────────────────────────────────────────────

function UpcomingEventsSection({
  events, rsvpLoading, onRsvp, memberLinked,
}: {
  events: UpcomingEvent[];
  rsvpLoading: string | null;
  onRsvp: (e: UpcomingEvent) => void;
  memberLinked: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <CalendarCheck2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Próximos Eventos</span>
        {memberLinked && (
          <span className="text-xs text-muted-foreground">· confirme sua presença antecipadamente</span>
        )}
      </div>
      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ev.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(ev.date), "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}
                {ev.location && ` · ${ev.location}`}
              </p>
              <p className="text-xs text-primary/70 mt-1">
                {ev.rsvpCount} confirmado{ev.rsvpCount !== 1 ? "s" : ""}
              </p>
            </div>
            {memberLinked && (
              <button
                onClick={() => onRsvp(ev)}
                disabled={rsvpLoading === ev.id}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
                  ev.myRsvp
                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-destructive/10 hover:text-destructive"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {rsvpLoading === ev.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : ev.myRsvp ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmado
                  </>
                ) : (
                  <>
                    <CalendarCheck2 className="w-3.5 h-3.5" />
                    Quero ir
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
