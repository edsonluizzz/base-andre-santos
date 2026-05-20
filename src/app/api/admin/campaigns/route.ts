import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, plan: true, active: true,
        candidateName: true, party: true, district: true, electionYear: true,
        primaryColor: true, adminEmail: true, createdAt: true,
        _count: { select: { collaborators: true, userCampaigns: true } },
      },
    });

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("[campaigns GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      id, name, slug, dbUrl, plan, adminEmail,
      candidateName, party, district, electionYear,
      primaryColor, secondaryColor,
    } = body;

    if (!id || !name || !dbUrl) {
      return NextResponse.json({ error: "id, name e dbUrl são obrigatórios" }, { status: 400 });
    }

    const effectiveSlug = slug || id;

    const [existingById, existingBySlug] = await Promise.all([
      db.campaign.findUnique({ where: { id } }),
      db.campaign.findUnique({ where: { slug: effectiveSlug } }),
    ]);
    if (existingById) {
      return NextResponse.json({ error: "Campanha com este ID já existe" }, { status: 409 });
    }
    if (existingBySlug) {
      return NextResponse.json({ error: `Slug "${effectiveSlug}" já está em uso por outra campanha` }, { status: 409 });
    }

    const campaign = await db.campaign.create({
      data: {
        id,
        name,
        slug: effectiveSlug,
        dbUrl,
        plan: plan || "free",
        active: true,
        adminEmail: adminEmail || null,
        candidateName: candidateName || null,
        party: party || null,
        district: district || null,
        electionYear: electionYear ? parseInt(electionYear) : null,
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
      },
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    console.error("[campaigns POST]", err);
    const msg = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    if (data.electionYear) data.electionYear = parseInt(data.electionYear);

    const campaign = await db.campaign.update({ where: { id }, data });
    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    console.error("[campaigns PATCH]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
