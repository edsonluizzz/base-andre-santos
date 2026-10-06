import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { prepararIndex, resolverArquivo } from "@/lib/analise-2026";

// Painel "Eleição 2026 — Análise": arquivos de analise-2026/public (dados públicos do TSE/IBGE),
// só para ADMIN logado. Não há dado por campanha aqui, então não filtra por campaignId.
export const dynamic = "force-dynamic";

const RAIZ = join(process.cwd(), "analise-2026", "public");
const BASE = "/eleicao-2026/analise/";

export async function GET(req: NextRequest, { params }: { params: { arquivo?: string[] } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.redirect(new URL("/login", req.url));
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const alvo = resolverArquivo(RAIZ, params.arquivo);
    if (!alvo) return new NextResponse("não encontrado", { status: 404 });
    const corpo = await readFile(alvo.caminho).catch(() => null);
    if (!corpo) return new NextResponse("não encontrado", { status: 404 });

    const saida = alvo.rel === "index.html" ? prepararIndex(corpo.toString("utf8"), BASE) : corpo;
    return new NextResponse(saida, { headers: { "content-type": alvo.tipo, "cache-control": "private, no-cache" } });
  } catch (err) {
    console.error("[eleicao-2026/analise] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
