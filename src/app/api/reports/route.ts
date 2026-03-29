import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getDateRange(year: string | null, month: string | null) {
  if (month) {
    const [y, m] = month.split("-").map(Number);
    return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (year) {
    const y = Number(year);
    return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const type = req.nextUrl.searchParams.get("type");
    const year = req.nextUrl.searchParams.get("year");
    const month = req.nextUrl.searchParams.get("month");
    const dateRange = getDateRange(year, month);

    if (type === "attendance-by-event") {
      const events = await db.event.findMany({
        where: dateRange ? { date: dateRange } : undefined,
        include: { attendances: { select: { status: true } } },
        orderBy: { date: "desc" },
      });
      const data = events.map((e) => {
        const total = e.attendances.length;
        const present = e.attendances.filter((a) => a.status === "PRESENT").length;
        const absent = e.attendances.filter((a) => a.status === "ABSENT").length;
        const justified = e.attendances.filter((a) => a.status === "JUSTIFIED").length;
        return {
          id: e.id, title: e.title, type: e.type, date: e.date,
          total, present, absent, justified,
          rate: total > 0 ? Math.round((present / total) * 100) : null,
        };
      });
      return NextResponse.json(data);
    }

    if (type === "attendance-by-member") {
      const members = await db.member.findMany({
        where: { status: "ACTIVE" },
        include: {
          attendances: {
            select: { status: true },
            where: dateRange ? { event: { date: dateRange } } : undefined,
          },
        },
        orderBy: { name: "asc" },
      });
      const data = members.map((m) => {
        const total = m.attendances.length;
        const present = m.attendances.filter((a) => a.status === "PRESENT").length;
        const absent = m.attendances.filter((a) => a.status === "ABSENT").length;
        const justified = m.attendances.filter((a) => a.status === "JUSTIFIED").length;
        return {
          id: m.id, name: m.name,
          total, present, absent, justified,
          rate: total > 0 ? Math.round((present / total) * 100) : null,
        };
      });
      return NextResponse.json(data);
    }

    if (type === "financial-by-month") {
      const offerings = await db.offering.findMany({
        select: { amount: true, method: true, date: true },
        where: dateRange ? { date: dateRange } : undefined,
        orderBy: { date: "asc" },
      });
      const map: Record<string, { total: number; cash: number; pix: number; count: number }> = {};
      for (const o of offerings) {
        const m = o.date.toISOString().slice(0, 7);
        if (!map[m]) map[m] = { total: 0, cash: 0, pix: 0, count: 0 };
        map[m].total += Number(o.amount);
        map[m].count += 1;
        if (o.method === "CASH") map[m].cash += Number(o.amount);
        else map[m].pix += Number(o.amount);
      }
      const data = Object.entries(map)
        .map(([mo, v]) => ({ month: mo, ...v }))
        .sort((a, b) => b.month.localeCompare(a.month));
      return NextResponse.json(data);
    }

    if (type === "financial-by-member") {
      const members = await db.member.findMany({
        where: { offerings: { some: dateRange ? { date: dateRange } : {} } },
        include: {
          offerings: {
            select: { amount: true, method: true },
            where: dateRange ? { date: dateRange } : undefined,
          },
        },
        orderBy: { name: "asc" },
      });
      const data = members
        .map((m) => {
          const total = m.offerings.reduce((s, o) => s + Number(o.amount), 0);
          const cash = m.offerings
            .filter((o) => o.method === "CASH")
            .reduce((s, o) => s + Number(o.amount), 0);
          const pix = m.offerings
            .filter((o) => o.method === "PIX")
            .reduce((s, o) => s + Number(o.amount), 0);
          return { id: m.id, name: m.name, total, cash, pix, count: m.offerings.length };
        })
        .sort((a, b) => b.total - a.total);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
