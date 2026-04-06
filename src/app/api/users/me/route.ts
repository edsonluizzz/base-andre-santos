import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Permite que um ADMIN ou SuperAdmin troque seu próprio establishmentId
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const isSuperAdmin = session?.user?.isSuperAdmin;
  if (!session || (!isSuperAdmin && session.user?.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { establishmentId } = await req.json();
  if (!establishmentId) {
    return NextResponse.json({ error: "establishmentId obrigatório" }, { status: 400 });
  }

  // SuperAdmin pode trocar para qualquer estabelecimento sem precisar de vínculo
  if (isSuperAdmin) {
    const exists = await db.establishment.findUnique({ where: { id: establishmentId } });
    if (!exists) {
      return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
    }
    await db.user.update({
      where: { id: session.user.id },
      data: { establishmentId, role: "ADMIN" },
    });
    return NextResponse.json({ ok: true, establishmentId });
  }

  // Admin comum: verifica vínculo ativo
  const link = await db.userEstablishment.findUnique({
    where: {
      userId_establishmentId: { userId: session.user.id, establishmentId },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Sem permissão para acessar este estabelecimento" }, { status: 403 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { establishmentId, role: link.role },
  });

  return NextResponse.json({ ok: true, establishmentId });
}
