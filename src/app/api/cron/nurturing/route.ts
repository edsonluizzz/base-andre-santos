import { db } from "@/lib/db";
import {
  sendNurturingDay1Email,
  sendNurturingDay3Email,
  sendNurturingDay7Email,
} from "@/lib/email";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // Buscar todos os estabelecimentos não suspensos
    const establishments = await db.establishment.findMany({
      where: { suspended: false },
      select: {
        id: true,
        name: true,
        createdAt: true,
        nurturingStep: true,
        userEstablishments: {
          where: { role: "ADMIN", inviteStatus: "ACCEPTED" },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    let emailsSent = 0;

    for (const est of establishments) {
      const daysSinceCreation = Math.floor(
        (now.getTime() - est.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const admins = est.userEstablishments
        .filter((ue) => ue.user?.email)
        .map((ue) => ({ email: ue.user!.email!, name: ue.user!.name ?? "Administrador" }));

      if (admins.length === 0) continue;

      // Step 0 → 1: Dia 1 (dia 1 após criação)
      if (est.nurturingStep === 0 && daysSinceCreation >= 1) {
        const results = await Promise.allSettled(
          admins.map((a) =>
            sendNurturingDay1Email({ to: a.email, name: a.name, churchName: est.name })
          )
        );
        emailsSent += results.filter((r) => r.status === "fulfilled").length;
        await db.establishment.update({ where: { id: est.id }, data: { nurturingStep: 1 } });
        continue;
      }

      // Step 1 → 2: Dia 3
      if (est.nurturingStep === 1 && daysSinceCreation >= 3) {
        const results = await Promise.allSettled(
          admins.map((a) =>
            sendNurturingDay3Email({ to: a.email, name: a.name, churchName: est.name })
          )
        );
        emailsSent += results.filter((r) => r.status === "fulfilled").length;
        await db.establishment.update({ where: { id: est.id }, data: { nurturingStep: 2 } });
        continue;
      }

      // Step 2 → 3: Dia 7
      if (est.nurturingStep === 2 && daysSinceCreation >= 7) {
        const results = await Promise.allSettled(
          admins.map((a) =>
            sendNurturingDay7Email({ to: a.email, name: a.name, churchName: est.name })
          )
        );
        emailsSent += results.filter((r) => r.status === "fulfilled").length;
        await db.establishment.update({ where: { id: est.id }, data: { nurturingStep: 3 } });
        continue;
      }
    }

    console.log(`[cron/nurturing] emailsSent=${emailsSent}`);
    return Response.json({ ok: true, emailsSent });
  } catch (err) {
    console.error("[cron/nurturing] erro:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
