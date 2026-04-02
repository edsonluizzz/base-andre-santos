import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  const accounts = await db.bankAccount.findMany({
    where: { establishmentId: eid, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, isDefault: true },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  const { name, description, isDefault } = await req.json();

  if (!name?.trim())
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  // Se vai ser padrão, remove o padrão das demais
  if (isDefault) {
    await db.bankAccount.updateMany({
      where: { establishmentId: eid },
      data: { isDefault: false },
    });
  }

  const account = await db.bankAccount.create({
    data: { name: name.trim(), description: description?.trim() || null, isDefault: !!isDefault, establishmentId: eid },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  await db.bankAccount.updateMany({
    where: { id, establishmentId: eid },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
