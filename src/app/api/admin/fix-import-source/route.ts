import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";
const KNOWN_SOURCES = ["IMPORTACAO_CSV", "IMPORTACAO_XLSX"];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const leads = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        source: { not: null },
        NOT: { source: { in: KNOWN_SOURCES } },
      },
      select: { id: true, source: true, notes: true },
    });

    if (leads.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    let updated = 0;
    const BATCH = 50;
    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH);
      await Promise.all(
        batch.map((c) => {
          const originTag = `Origem: ${c.source}`;
          const notes = c.notes?.includes("Origem:")
            ? c.notes
            : [originTag, c.notes].filter(Boolean).join("\n");
          return db.collaborator.update({
            where: { id: c.id },
            data: { source: "IMPORTACAO_XLSX", notes },
          });
        })
      );
      updated += batch.length;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("[fix-import-source]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
