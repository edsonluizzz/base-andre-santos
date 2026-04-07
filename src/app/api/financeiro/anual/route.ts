import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    const allowed = await hasPermission(
      session.user.role as Role,
      "FINANCIAL",
      "VIEW",
      eid
    );
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const year = parseInt(new URL(req.url).searchParams.get("year") ?? String(new Date().getFullYear()));

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const [offerings, expenses] = await Promise.all([
      db.offering.findMany({
        where: { establishmentId: eid, date: { gte: start, lte: end } },
        select: { amount: true, date: true },
      }),
      db.expense.findMany({
        where: { establishmentId: eid, date: { gte: start, lte: end } },
        select: { amount: true, date: true },
      }),
    ]);

    // Agrupa por mês (1–12)
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      entradas: 0,
      saidas: 0,
    }));

    for (const o of offerings) {
      const m = new Date(o.date).getMonth(); // 0-based
      months[m].entradas += o.amount;
    }
    for (const e of expenses) {
      const m = new Date(e.date).getMonth();
      months[m].saidas += e.amount;
    }

    const totalEntradas = months.reduce((s, m) => s + m.entradas, 0);
    const totalSaidas = months.reduce((s, m) => s + m.saidas, 0);

    return NextResponse.json({ year, months, totalEntradas, totalSaidas });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
