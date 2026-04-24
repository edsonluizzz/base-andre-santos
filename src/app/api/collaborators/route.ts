import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? "";
    const role = searchParams.get("role") ?? "";
    const city = searchParams.get("city") ?? "";
    const status = searchParams.get("status") ?? "ACTIVE";

    const collaborators = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        status: status === "ALL" ? undefined : (status as "ACTIVE" | "INACTIVE"),
        ...(role && { campaignRole: role as never }),
        ...(city && { city }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        zones: { include: { zone: { select: { id: true, name: true } } } },
        whatsappGroups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(collaborators);
  } catch (err) {
    console.error("[collaborators GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, email, phone, city, neighborhood, campaignRole, notes, birthday, zoneIds } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const collaborator = await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        city: city?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        campaignRole: campaignRole ?? "VOLUNTARIO",
        notes: notes?.trim() || null,
        birthday: birthday || null,
        zones: zoneIds?.length
          ? { create: zoneIds.map((zid: string) => ({ zoneId: zid })) }
          : undefined,
      },
      include: { zones: { include: { zone: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (err) {
    console.error("[collaborators POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
