import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeCity } from "@/lib/utils";

const CID = "andre-santos-2026";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const all = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { id: true, city: true },
    });

    let updated = 0;
    const preview: { id: string; before: string; after: string }[] = [];

    for (const c of all) {
      const normalized = normalizeCity(c.city);
      if (normalized !== c.city) {
        await db.collaborator.update({ where: { id: c.id }, data: { city: normalized } });
        preview.push({ id: c.id, before: c.city!, after: normalized! });
        updated++;
      }
    }

    await db.auditLog.create({
      data: {
        action: "BULK_FIX",
        actorId: session.user.id,
        metadata: { fix: "normalize-cities", updated, total: all.length },
      },
    }).catch(() => {});

    return NextResponse.json({
      updated,
      total: all.length,
      preview: preview.slice(0, 20),
    });
  } catch (err) {
    console.error("[fix/normalize-cities]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
