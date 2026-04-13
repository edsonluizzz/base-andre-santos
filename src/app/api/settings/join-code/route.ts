import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// POST — Admin ou Leader gera/regenera o joinCode do próprio estabelecimento
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eid = session.user.establishmentId;

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const exists = await db.establishment.findUnique({ where: { joinCode: code } });
      if (!exists) break;
      code = generateCode();
    }

    const updated = await db.establishment.update({
      where: { id: eid },
      data: { joinCode: code },
      select: { joinCode: true },
    });

    console.log(`[settings/join-code] POST eid=${eid} code=${updated.joinCode}`);
    return NextResponse.json({ joinCode: updated.joinCode });
  } catch (err) {
    console.error("[settings/join-code] POST erro:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — revoga o joinCode (desativa o link de acesso público)
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eid = session.user.establishmentId;
    await db.establishment.update({
      where: { id: eid },
      data: { joinCode: null },
    });

    console.log(`[settings/join-code] DELETE eid=${eid}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/join-code] DELETE erro:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
