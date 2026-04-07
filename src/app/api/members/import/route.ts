import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// POST /api/members/import — importar/atualizar membros via planilha xlsx/csv
// Lógica:
//   - Linha com ID válido  → atualiza o membro existente
//   - Linha sem ID         → cria novo membro (dedup por nome)
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

  const results = { updated: 0, created: 0, skipped: 0, errors: [] as string[] };

  // Verificar limite do plano gratuito (apenas para criações)
  const establishment = await db.establishment.findUnique({ where: { id: eid }, select: { plan: true } });
  const isPro = establishment?.plan === "PRO";
  const FREE_LIMIT = 50;

  const currentCount = await db.member.count({ where: { establishmentId: eid, deletedAt: null } });

  // Carregar todos os IDs e nomes existentes para validação em memória
  const existingMembers = await db.member.findMany({
    where: { establishmentId: eid, deletedAt: null },
    select: { id: true, name: true },
  });
  const existingIdSet = new Set(existingMembers.map((m) => m.id));
  const existingNameSet = new Set(existingMembers.map((m) => m.name.toLowerCase()));

  type UpdateOp = { id: string; data: { name: string; birthday: string | null; phone: string | null; notes: string | null; status: "ACTIVE" | "INACTIVE" } };
  type CreateOp = { name: string; birthday: string | null; phone: string | null; notes: string | null; status: "ACTIVE" | "INACTIVE"; establishmentId: string };

  const toUpdate: UpdateOp[] = [];
  const toCreate: CreateOp[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    const rowId   = (row["ID (não editar)"] ?? row["ID"] ?? "").toString().trim();
    const name    = (row["Nome"] ?? "").toString().trim();
    const birthdayRaw = (row["Data de Nascimento (DD/MM/AAAA)"] ?? row["Data de Nascimento"] ?? row["Nascimento"] ?? "").toString().trim();
    const phone   = (row["Telefone (com DDD)"] ?? row["Telefone"] ?? row["Celular"] ?? "").toString().trim() || null;
    const statusRaw = (row["Status"] ?? "ATIVO").toString().trim().toUpperCase();
    const notes   = (row["Observações"] ?? row["Obs"] ?? "").toString().trim() || null;

    if (!name) {
      results.errors.push(`Linha ${lineNum}: nome obrigatório`);
      continue;
    }

    let birthday: string | null = null;
    if (birthdayRaw) {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthdayRaw)) {
        birthday = birthdayRaw;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(birthdayRaw)) {
        const [y, m, d] = birthdayRaw.slice(0, 10).split("-");
        birthday = `${d}/${m}/${y}`;
      } else {
        results.errors.push(`Linha ${lineNum}: data inválida "${birthdayRaw}" (use DD/MM/AAAA)`);
        continue;
      }
    }

    const status = statusRaw === "INATIVO" ? "INACTIVE" : "ACTIVE";

    // — ATUALIZAÇÃO: linha tem ID válido que existe no banco —
    if (rowId && existingIdSet.has(rowId)) {
      toUpdate.push({ id: rowId, data: { name, birthday, phone, notes, status } });
      continue;
    }

    // — CRIAÇÃO: sem ID ou ID desconhecido —
    if (existingNameSet.has(name.toLowerCase())) {
      results.skipped++;
      continue;
    }

    toCreate.push({ name, birthday, phone, notes, status, establishmentId: eid });
  }

  // Executar atualizações
  if (toUpdate.length > 0) {
    await db.$transaction(
      toUpdate.map(({ id, data }) =>
        db.member.update({ where: { id }, data })
      )
    );
    results.updated = toUpdate.length;
  }

  // Executar criações respeitando limite do plano
  if (toCreate.length > 0) {
    const slots = isPro ? Infinity : Math.max(0, FREE_LIMIT - currentCount);
    const allowed = toCreate.slice(0, slots === Infinity ? undefined : slots);
    const blocked = toCreate.length - allowed.length;

    if (allowed.length > 0) {
      await db.$transaction(allowed.map((data) => db.member.create({ data })));
      results.created = allowed.length;
    }

    if (blocked > 0) {
      results.errors.push(`${blocked} membro(s) não criado(s): limite de ${FREE_LIMIT} membros atingido no plano gratuito.`);
    }
  }

  return NextResponse.json(results);
}
