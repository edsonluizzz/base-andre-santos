import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST — público: visitante se auto-cadastra
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { establishmentId, eventId, name, phone, email, notes } = body;

    if (!establishmentId || !name?.trim()) {
      return NextResponse.json({ error: "Nome e congregação são obrigatórios" }, { status: 400 });
    }

    const establishment = await db.establishment.findUnique({
      where: { id: establishmentId },
      select: { id: true, name: true },
    });
    if (!establishment) {
      return NextResponse.json({ error: "Congregação não encontrada" }, { status: 404 });
    }

    const visitor = await db.visitor.create({
      data: {
        establishmentId,
        eventId: eventId || null,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, id: visitor.id, churchName: establishment.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// GET — admin/leader: lista visitantes do estabelecimento
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 50;

    const where = {
      establishmentId: eid,
      ...(eventId ? { eventId } : {}),
    };

    const [visitors, total] = await Promise.all([
      db.visitor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { event: { select: { id: true, title: true, date: true } } },
      }),
      db.visitor.count({ where }),
    ]);

    return NextResponse.json({ visitors, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
