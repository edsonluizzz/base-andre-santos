import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lerArquivoAnalise } from "@/lib/analise-2026";
import { ehCargoVendido, ehMunicipal, gerarToken, linkDiagnostico, raizDadosUF, separarCargo } from "@/lib/diagnostico";

// Vendas do Diagnóstico Eleitoral: cada venda (Pix recebido) gera o link do cliente. Só super admin.

type Candidato = { n: string; nm: string; sg: string; votos: number };
const candidatos = new Map<string, Promise<Map<string, Candidato>>>();
// Gerais 2026: dados/<cargo>.json; gerais anteriores ("estadual-2022"): dados/2022/estadual.json;
// municipais ("vereador-2024"): dados/2024/vereador/<cd da cidade>.json. Outras UFs ("sc/estadual"): dentro de dados/uf/<uf>/.
const RAIZ = join(process.cwd(), "analise-2026", "public");
function candidatosDo(chaveCargo: string, cidade: string | null) {
  const chave = `${chaveCargo}:${cidade ?? ""}`;
  if (!candidatos.has(chave)) {
    const { uf, cargo } = separarCargo(chaveCargo)!;
    const [nome, ano] = cargo.split("-");
    const rel = raizDadosUF(uf) + (ehMunicipal(cargo) ? `${ano}/${nome}/${cidade}.json` : ano ? `${ano}/${nome}.json` : `${cargo}.json`);
    candidatos.set(chave, lerArquivoAnalise(RAIZ, rel)
      .then((t) => new Map(t ? (JSON.parse(t.toString("utf8")).candidatos as Candidato[]).map((c) => [c.n, c]) : []))
      .catch(() => new Map()));
  }
  return candidatos.get(chave)!;
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
    const cidade = String(b.cidade ?? "").trim();
    const cliente = String(b.cliente ?? "").trim().slice(0, 120);
    const telefone = String(b.telefone ?? "").trim().slice(0, 30) || null;
    const valor = Number(b.valor);
    if (!ehCargoVendido(cargo)) return NextResponse.json({ error: "Cargo inválido" }, { status: 400 });
    if (!cliente) return NextResponse.json({ error: "Informe o cliente" }, { status: 400 });
    if (!Number.isFinite(valor) || valor < 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    const municipal = ehMunicipal(cargo);
    if (municipal && !/^\d{5}$/.test(cidade)) return NextResponse.json({ error: "Escolha a cidade" }, { status: 400 });
    const c = (await candidatosDo(cargo, municipal ? cidade : null)).get(numero);
    if (!c) return NextResponse.json({ error: `Não há candidato ${numero} para ${cargo}${municipal ? " nessa cidade" : ` em ${separarCargo(cargo)!.uf.toUpperCase()}`}` }, { status: 400 });
    // municipais: o número se repete entre cidades, então o acesso guarda "cidade-número"
    const chave = municipal ? `${cidade}-${numero}` : numero;
    const venda = await db.diagnosticoAcesso.create({
      data: { token: gerarToken(), cargo, numero: chave, candidato: c.nm, cliente, telefone, valor, criadoPor: session.user?.email ?? null },
    });
    return NextResponse.json({ ...venda, link: linkDiagnostico(venda.token, cargo, chave) }, { status: 201 });
  } catch (err) {
    console.error("[api/diagnosticos] POST:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
