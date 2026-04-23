import { db } from "@/lib/db";
import { sendEventCreatedEmail } from "@/lib/email";

interface EventInfo {
  id: string;
  title: string;
  date: Date;
  location: string | null;
  ministryId: string | null;
  establishmentId: string;
}

/**
 * Dispara notificações (in-app + e-mail) para os membros afetados por um novo evento.
 * - Evento com ministryId → apenas membros daquele ministério
 * - Evento geral → todos os membros ATIVOS do estabelecimento
 */
export async function notifyEventCreated(
  event: EventInfo,
  churchName: string
): Promise<void> {
  const dateLabel = new Date(event.date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  // ── 1. Buscar membros afetados ──────────────────────────────────────────────
  let members: { id: string; name: string; email: string | null; userId: string | null }[] = [];

  if (event.ministryId) {
    const ministryMembers = await db.ministryMember.findMany({
      where: { ministryId: event.ministryId },
      select: {
        member: {
          select: { id: true, name: true, email: true, userId: true, status: true, deletedAt: true },
        },
      },
    });
    members = ministryMembers
      .map((mm) => mm.member)
      .filter((m) => m.status === "ACTIVE" && !m.deletedAt);
  } else {
    members = await db.member.findMany({
      where: {
        establishmentId: event.establishmentId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, userId: true },
    });
  }

  if (members.length === 0) return;

  // ── 2. Notificações in-app ──────────────────────────────────────────────────
  const userIds = members.map((m) => m.userId).filter((uid): uid is string => uid !== null);

  if (userIds.length > 0) {
    try {
      await db.notification.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          title: `📅 Novo evento: ${event.title}`,
          body: `${dateLabel}${event.location ? ` — ${event.location}` : ""}`,
          type: "EVENT_CREATED",
          link: "/chamada",
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error("[event-notifications] erro ao criar notificações in-app:", err);
    }
  }

  // ── 3. E-mails ──────────────────────────────────────────────────────────────
  const membersWithEmail = members.filter((m) => m.email);

  if (membersWithEmail.length > 0) {
    await Promise.allSettled(
      membersWithEmail.map((m) =>
        sendEventCreatedEmail({
          to: m.email!,
          memberName: m.name,
          churchName,
          eventTitle: event.title,
          eventDate: dateLabel,
          eventLocation: event.location,
        })
      )
    );
  }
}
