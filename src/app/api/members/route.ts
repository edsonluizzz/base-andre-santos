import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await db.member.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, birthday, phone, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const member = await db.member.create({
    data: {
      name: name.trim(),
      birthday: birthday?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(member, { status: 201 });
}
