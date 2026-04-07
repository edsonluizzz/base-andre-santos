import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Busca settings específicos do estabelecimento
    const [settings, establishment] = await Promise.all([
      db.settings.findUnique({ where: { id: eid } }),
      db.establishment.findUnique({ where: { id: eid }, select: { name: true, joinCode: true } }),
    ]);

    // Usa o nome do Settings se configurado; caso contrário usa o nome do Establishment
    return NextResponse.json({
      churchName: settings?.churchName ?? establishment?.name ?? "Minha Igreja",
      logoBase64: settings?.logoBase64 ?? null,
      joinCode: establishment?.joinCode ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const body = await req.json();

    const settings = await db.settings.upsert({
      where: { id: eid },
      update: {
        ...(body.churchName !== undefined && { churchName: body.churchName }),
        ...(body.logoBase64 !== undefined && { logoBase64: body.logoBase64 }),
      },
      create: {
        id: eid,
        churchName: body.churchName ?? "Minha Igreja",
        logoBase64: body.logoBase64 ?? null,
      },
    });

    return NextResponse.json({
      churchName: settings.churchName,
      logoBase64: settings.logoBase64,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
