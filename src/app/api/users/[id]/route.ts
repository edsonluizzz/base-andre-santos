import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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
    const existing = await db.user.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { role, memberId } = body;

    if (role !== undefined) {
      await db.user.update({
        where: { id: params.id },
        data: { role },
      });
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

    await db.user.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
