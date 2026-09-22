import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { buildSimpleTablePdf } from "@/lib/pdf-table";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CARGO_LABEL: Record<number, string> = {
  7: "Deputado Estadual",
  6: "Deputado Federal",
  5: "Senador",
  3: "Governador",
};

type Row = {
  numero: number;
  nome: string;
  situacao?: string | null;
  totalRecebido: number;
  qtdRecebido?: number;
  totalReceitaPF?: number;
  totalReceitaPJ?: number;
  totalPartidos?: number;
  dataUltimaAtualizacaoContas?: string | null;
};

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const uf = (searchParams.get("uf") ?? "PR").toUpperCase();
    const cargo = Number(searchParams.get("cargo") ?? 7);
    const partido = Number(searchParams.get("partido") ?? 30);

    const snapshot = await gate.db.tseComparativoSnapshot.findUnique({
      where: { campaignId_uf_cargo_partido: { campaignId: gate.cid, uf, cargo, partido } },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Nenhum snapshot salvo ainda para esse cargo/partido/UF." }, { status: 404 });
    }

    const rows = [...(snapshot.data as Row[])].sort((a, b) => (b.totalRecebido ?? 0) - (a.totalRecebido ?? 0));
    const total = rows.reduce((sum, r) => sum + (r.totalRecebido ?? 0), 0);
    const cargoLabel = CARGO_LABEL[cargo] ?? `Cargo ${cargo}`;
    const partidoLabel = partido ? "Partido NOVO" : "Campo completo";

    const tableRows = rows.map((r, i) => {
      const pf = r.totalReceitaPF ?? 0;
      const pj = r.totalReceitaPJ ?? 0;
      const partidos = r.totalPartidos ?? 0;
      const outras = (r.totalRecebido ?? 0) - pf - pj - partidos;
      return [
        `${i + 1}º`,
        `${r.nome}\n${r.numero}`,
        r.situacao ?? "—",
        String(r.qtdRecebido ?? 0),
        fmtMoney(pf),
        fmtMoney(pj),
        fmtMoney(partidos),
        Math.abs(outras) > 0.01 ? fmtMoney(outras) : "—",
        fmtMoney(r.totalRecebido ?? 0),
        r.dataUltimaAtualizacaoContas ?? "—",
      ];
    });

    const pdfBuffer = await buildSimpleTablePdf({
      title: `Recebimentos declarados ao TSE — ${cargoLabel} ${uf}, ${partidoLabel}`,
      subtitle: `Snapshot de ${new Date(snapshot.fetchedAt).toLocaleString("pt-BR")} — ${rows.length} candidato(s) — Total: ${fmtMoney(total)}`,
      columns: [
        { header: "Pos.", width: 30 },
        { header: "Candidato / Nº", width: 130 },
        { header: "Situação", width: 65 },
        { header: "Nº Doações", width: 45, align: "right" },
        { header: "Pessoa Física", width: 70, align: "right" },
        { header: "Pessoa Jurídica", width: 70, align: "right" },
        { header: "Recursos Partido", width: 75, align: "right" },
        { header: "Outras Receitas", width: 70, align: "right" },
        { header: "Total Recebido", width: 75, align: "right" },
        { header: "Últ. Atualização", width: 60 },
      ],
      rows: tableRows,
      totalsRow: ["", "TOTAL GERAL", "", "", "", "", "", "", fmtMoney(total), ""],
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tse-recebimentos-${cargoLabel.toLowerCase().replace(/\s+/g, "-")}-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/financeiro/tse-comparativo/export-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
