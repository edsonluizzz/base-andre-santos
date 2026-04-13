import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendRoleChangeEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const existing = await db.userEstablishment.findUnique({
      where: { userId_establishmentId: { userId: params.id, establishmentId: eid } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { role, memberId } = body;

    const VALID_ROLES = ["ADMIN", "LEADER", "MEMBER"];
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: "Role inválido" }, { status: 400 });
      }
      await db.user.update({
        where: { id: params.id },
        data: { role },
      });
      // Sincronizar role no UserEstablishment para que o JWT ao relogar use o valor correto
      await db.userEstablishment.updateMany({
        where: { userId: params.id, establishmentId: eid },
        data: { role: role as "ADMIN" | "LEADER" | "MEMBER" },
      }).catch(() => {});

      // E-mail de notificação quando promovido a LEADER ou ADMIN
      if (["LEADER", "ADMIN"].includes(role)) {
        const [targetUser, est] = await Promise.all([
          db.user.findUnique({ where: { id: params.id }, select: { email: true, name: true } }),
          db.establishment.findUnique({ where: { id: eid }, select: { name: true } }),
        ]);
        if (targetUser?.email && est?.name) {
          sendRoleChangeEmail({
            to: targetUser.email,
            memberName: targetUser.name ?? "Membro",
            churchName: est.name,
            newRole: role,
          }).catch((e) => console.error("[users/role] e-mail erro:", e));
        }
      }

      console.log(`[users/${params.id}] PATCH role=${role} eid=${eid}`);
    }

    if (memberId !== undefined) {
      // Unlink any member currently pointing to this user
      await db.member.updateMany({
        where: { userId: params.id },
        data: { userId: null },
      });
      // Link new member (if not null)
      if (memberId !== null) {
        await db.member.update({
          where: { id: memberId },
          data: { userId: params.id },
        });
      }
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        member: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (params.id === session.user?.id) {
      return NextResponse.json({ error: "Não é possível excluir sua própria conta" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const target = await db.userEstablishment.findUnique({
      where: { userId_establishmentId: { userId: params.id, establishmentId: eid } },
    });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    await db.user.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
