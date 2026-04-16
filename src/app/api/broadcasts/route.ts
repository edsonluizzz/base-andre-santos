import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendBroadcastEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    const broadcasts = await db.broadcast.findMany({
      where: { establishmentId: eid },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(broadcasts);
  } catch (err) {
    console.error("[broadcasts GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, message, audience } = body;

    if (!title?.trim() || !message?.trim() || !audience?.trim()) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Buscar congregação
    const establishment = await db.establishment.findUnique({
      where: { id: eid },
      select: { name: true },
    });
    const churchName = establishment?.name ?? "sua congregação";

    // Buscar membros alvos
    let memberWhere: Record<string, unknown> = {
      establishmentId: eid,
      status: "ACTIVE",
      deletedAt: null,
    };

    if (audience !== "ALL" && audience.startsWith("MINISTRY:")) {
      const ministryId = audience.replace("MINISTRY:", "");
      memberWhere = {
        establishmentId: eid,
        status: "ACTIVE",
        deletedAt: null,
        ministryMembers: { some: { ministryId } },
      };
    }

    const members = await db.member.findMany({
      where: memberWhere,
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        user: { select: { email: true } },
      },
    });

    // Salvar comunicado
    const broadcast = await db.broadcast.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        audience,
        establishmentId: eid,
        createdBy: session.user.id,
        sentCount: 0,
      },
    });

    // Enviar e-mails (fire-and-forget) e notificações in-app
    const membersWithEmail = members.filter(
      (m) => m.email || m.user?.email
    );

    let sentCount = 0;

    // E-mails
    const emailResults = await Promise.allSettled(
      membersWithEmail.map((m) => {
        const to = m.email ?? m.user?.email ?? "";
        return sendBroadcastEmail({
          to,
          memberName: m.name,
          churchName,
          title: title.trim(),
          message: message.trim(),
        });
      })
    );
    sentCount = emailResults.filter((r) => r.status === "fulfilled").length;

    // Notificações in-app para membros com userId
    const membersWithUserId = members.filter((m) => m.userId);
    if (membersWithUserId.length > 0) {
      await db.notification.createMany({
        data: membersWithUserId.map((m) => ({
          userId: m.userId!,
          title: `📢 ${title.trim()}`,
          body: message.trim().slice(0, 200),
          type: "BROADCAST",
          link: "/comunicados",
        })),
        skipDuplicates: true,
      });
    }

    // Atualizar sentCount
    await db.broadcast.update({
      where: { id: broadcast.id },
      data: { sentCount },
    });

    return NextResponse.json({ ...broadcast, sentCount }, { status: 201 });
  } catch (err) {
    console.error("[broadcasts POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
