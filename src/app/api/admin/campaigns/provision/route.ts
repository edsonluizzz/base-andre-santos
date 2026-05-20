import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Pool } from "@neondatabase/serverless";
import { getTenantInitSql } from "@/lib/tenant-init-sql";

const NEON_API = "https://console.neon.tech/api/v2";
const NEON_REGION = "aws-sa-east-1"; // São Paulo — mesma região do meta-db

export const maxDuration = 60; // DDL pode demorar em conexão fria

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const neonApiKey = process.env.NEON_API_KEY;
    if (!neonApiKey) {
      return NextResponse.json(
        { error: "NEON_API_KEY não configurada. Adicione em Vercel → Settings → Environment Variables." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { id, name, slug, adminEmail, candidateName, party, district, electionYear, primaryColor, secondaryColor, plan } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "id e name são obrigatórios" }, { status: 400 });
    }

    // Verificar se já existe
    const existing = await db.campaign.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json({ error: "Campanha com este ID já existe" }, { status: 409 });
    }

    // 1 ── Criar projeto Neon via API
    const neonRes = await fetch(`${NEON_API}/projects`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${neonApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        project: {
          name: `issacar-${slug || id}`,
          region_id: NEON_REGION,
          pg_version: 16,
        },
      }),
    });

    if (!neonRes.ok) {
      const err = await neonRes.text();
      console.error("[provision] Neon API error:", err);
      return NextResponse.json({ error: "Falha ao criar projeto Neon", detail: err }, { status: 502 });
    }

    const neonData = await neonRes.json();

    // Pegar a connection string sem pooling (necessária para DDL)
    const connectionUris: Array<{ connection_uri: string; pooler_host?: string }> =
      neonData.connection_uris ?? [];

    // Preferir URL unpooled (sem "-pooler") para rodar DDL
    const unpooledUri = connectionUris.find(u => !u.connection_uri.includes("-pooler"));
    const dbUrl = unpooledUri?.connection_uri ?? connectionUris[0]?.connection_uri;

    if (!dbUrl) {
      return NextResponse.json({ error: "Neon não retornou connection string" }, { status: 502 });
    }

    // 2 ── Aplicar schema no novo banco
    const initSql = getTenantInitSql(id, name);
    // Separar em statements individuais para compatibilidade com serverless driver
    const statements = initSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    const pool = new Pool({ connectionString: dbUrl });
    try {
      for (const stmt of statements) {
        await pool.query(stmt);
      }
    } finally {
      await pool.end().catch(() => {});
    }

    // 3 ── Criar Campaign record no meta-db
    const campaign = await db.campaign.create({
      data: {
        id,
        name,
        slug: slug || id,
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

    return NextResponse.json({
      ok: true,
      campaign,
      neonProjectId: neonData.project?.id,
      dbUrl,
    });
  } catch (err) {
    console.error("[provision]", err);
    return NextResponse.json({ error: "Erro interno no provisionamento" }, { status: 500 });
  }
}
