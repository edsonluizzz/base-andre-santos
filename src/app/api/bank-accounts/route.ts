import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const accounts = await db.bankAccount.findMany({
      where: { establishmentId: eid },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, description, isDefault } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Se isDefault, remove o padrão anterior
    if (isDefault) {
      await db.bankAccount.updateMany({
        where: { establishmentId: eid, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.bankAccount.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: Boolean(isDefault),
        establishmentId: eid,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    await db.bankAccount.deleteMany({ where: { id, establishmentId: eid } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
