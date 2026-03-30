import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const congresses = await db.congress.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { shirtOrders: true } },
      },
    });

    return NextResponse.json(congresses);
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

    const body = await req.json();
    const { name, date, location, description, shirtArtUrl, shirtPricing } = body;

    if (!name?.trim() || !date) {
      return NextResponse.json({ error: "Nome e data são obrigatórios" }, { status: 400 });
    }

    const congress = await db.congress.create({
      data: {
        name: name.trim(),
        date: new Date(date),
        location: location?.trim() || null,
        description: description?.trim() || null,
        shirtArtUrl: shirtArtUrl || null,
        shirtPricing: shirtPricing || null,
      },
    });

    return NextResponse.json(congress, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
