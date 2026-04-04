import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/members/export — exportar lista de membros em xlsx
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user.establishmentId;

  const members = await db.member.findMany({
    where: { establishmentId: eid },
    orderBy: { name: "asc" },
  });

  const wb = XLSX.utils.book_new();

  const rows = [
    ["Nome", "Data de Nascimento", "Telefone", "Status", "Observações", "Cadastrado em"],
    ...members.map((m) => [
      m.name,
      m.birthday ?? "",
      m.phone ?? "",
      m.status === "ACTIVE" ? "ATIVO" : "INATIVO",
      m.notes ?? "",
      m.createdAt.toLocaleDateString("pt-BR"),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 35 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Membros");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="membros-ovile-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
