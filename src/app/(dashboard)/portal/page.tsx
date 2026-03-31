"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PortalSkeleton />;

  if (!data || !data.linked) return <UnlinkedState />;

  const { member, stats, attendances, shirtOrders } = data;
  const activeOrders = shirtOrders.filter((o) => o.status !== "CANCELLED");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Meu Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">Seu histórico e informações pessoais</p>
      </div>

      {/* Profile Card */}
      <ProfileCard member={member} />

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
}: {
  member: Extract<PortalData, { linked: true }>["member"];
}) {
  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="glass-card p-6 flex items-center gap-5">
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt={member.name}
          className="w-16 h-16 rounded-full object-cover border border-primary/20 flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
          {initials}
        </div>
      )}
      <div>
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
