import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await db.userEstablishment.findMany({
    where: { userId: session.user.id },
    include: { establishment: { select: { id: true, name: true, logoBase64: true } } },
    orderBy: { establishment: { name: "asc" } },
  });

  return NextResponse.json(
    links.map((l) => ({
      establishmentId: l.establishmentId,
      role: l.role,
      name: l.establishment.name,
      logoBase64: l.establishment.logoBase64,
    }))
  );
}
