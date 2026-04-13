import { db } from "@/lib/db";
import { sendBirthdayNotificationEmail } from "@/lib/email";

export async function GET(req: Request) {
  // Segurança: apenas a Vercel (ou curl manual) com o CRON_SECRET correto
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isTest = new URL(req.url).searchParams.get("test") === "1";

  // ── Modo de teste: envia e-mail de exemplo para todos os admins ────────────
  if (isTest) {
    const establishments = await db.establishment.findMany({
      where: { suspended: false },
      select: {
        id: true,
        name: true,
        userEstablishments: {
          where: { role: "ADMIN", inviteStatus: "ACCEPTED" },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    let emailsSent = 0;
    for (const est of establishments) {
      const admins = est.userEstablishments
        .filter((ue) => ue.user?.email)
        .map((ue) => ({ email: ue.user!.email!, name: ue.user!.name ?? "Administrador" }));

      const results = await Promise.allSettled(
        admins.map((a) =>
          sendBirthdayNotificationEmail({
            to: a.email,
            adminName: a.name,
            churchName: est.name,
            todayBirthdays: [
              { name: "Maria Aparecida Silva", birthday: "12/04" },
              { name: "João Pedro Santos", birthday: "12/04" },
            ],
            tomorrowBirthdays: [
              { name: "Ana Beatriz Oliveira", birthday: "13/04" },
            ],
          })
        )
      );
      emailsSent += results.filter((r) => r.status === "fulfilled").length;
    }

    return Response.json({ ok: true, test: true, emailsSent });
  }

  try {
    // Data em BRT (UTC-3) — Brasil não adota horário de verão desde 2019
    const brtNow = new Date(Date.now() + -3 * 60 * 60 * 1000);
    const brtTomorrow = new Date(brtNow);
    brtTomorrow.setUTCDate(brtTomorrow.getUTCDate() + 1);

    const toDDMM = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

    const todayStr = toDDMM(brtNow);
    const tomorrowStr = toDDMM(brtTomorrow);

    const establishments = await db.establishment.findMany({
      where: { suspended: false },
      select: {
        id: true,
        name: true,
        userEstablishments: {
          where: { role: "ADMIN", inviteStatus: "ACCEPTED" },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    let emailsSent = 0;

    for (const est of establishments) {
      const members = await db.member.findMany({
        where: {
          establishmentId: est.id,
          status: "ACTIVE",
          deletedAt: null,
          birthday: { in: [todayStr, tomorrowStr] },
        },
        select: { name: true, birthday: true },
      });

      if (members.length === 0) continue;

      const todayBirthdays = members
        .filter((m) => m.birthday === todayStr)
        .map((m) => ({ name: m.name, birthday: m.birthday! }));

      const tomorrowBirthdays = members
        .filter((m) => m.birthday === tomorrowStr)
        .map((m) => ({ name: m.name, birthday: m.birthday! }));

      const admins = est.userEstablishments
        .filter((ue) => ue.user?.email)
        .map((ue) => ({ email: ue.user!.email!, name: ue.user!.name ?? "Administrador" }));

      if (admins.length === 0) continue;

      const results = await Promise.allSettled(
        admins.map((a) =>
          sendBirthdayNotificationEmail({
            to: a.email,
            adminName: a.name,
            churchName: est.name,
            todayBirthdays,
            tomorrowBirthdays,
          })
        )
      );

      emailsSent += results.filter((r) => r.status === "fulfilled").length;
    }

    console.log(
      `[cron/birthday-notifications] today=${todayStr} tomorrow=${tomorrowStr} emailsSent=${emailsSent}`
    );

    return Response.json({
      ok: true,
      date: { today: todayStr, tomorrow: tomorrowStr },
      emailsSent,
    });
  } catch (err) {
    console.error("[cron/birthday-notifications] erro:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
