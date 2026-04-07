import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/members/export — exportar lista de membros em xlsx
// A coluna ID é incluída para permitir atualização em massa via reimportação.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user.establishmentId;

  const members = await db.member.findMany({
    where: { establishmentId: eid, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const wb = XLSX.utils.book_new();

  const rows = [
    ["ID (não editar)", "Nome", "Data de Nascimento (DD/MM/AAAA)", "Telefone (com DDD)", "Status", "Observações"],
    ...members.map((m) => [
      m.id,
      m.name,
      m.birthday ?? "",
      m.phone ?? "",
      m.status === "ACTIVE" ? "ATIVO" : "INATIVO",
      m.notes ?? "",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Estiliza cabeçalho da coluna ID para deixar claro que não deve ser editada
  ws["!cols"] = [
    { wch: 30 }, // ID
    { wch: 35 }, // Nome
    { wch: 26 }, // Nascimento
    { wch: 20 }, // Telefone
    { wch: 10 }, // Status
    { wch: 35 }, // Observações
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Membros");

  // Aba de instruções
  const instrRows = [
    ["INSTRUÇÕES DE ATUALIZAÇÃO EM MASSA"],
    [""],
    ["1. Edite os campos desejados na aba 'Membros'"],
    ["2. NÃO edite a coluna 'ID (não editar)' — ela identifica cada cadastro"],
    ["3. Para ATUALIZAR um membro existente: mantenha o ID e edite os demais campos"],
    ["4. Para ADICIONAR um novo membro: deixe o ID em branco e preencha os demais"],
    ["5. Salve o arquivo e faça o upload na tela de Membros > Atualizar via Planilha"],
    [""],
    ["CAMPOS ACEITOS"],
    ["Status: ATIVO ou INATIVO"],
    ["Data de Nascimento: formato DD/MM/AAAA (ex: 25/03/1990)"],
    ["Telefone: com DDD, ex: (41) 99999-9999"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr["!cols"] = [{ wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instruções");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="membros-ovile-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
