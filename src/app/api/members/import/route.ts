import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// POST /api/members/import — importar membros via planilha xlsx/csv
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user.establishmentId;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? ""))
    return NextResponse.json({ error: "Formato inválido. Use .xlsx, .xls ou .csv" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

  if (rows.length === 0)
    return NextResponse.json({ error: "Planilha vazia ou sem dados" }, { status: 400 });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // +2 pois linha 1 é cabeçalho

    // Aceita variações de nome da coluna
    const name = (row["Nome *"] ?? row["Nome"] ?? "").toString().trim();
    if (!name) {
      results.errors.push(`Linha ${lineNum}: nome obrigatório`);
      continue;
    }

    const birthdayRaw = (row["Data de Nascimento (DD/MM/AAAA)"] ?? row["Data de Nascimento"] ?? row["Nascimento"] ?? "").toString().trim();
    const phone      = (row["Telefone (com DDD)"] ?? row["Telefone"] ?? row["Celular"] ?? "").toString().trim() || null;
    const statusRaw  = (row["Status"] ?? "ATIVO").toString().trim().toUpperCase();
    const notes      = (row["Observações"] ?? row["Obs"] ?? "").toString().trim() || null;

    // Validar birthday
    let birthday: string | null = null;
    if (birthdayRaw) {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthdayRaw)) {
        birthday = birthdayRaw;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(birthdayRaw)) {
        // formato ISO → converter para DD/MM/AAAA
        const [y, m, d] = birthdayRaw.slice(0, 10).split("-");
        birthday = `${d}/${m}/${y}`;
      } else {
        results.errors.push(`Linha ${lineNum}: data inválida "${birthdayRaw}" (use DD/MM/AAAA)`);
        continue;
      }
    }

    const status = statusRaw === "INATIVO" ? "INACTIVE" : "ACTIVE";

    // Checar duplicata por nome + estabelecimento
    const existing = await db.member.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, establishmentId: eid },
    });
    if (existing) {
      results.skipped++;
      continue;
    }

    await db.member.create({
      data: { name, birthday, phone, notes, status, establishmentId: eid },
    });
    results.created++;
  }

  return NextResponse.json(results);
}
