"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
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
  Upload,
  CheckCircle,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PortalWelcomeTour } from "@/components/onboarding/portal-welcome-tour";
import { UserAvatarImg } from "@/components/ui/user-avatar-img";

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
        paymentProofUrl: string | null;
        paymentProofUploadedAt: string | null;
        congress: { id: string; name: string; date: string; shirtArtUrl: string | null; shirtPricing: Record<string, number> | null };
      }>;
      openCongresses: Array<{
        id: string;
        name: string;
        date: string;
        shirtArtUrl: string | null;
        shirtPricing: Record<string, number> | null;
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
  JUSTIFIED: "text-amber-400",
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
  PENDING: "bg-amber-500/10 text-amber-400",
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
  const { data: session } = useSession();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(undefined);

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

  const { stats, attendances, shirtOrders, openCongresses } = data;
  const member = { ...data.member, photoUrl: photoUrl !== undefined ? photoUrl : data.member.photoUrl };
  const activeOrders = shirtOrders.filter((o) => o.status !== "CANCELLED");

  return (
    <div className="space-y-8">
      {/* Tour de boas-vindas — primeira visita */}
      <PortalWelcomeTour memberId={data.member.id} />

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Meu Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu histórico e informações pessoais</p>
      </div>

      {/* Profile Card */}
      <ProfileCard
        member={member}
        onPhotoUpdate={(url) => setPhotoUrl(url)}
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
      <ShirtOrdersSection
        orders={activeOrders}
        openCongresses={openCongresses}
        memberId={data.member.id}
        onOrderCreated={() => {
          fetch("/api/portal/me").then((r) => r.json()).then(setData);
        }}
      />
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
        <UserAvatarImg image={member.photoUrl ?? session?.user?.image} name={member.name} className="w-16 h-16" />
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
  openCongresses,
  memberId,
  onOrderCreated,
}: {
  orders: Extract<PortalData, { linked: true }>["shirtOrders"];
  openCongresses: Extract<PortalData, { linked: true }>["openCongresses"];
  memberId: string;
  onOrderCreated: () => void;
}) {
  type OrderForm = { size: string; quantity: number; submitting: boolean };
  const [forms, setForms] = useState<Record<string, OrderForm>>({});
  const [proofUploading, setProofUploading] = useState<Record<string, boolean>>({});
  const proofRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getForm(congress: { id: string; shirtPricing: Record<string, number> | null }): OrderForm {
    if (forms[congress.id]) return forms[congress.id];
    const sizes = congress.shirtPricing ? Object.keys(congress.shirtPricing) : [];
    return { size: sizes[0] ?? "", quantity: 1, submitting: false };
  }

  function setFormField(congressId: string, pricing: Record<string, number> | null, field: keyof OrderForm, value: string | number | boolean) {
    setForms(prev => ({
      ...prev,
      [congressId]: { ...((prev[congressId]) ?? { size: Object.keys(pricing ?? {})[0] ?? "", quantity: 1, submitting: false }), [field]: value },
    }));
  }

  async function handleOrder(congress: typeof openCongresses[number]) {
    const form = getForm(congress);
    if (!form.size) { toast.error("Selecione um tamanho"); return; }
    const pricePerUnit = congress.shirtPricing?.[form.size] ?? 0;
    const totalAmount = pricePerUnit * form.quantity;
    setFormField(congress.id, congress.shirtPricing, "submitting", true);
    try {
      const res = await fetch(`/api/congresses/${congress.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, size: form.size, quantity: form.quantity, totalAmount }),
      });
      if (res.ok) {
        toast.success("Pedido realizado!");
        onOrderCreated();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao realizar pedido");
        setFormField(congress.id, congress.shirtPricing, "submitting", false);
      }
    } catch {
      toast.error("Erro ao realizar pedido");
      setFormField(congress.id, congress.shirtPricing, "submitting", false);
    }
  }

  async function handleProofUpload(orderId: string, file: File) {
    setProofUploading(prev => ({ ...prev, [orderId]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("orderId", orderId);
      const res = await fetch("/api/portal/shirt-proof", { method: "POST", body: form });
      if (res.ok) {
        toast.success("Comprovante enviado!");
        onOrderCreated();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao enviar comprovante");
      }
    } catch {
      toast.error("Erro ao enviar comprovante");
    } finally {
      setProofUploading(prev => ({ ...prev, [orderId]: false }));
    }
  }

  const hasAnything = orders.length > 0 || openCongresses.length > 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Shirt className="w-5 h-5" />
        Camisetas
      </h2>

      {!hasAnything ? (
        <div className="glass-card p-10 text-center">
          <Shirt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum congresso aberto para pedidos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Open congresses — new order form */}
          {openCongresses.map((congress) => {
            const form = getForm(congress);
            const sizes = congress.shirtPricing ? Object.keys(congress.shirtPricing) : [];
            const pricePerUnit = congress.shirtPricing?.[form.size] ?? 0;
            const total = pricePerUnit * form.quantity;

            return (
              <div key={congress.id} className="glass-card p-5 border border-primary/20">
                <div className="flex items-start gap-4">
                  {congress.shirtArtUrl && (
                    <img src={congress.shirtArtUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{congress.name}</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Aberto para pedidos</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {format(new Date(congress.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                    </p>

                    {sizes.length > 0 ? (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Tamanho</label>
                          <select
                            value={form.size}
                            onChange={e => setFormField(congress.id, congress.shirtPricing, "size", e.target.value)}
                            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                          >
                            {sizes.map(s => (
                              <option key={s} value={s}>
                                {s} — R$ {(congress.shirtPricing![s]).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Qtd</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={form.quantity}
                            onChange={e => setFormField(congress.id, congress.shirtPricing, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-16"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          {pricePerUnit > 0 && (
                            <span className="text-sm font-semibold text-foreground">
                              R$ {total.toFixed(2)}
                            </span>
                          )}
                          <button
                            onClick={() => handleOrder(congress)}
                            disabled={form.submitting || !form.size}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
                          >
                            {form.submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shirt className="w-3.5 h-3.5" />}
                            Fazer pedido
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum tamanho cadastrado ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Existing orders */}
          {orders.map((o) => {
            const paidPercent = o.totalAmount > 0
              ? Math.min(100, Math.round((o.paidAmount / o.totalAmount) * 100))
              : 0;
            const isPending = o.status === "PENDING";
            const uploading = proofUploading[o.id] ?? false;

            return (
              <div key={o.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {o.congress.shirtArtUrl && (
                      <img src={o.congress.shirtArtUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{o.congress.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(o.congress.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                        {" · "}Tamanho {o.size}
                        {o.quantity > 1 && ` · Qtd: ${o.quantity}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${SHIRT_STATUS_STYLES[o.status]}`}>
                    {SHIRT_STATUS_LABELS[o.status]}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Pagamento</span>
                    <span>R$ {o.paidAmount.toFixed(2)} / R$ {o.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
                  </div>
                </div>

                {isPending && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    {o.paymentProofUrl ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Comprovante enviado</span>
                        {o.paymentProofUploadedAt && (
                          <span className="text-muted-foreground">
                            em {format(new Date(o.paymentProofUploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary underline underline-offset-2">
                          Ver
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando comprovante de pagamento
                        </div>
                        <button
                          onClick={() => proofRefs.current[o.id]?.click()}
                          disabled={uploading}
                          className="flex items-center gap-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                        >
                          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Enviar comprovante
                        </button>
                        <input
                          ref={el => { proofRefs.current[o.id] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleProofUpload(o.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
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
