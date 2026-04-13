import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// Normaliza data de aniversário para DD/MM (aceita DD/MM/AAAA, DD/MM, AAAA-MM-DD)
function parseBirthday(raw: string): { value: string | null; error: string | null } {
  const s = raw.trim();
  if (!s) return { value: null, error: null };

  // DD/MM/AAAA → DD/MM
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m] = s.split("/");
    return { value: `${d}/${m}`, error: null };
  }
  // DD/MM (sem ano)
  if (/^\d{2}\/\d{2}$/.test(s)) {
    return { value: s, error: null };
  }
  // AAAA-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [, m, d] = s.slice(0, 10).split("-");
    return { value: `${d}/${m}`, error: null };
  }
  return { value: null, error: `data inválida "${s}" (use DD/MM ou DD/MM/AAAA)` };
}

export type ImportLogRow = {
  linha: number;
  nome: string;
  resultado: string;
  detalhe: string;
};

export type ImportResult = {
  updated: number;
  created: number;
  skipped: number;
  log: ImportLogRow[];
};

// POST /api/members/import
export async function POST(req: NextRequest) {
  try {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? ""))
    return NextResponse.json({ error: "Formato inválido. Use .xlsx, .xls ou .csv" }, { status: 400 });

  const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_IMPORT_SIZE)
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

  if (rows.length === 0)
    return NextResponse.json({ error: "Planilha vazia ou sem dados" }, { status: 400 });

  const MAX_ROWS = 5000;
  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Limite de ${MAX_ROWS} membros por importação.` }, { status: 400 });

  const result: ImportResult = { updated: 0, created: 0, skipped: 0, log: [] };

  // Plano e limite
  const establishment = await db.establishment.findUnique({ where: { id: eid }, select: { plan: true } });
  const isPro = establishment?.plan === "PRO";
  const FREE_LIMIT = 50;
  const currentCount = await db.member.count({ where: { establishmentId: eid, deletedAt: null } });

  // Carregar membros existentes para validação em memória
  const existingMembers = await db.member.findMany({
    where: { establishmentId: eid, deletedAt: null },
    select: { id: true, name: true },
  });
  const existingById = new Map(existingMembers.map((m) => [m.id, m.name]));
  const existingNameSet = new Set(existingMembers.map((m) => m.name.toLowerCase()));

  type UpdateOp = { id: string; data: { name: string; birthday: string | null; phone: string | null; notes: string | null; status: "ACTIVE" | "INACTIVE" } };
  type CreateOp = { name: string; birthday: string | null; phone: string | null; notes: string | null; status: "ACTIVE" | "INACTIVE"; establishmentId: string };

  const toUpdate: (UpdateOp & { linha: number })[] = [];
  const toCreate: (CreateOp & { linha: number; nome: string })[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    const rowId  = (row["ID (não editar)"] ?? row["ID"] ?? "").toString().trim();
    const name   = (row["Nome"] ?? "").toString().trim();
    const birthdayRaw = (row["Data de Nascimento (DD/MM/AAAA)"] ?? row["Data de Nascimento"] ?? row["Nascimento"] ?? row["Aniversário"] ?? "").toString().trim();
    const phone  = (row["Telefone (com DDD)"] ?? row["Telefone"] ?? row["Celular"] ?? "").toString().trim() || null;
    const statusRaw = (row["Status"] ?? "ATIVO").toString().trim().toUpperCase();
    const notes  = (row["Observações"] ?? row["Obs"] ?? "").toString().trim() || null;

    if (!name) {
      result.log.push({ linha: lineNum, nome: "", resultado: "ERRO", detalhe: "Nome obrigatório" });
      continue;
    }

    const { value: birthday, error: bdError } = parseBirthday(birthdayRaw);
    if (bdError) {
      result.log.push({ linha: lineNum, nome: name, resultado: "ERRO", detalhe: bdError });
      continue;
    }

    const status = statusRaw === "INATIVO" ? "INACTIVE" : "ACTIVE";

    // ATUALIZAÇÃO: linha tem ID válido que existe no banco
    if (rowId && existingById.has(rowId)) {
      toUpdate.push({ id: rowId, data: { name, birthday, phone, notes, status }, linha: lineNum });
      continue;
    }

    // ID informado mas não encontrado — avisar
    if (rowId && !existingById.has(rowId)) {
      result.log.push({ linha: lineNum, nome: name, resultado: "ERRO", detalhe: `ID "${rowId}" não encontrado neste estabelecimento` });
      continue;
    }

    // CRIAÇÃO: sem ID
    if (existingNameSet.has(name.toLowerCase())) {
      result.skipped++;
      result.log.push({ linha: lineNum, nome: name, resultado: "IGNORADO", detalhe: "Nome já existe no cadastro" });
      continue;
    }

    toCreate.push({ name, birthday, phone, notes, status, establishmentId: eid, linha: lineNum, nome: name });
  }

  // Executar atualizações
  if (toUpdate.length > 0) {
    await db.$transaction(
      toUpdate.map(({ id, data }) => db.member.update({ where: { id }, data }))
    );
    result.updated = toUpdate.length;
    for (const op of toUpdate) {
      result.log.push({ linha: op.linha, nome: op.data.name, resultado: "ATUALIZADO", detalhe: "" });
    }
  }

  // Executar criações respeitando limite do plano
  if (toCreate.length > 0) {
    const slots = isPro ? toCreate.length : Math.max(0, FREE_LIMIT - currentCount - result.updated);
    const allowed = toCreate.slice(0, slots);
    const blocked = toCreate.slice(slots);

    if (allowed.length > 0) {
      await db.$transaction(
        allowed.map(({ name, birthday, phone, notes, status, establishmentId }) =>
          db.member.create({ data: { name, birthday, phone, notes, status, establishmentId } })
        )
      );
      result.created = allowed.length;
      for (const op of allowed) {
        result.log.push({ linha: op.linha, nome: op.nome, resultado: "CRIADO", detalhe: "" });
      }
    }

    for (const op of blocked) {
      result.log.push({ linha: op.linha, nome: op.nome, resultado: "BLOQUEADO", detalhe: `Limite de ${FREE_LIMIT} membros atingido (plano gratuito)` });
    }
  }

  // Ordenar log por linha
  result.log.sort((a, b) => a.linha - b.linha);

  return NextResponse.json(result);
  } catch (err) {
    console.error("[members/import] erro:", err);
    return NextResponse.json({ error: "Erro interno ao processar a planilha" }, { status: 500 });
  }
}
