import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  bodyText: z.string().trim().min(10).max(20000),
  ctaLabel: z.string().trim().max(80).optional().or(z.literal("")),
  ctaUrl: z.string().trim().url().startsWith("https://").optional().or(z.literal("")),
});

export async function GET() {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const rows = await gate.db.emailCampaign.findMany({
      where: { campaignId: gate.cid }, orderBy: { createdAt: "desc" }, take: 50,
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[mala-direta campaigns GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { subject, bodyText, ctaLabel, ctaUrl } = parsed.data;
    const created = await gate.db.emailCampaign.create({
      data: {
        campaignId: gate.cid, subject, bodyText,
        ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null,
        createdBy: gate.session.user.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[mala-direta campaigns POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
