import { db } from "@/lib/db";
import { sendWeeklyReportEmail } from "@/lib/email";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const establishments = await db.establishment.findMany({
      where: { suspended: false },
      select: {
        id: true,
        name: true,
        userEstablishments: {
          where: {
            inviteStatus: "ACCEPTED",
            role: { in: ["ADMIN", "LEADER"] },
          },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    let emailsSent = 0;

    for (const est of establishments) {
      const recipients = est.userEstablishments
        .filter((ue) => ue.user?.email)
        .map((ue) => ({ email: ue.user!.email!, name: ue.user!.name ?? "Líder" }));

      if (recipients.length === 0) continue;

      // Eventos da última semana
      const events = await db.event.findMany({
        where: {
          establishmentId: est.id,
          date: { gte: weekStart, lte: now },
        },
        include: {
          attendances: { select: { status: true } },
        },
        orderBy: { date: "desc" },
      });

      // Total de ofertas da semana
      const offeringsAgg = await db.offering.aggregate({
        where: {
          establishmentId: est.id,
          date: { gte: weekStart, lte: now },
        },
        _sum: { amount: true },
      });
      const totalOfferings = Number(offeringsAgg._sum.amount ?? 0);

      // Membros ativos
      const activeCount = await db.member.count({
        where: { establishmentId: est.id, status: "ACTIVE" },
      });

      // Novos visitantes da semana (se modelo existir)
      let newVisitors = 0;
      try {
        newVisitors = await (db as any).visitor.count({
          where: {
            establishmentId: est.id,
            createdAt: { gte: weekStart },
          },
        });
      } catch {
        // Visitor model may not exist yet
      }

      const eventsData = events.map((e) => {
        const total = e.attendances.length;
        const present = e.attendances.filter((a) => a.status === "PRESENT").length;
        return {
          title: e.title,
          date: e.date,
          present,
          total,
          rate: total > 0 ? Math.round((present / total) * 100) : null,
        };
      });

      const results = await Promise.allSettled(
        recipients.map((r) =>
          sendWeeklyReportEmail({
            to: r.email,
            recipientName: r.name,
            churchName: est.name,
            weekStart,
            events: eventsData,
            totalOfferings,
            activeMembers: activeCount,
            newVisitors,
          })
        )
      );

      emailsSent += results.filter((r) => r.status === "fulfilled").length;
    }

    console.log(`[cron/weekly-report] emailsSent=${emailsSent}`);
    return Response.json({ ok: true, emailsSent });
  } catch (err) {
    console.error("[cron/weekly-report] erro:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
