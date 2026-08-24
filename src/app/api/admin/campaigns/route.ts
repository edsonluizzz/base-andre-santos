import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Pool } from "@neondatabase/serverless";
import { getTenantInitSql } from "@/lib/tenant-init-sql";

export const maxDuration = 60; // DDL pode demorar

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
      domain, candidateNumber, whatsappGroupLink, youtubeVideoId, moduleScope,
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

    // Aplicar schema no tenant DB ANTES de criar Campaign record
    // (evita Campaign apontando para banco sem tabelas, que quebra qualquer query subsequente)
    const initSql = getTenantInitSql(id, name);
    const statements = initSql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const pool = new Pool({ connectionString: dbUrl });
    let schemaApplied = false;
    let schemaError: string | null = null;
    try {
      // Detecta se já tem schema aplicado (idempotência)
      const check = await pool.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'Campaign'
        ) AS exists
      `);
      if (check.rows[0]?.exists) {
        schemaApplied = true; // já aplicado anteriormente
      } else {
        for (const stmt of statements) {
          await pool.query(stmt);
        }
        schemaApplied = true;
      }
    } catch (err) {
      schemaError = err instanceof Error ? err.message : String(err);
      console.error("[campaigns POST] schema apply failed:", err);
    } finally {
      await pool.end().catch(() => {});
    }

    if (!schemaApplied) {
      return NextResponse.json({
        error: "Não foi possível aplicar o schema no banco informado. Verifique a URL e tente novamente.",
        detail: schemaError,
      }, { status: 502 });
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
        domain: domain || null,
        candidateNumber: candidateNumber ? parseInt(candidateNumber) : null,
        whatsappGroupLink: whatsappGroupLink || null,
        youtubeVideoId: youtubeVideoId || null,
        moduleScope: moduleScope || "full",
      },
    });

    return NextResponse.json({ ok: true, campaign, schemaApplied });
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
