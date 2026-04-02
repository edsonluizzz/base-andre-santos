import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Permite que um ADMIN troque seu próprio establishmentId
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { establishmentId } = await req.json();
  if (!establishmentId) {
    return NextResponse.json({ error: "establishmentId obrigatório" }, { status: 400 });
  }

  const exists = await db.establishment.findUnique({ where: { id: establishmentId } });
  if (!exists) {
    return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { establishmentId },
  });

  return NextResponse.json({ ok: true, establishmentId });
}
