import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

// GET /api/members/template — baixar planilha modelo
export async function GET() {
  try {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wb = XLSX.utils.book_new();

  // Aba de dados
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nome *", "Data de Nascimento (DD/MM/AAAA)", "Telefone (com DDD)", "Status", "Observações"],
    ["João da Silva", "15/03/2000", "(47) 99999-0000", "ATIVO", ""],
    ["Maria Souza",   "22/07/1995", "(47) 98888-0001", "ATIVO", "Líder de louvor"],
  ]);

  // Largura das colunas
  ws["!cols"] = [
    { wch: 35 },
    { wch: 28 },
    { wch: 22 },
    { wch: 12 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Membros");

  // Aba de instruções
  const wsInst = XLSX.utils.aoa_to_sheet([
    ["INSTRUÇÕES DE PREENCHIMENTO"],
    [""],
    ["Coluna", "Obrigatório", "Formato", "Valores aceitos"],
    ["Nome *",                      "Sim", "Texto",              "Qualquer nome"],
    ["Data de Nascimento",          "Não", "DD/MM/AAAA",         "Ex: 25/12/1990"],
    ["Telefone (com DDD)",          "Não", "Texto",              "Ex: (47) 99999-0000"],
    ["Status",                      "Não", "ATIVO ou INATIVO",   "Padrão: ATIVO"],
    ["Observações",                 "Não", "Texto",              "Qualquer texto"],
    [""],
    ["DICAS:"],
    ["- Não altere os cabeçalhos da primeira linha"],
    ["- Linhas em branco são ignoradas"],
    ["- Membros com o mesmo nome não serão duplicados — verifique antes"],
  ]);
  wsInst["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instruções");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-membros-ovile.xlsx"',
    },
  });
  } catch (err) {
    console.error("[members/template] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
