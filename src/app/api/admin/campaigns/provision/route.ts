import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Pool } from "@neondatabase/serverless";
import { getTenantInitSql } from "@/lib/tenant-init-sql";

const NEON_API    = "https://console.neon.tech/api/v2";
const VERCEL_API  = "https://api.vercel.com";
const NEON_REGION = "aws-sa-east-1";

export const maxDuration = 60; // DDL pode demorar em conexão fria

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const neonApiKey    = process.env.NEON_API_KEY;
    const vercelApiKey  = process.env.VERCEL_API_KEY;
    const vercelTeamId  = process.env.VERCEL_TEAM_ID;

    if (!neonApiKey && !vercelApiKey) {
      return NextResponse.json(
        { error: "Configure NEON_API_KEY ou VERCEL_API_KEY nas variáveis de ambiente." },
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

    // 1 ── Criar projeto Neon
    // Tenta Vercel API primeiro (quando Neon é managed by Vercel)
    // depois Neon API diretamente como fallback
    let dbUrl: string | null = null;

    if (vercelApiKey) {
      // Vercel Storage API — cria um Neon Postgres database
      const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : "";
      const vRes = await fetch(`${VERCEL_API}/v1/storage/databases${teamQuery}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vercelApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `issacar-${(slug || id).slice(0, 30)}`,
          type: "postgres",
          plan: "free",
          region: "sae1", // South America East — São Paulo
        }),
      });

      if (vRes.ok) {
        const vData = await vRes.json();
        // Vercel retorna env vars; extrair DATABASE_URL do banco criado
        dbUrl = vData.database?.env?.DATABASE_URL
          ?? vData.env?.DATABASE_URL
          ?? vData.database?.url
          ?? null;
        console.log("[provision] Vercel API criou banco:", vData.database?.id);
      } else {
        const vErr = await vRes.text();
        console.error("[provision] Vercel API error:", vErr);
      }
    }

    let neonProjectId: string | undefined;

    if (!dbUrl && neonApiKey) {
      // Fallback: Neon API direta (funciona em contas Neon independentes)
      const neonRes = await fetch(`${NEON_API}/projects`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${neonApiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          project: { name: `issacar-${slug || id}`, region_id: NEON_REGION, pg_version: 16 },
        }),
      });

      if (neonRes.ok) {
        const neonData = await neonRes.json();
        neonProjectId = neonData.project?.id;
        const uris: Array<{ connection_uri: string }> = neonData.connection_uris ?? [];
        const unpooled = uris.find(u => !u.connection_uri.includes("-pooler"));
        dbUrl = unpooled?.connection_uri ?? uris[0]?.connection_uri ?? null;
      } else {
        const err = await neonRes.text();
        console.error("[provision] Neon API error:", err);
        // Vercel-managed org — orientar usuário
        if (err.includes("managed by Vercel")) {
          return NextResponse.json({
            error: "Sua conta Neon é gerenciada pelo Vercel. Adicione VERCEL_API_KEY nas variáveis de ambiente, ou use o Modo Manual.",
            hint: "Vercel Dashboard → Settings → Tokens → Create Token → adicione como VERCEL_API_KEY no projeto",
          }, { status: 502 });
        }
        return NextResponse.json({ error: "Falha ao criar projeto Neon", detail: err }, { status: 502 });
      }
    }

    if (!dbUrl) {
      return NextResponse.json({ error: "Não foi possível obter a connection string do banco criado." }, { status: 502 });
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
      neonProjectId,
      dbUrl,
    });
  } catch (err) {
    console.error("[provision]", err);
    return NextResponse.json({ error: "Erro interno no provisionamento" }, { status: 500 });
  }
}
