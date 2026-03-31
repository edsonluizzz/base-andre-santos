import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const congress = await db.congress.findUnique({
      where: { id: params.id },
      include: {
        shirtOrders: {
          include: { member: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!congress) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(congress);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, date, location, description, status, shirtArtUrl, shirtPricing } = body;

    const congress = await db.congress.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(shirtArtUrl !== undefined && { shirtArtUrl: shirtArtUrl || null }),
        ...(shirtPricing !== undefined && { shirtPricing: shirtPricing || null }),
      },
    });

    return NextResponse.json(congress);
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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const count = await db.shirtOrder.count({ where: { congressId: params.id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "Não é possível deletar um congresso com pedidos. Cancele os pedidos primeiro." },
        { status: 400 }
      );
    }

    await db.congress.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
