import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { dedupeChurchRows } from "@/lib/churches";

const rowSchema = z.object({
  name: z.string().min(1).max(255),
  regional: z.string().min(1).max(100),
});
const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(1000),
  denominacao: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem importar igrejas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { rows, denominacao } = parsed.data;

    const { db, cid: CID } = getCampaignContext(session);
    const deduped = dedupeChurchRows(rows);

    const existing = await db.church.findMany({
      where: { campaignId: CID },
      select: { name: true, regional: true },
    });
    const existingKeys = new Set(
      existing.map((e) => `${e.name.trim().toLowerCase()}|${(e.regional ?? "").trim().toLowerCase()}`),
    );

    const toCreate = deduped.filter(
      (row) => !existingKeys.has(`${row.name.toLowerCase()}|${row.regional.toLowerCase()}`),
    );

    if (toCreate.length > 0) {
      await db.church.createMany({
        data: toCreate.map((row) => ({
          campaignId: CID,
          name: row.name,
          regional: row.regional,
          denominacao: denominacao?.trim() || null,
        })),
      });
    }

    return NextResponse.json({ created: toCreate.length, skipped: rows.length - toCreate.length });
  } catch (err) {
    console.error("[api/churches/import] erro:", err);
    return NextResponse.json({ error: "Erro ao importar igrejas" }, { status: 500 });
  }
}
