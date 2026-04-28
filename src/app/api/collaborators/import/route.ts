import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

const PROFILE_MAP: Record<string, string> = {
  "pastor": "PASTOR", "pr": "PASTOR", "pr.": "PASTOR",
  "presidente associacao": "PRESIDENTE_ASSOCIACAO", "presidente": "PRESIDENTE_ASSOCIACAO",
  "lider politico": "LIDER_POLITICO", "líder político": "LIDER_POLITICO",
  "vereador": "VEREADOR",
  "empresario": "EMPRESARIO", "empresário": "EMPRESARIO",
  "lideranca comunitaria": "LIDERANCA_COMUNITARIA", "liderança comunitária": "LIDERANCA_COMUNITARIA",
  "apoiador": "APOIADOR",
};

function parseProfile(val: string): string {
  return PROFILE_MAP[val.toLowerCase().trim()] ?? "APOIADOR";
}

const STATUS_MAP: Record<string, string> = {
  "lead": "LEAD", "ativo": "ACTIVE", "active": "ACTIVE", "inativo": "INACTIVE", "inactive": "INACTIVE",
};

function parseStatus(val: string): string {
  return STATUS_MAP[val.toLowerCase().trim()] ?? "ACTIVE";
}

const ROLE_MAP: Record<string, string> = {
  "coord. geral": "COORD_GERAL", "coord geral": "COORD_GERAL", "coordenador geral": "COORD_GERAL",
  "coord. regional": "COORD_REGIONAL", "coord regional": "COORD_REGIONAL", "coordenador regional": "COORD_REGIONAL",
  "líder municipal": "LIDER_MUNICIPAL", "lider municipal": "LIDER_MUNICIPAL",
  "líder de bairro": "LIDER_BAIRRO", "lider de bairro": "LIDER_BAIRRO", "líder bairro": "LIDER_BAIRRO",
  "voluntário": "VOLUNTARIO", "voluntario": "VOLUNTARIO",
  "coord_geral": "COORD_GERAL", "coord_regional": "COORD_REGIONAL",
  "lider_municipal": "LIDER_MUNICIPAL", "lider_bairro": "LIDER_BAIRRO",
};

function parseRole(val: string): string {
  return ROLE_MAP[val.toLowerCase().trim()] ?? "VOLUNTARIO";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { rows } = await req.json() as { rows: Record<string, string>[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "Máximo 500 linhas por importação" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = (row.nome || row.name || row.Nome || "").trim();
      if (!name) { skipped++; continue; }

      const phone = (row.telefone || row.whatsapp || row.Telefone || row.WhatsApp || "").trim();
      const email = (row.email || row.Email || "").trim() || null;
      const city = (row.cidade || row.municipio || row.Cidade || row.Município || "").trim() || null;
      const neighborhood = (row.bairro || row.Bairro || "").trim() || null;
      const roleRaw = (row.cargo || row.Cargo || row.role || "").trim();
      const campaignRole = parseRole(roleRaw);
      const profileRaw = (row.perfil || row.profile || row.Perfil || "").trim();
      const profile = parseProfile(profileRaw);
      const statusRaw = (row.status || row.Status || "").trim();
      const status = statusRaw ? parseStatus(statusRaw) : "ACTIVE";

      try {
        // Pula duplicatas por nome+telefone
        if (phone) {
          const cleanPhone = phone.replace(/\D/g, "");
          const dup = await db.collaborator.findFirst({
            where: { campaignId: CID, phone: { contains: cleanPhone.slice(-8) } },
            select: { id: true },
          });
          if (dup) { skipped++; continue; }
        }

        await db.collaborator.create({
          data: {
            campaignId: CID, name, phone: phone || null, email, city, neighborhood,
            campaignRole: campaignRole as never,
            profile: profile as never,
            status: status as never,
            source: "IMPORTACAO_CSV",
          },
        });
        created++;
      } catch {
        errors.push(name);
      }
    }

    return NextResponse.json({ created, skipped, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error("[collaborators/import]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
