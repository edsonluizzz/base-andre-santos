import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ehCargo, gerarToken, linkDiagnostico } from "@/lib/diagnostico";

// Vendas do Diagnóstico Eleitoral: cada venda (Pix recebido) gera o link do cliente. Só super admin.

type Candidato = { n: string; nm: string; sg: string; votos: number };
const candidatos = new Map<string, Promise<Map<string, Candidato>>>();
function candidatosDo(cargo: string) {
  if (!candidatos.has(cargo)) {
    const arq = join(process.cwd(), "analise-2026", "public", "dados", `${cargo}.json`);
    candidatos.set(cargo, readFile(arq, "utf8").then((t) => new Map((JSON.parse(t).candidatos as Candidato[]).map((c) => [c.n, c]))));
  }
  return candidatos.get(cargo)!;
}

async function superAdmin() {
  const session = await auth();
  return (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin ? session : null;
}

export async function GET() {
  try {
    if (!(await superAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const vendas = await db.diagnosticoAcesso.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(vendas.map((v) => ({ ...v, link: linkDiagnostico(v.token, v.cargo, v.numero) })));
  } catch (err) {
    console.error("[api/diagnosticos] GET:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await superAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const b = await req.json().catch(() => ({}));
    const cargo = b.cargo;
    const numero = String(b.numero ?? "").trim();
    const cliente = String(b.cliente ?? "").trim().slice(0, 120);
    const telefone = String(b.telefone ?? "").trim().slice(0, 30) || null;
    const valor = Number(b.valor);
    if (!ehCargo(cargo)) return NextResponse.json({ error: "Cargo inválido" }, { status: 400 });
    if (!cliente) return NextResponse.json({ error: "Informe o cliente" }, { status: 400 });
    if (!Number.isFinite(valor) || valor < 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    const c = (await candidatosDo(cargo)).get(numero);
    if (!c) return NextResponse.json({ error: `Não há candidato ${numero} para deputado ${cargo} no PR` }, { status: 400 });
    const venda = await db.diagnosticoAcesso.create({
      data: { token: gerarToken(), cargo, numero, candidato: c.nm, cliente, telefone, valor, criadoPor: session.user?.email ?? null },
    });
    return NextResponse.json({ ...venda, link: linkDiagnostico(venda.token, cargo, numero) }, { status: 201 });
  } catch (err) {
    console.error("[api/diagnosticos] POST:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
