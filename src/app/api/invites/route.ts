import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";

// GET /api/invites — lista convites pendentes da congregação
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user.establishmentId;

    const invites = await db.userEstablishment.findMany({
      where: { establishmentId: eid, inviteStatus: "PENDING" },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json(
      invites.map((inv) => ({
        id: inv.id,
        email: inv.pendingEmail ?? inv.user?.email,
        name: inv.user?.name,
        image: inv.user?.image,
        role: inv.role,
        invitedAt: inv.invitedAt,
      }))
    );
  } catch (err) {
    console.error("[invites GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/invites — envia convite para um e-mail
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, role = "MEMBER" } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

    const eid = session.user.establishmentId;

    const establishment = await db.establishment.findUnique({ where: { id: eid } });
    if (!establishment) return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    const existingUser = await db.user.findUnique({ where: { email: email.trim() } });

    if (existingUser) {
      const existing = await db.userEstablishment.findUnique({
        where: { userId_establishmentId: { userId: existingUser.id, establishmentId: eid } },
      });
      if (existing) {
        return NextResponse.json({ error: "Usuário já tem acesso a esta congregação" }, { status: 409 });
      }
    } else {
      const pendingExists = await db.userEstablishment.findFirst({
        where: { pendingEmail: email.trim(), establishmentId: eid },
      });
      if (pendingExists) {
        return NextResponse.json({ error: "Convite já enviado para este e-mail" }, { status: 409 });
      }
    }

    await db.userEstablishment.create({
      data: {
        userId:       existingUser?.id ?? null,
        pendingEmail: existingUser ? null : email.trim(),
        establishmentId: eid,
        role: role as "ADMIN" | "LEADER" | "MEMBER",
        inviteStatus: existingUser ? "ACCEPTED" : "PENDING",
        invitedBy: session.user.id,
        acceptedAt: existingUser ? new Date() : null,
      },
    });

    await sendInviteEmail({
      to: email.trim(),
      name: existingUser?.name ?? email.trim(),
      churchName: establishment.name,
      invitedBy: session.user.name ?? "Administrador",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[invites POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/invites?id=xxx — cancela um convite pendente
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const eid = session.user.establishmentId;
    const invite = await db.userEstablishment.findFirst({ where: { id, establishmentId: eid } });
    if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

    await db.userEstablishment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[invites DELETE] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
