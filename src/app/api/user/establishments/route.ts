import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // SuperAdmin enxerga todos os estabelecimentos com role ADMIN
  if (session.user.isSuperAdmin) {
    const all = await db.establishment.findMany({
      select: { id: true, name: true, logoBase64: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      all.map((e) => ({
        establishmentId: e.id,
        role: "ADMIN",
        name: e.name,
        logoBase64: e.logoBase64,
      }))
    );
  }

  const ues = await db.userEstablishment.findMany({
    where: { userId: session.user.id },
    include: {
      establishment: { select: { id: true, name: true, logoBase64: true } },
    },
  });

  return NextResponse.json(
    ues.map((ue) => ({
      establishmentId: ue.establishmentId,
      role: ue.role,
      name: ue.establishment.name,
      logoBase64: ue.establishment.logoBase64,
    }))
  );
}
