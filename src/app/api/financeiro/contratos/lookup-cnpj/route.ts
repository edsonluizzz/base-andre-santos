import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { lookupCnpj } from "@/lib/cnpj-lookup";

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const cnpj = new URL(req.url).searchParams.get("cnpj");
    if (!cnpj) return NextResponse.json({ error: "Informe o CNPJ" }, { status: 400 });

    const result = await lookupCnpj(cnpj);
    if (!result) return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/financeiro/contratos/lookup-cnpj GET] erro:", err);
    return NextResponse.json({ error: "Erro ao consultar CNPJ" }, { status: 500 });
  }
}
