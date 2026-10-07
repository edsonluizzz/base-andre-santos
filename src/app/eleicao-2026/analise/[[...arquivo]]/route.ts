import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { cabecalhosCache, prepararIndex, resolverArquivo } from "@/lib/analise-2026";

// Painel "Eleição 2026 — Análise": arquivos de analise-2026/public (dados públicos do TSE/IBGE).
// Página pública (liberada em auth.config): só serve esta pasta, nada mais do sistema. O gasto
// interno (interno.json) não vai para a Vercel e ainda é bloqueado em resolverArquivo.
export const dynamic = "force-dynamic";

const RAIZ = join(process.cwd(), "analise-2026", "public");
const BASE = "/eleicao-2026/analise/";
const VERSAO = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";

export async function GET(req: NextRequest, { params }: { params: { arquivo?: string[] } }) {
  try {
    const alvo = resolverArquivo(RAIZ, params.arquivo);
    if (!alvo) return new NextResponse("não encontrado", { status: 404 });
    const cache = cabecalhosCache(alvo.rel, VERSAO);
    if (cache.etag && req.headers.get("if-none-match") === cache.etag) return new NextResponse(null, { status: 304, headers: cache });
    const corpo = await readFile(alvo.caminho).catch(() => null);
    if (!corpo) return new NextResponse("não encontrado", { status: 404 });

    const saida = alvo.rel === "index.html" ? prepararIndex(corpo.toString("utf8"), BASE, (await auth())?.user?.role === "ADMIN") : corpo;
    // Link compartilhável, mas fora de buscadores.
    return new NextResponse(saida, { headers: { "content-type": alvo.tipo, "x-robots-tag": "noindex, nofollow", ...cache } });
  } catch (err) {
    console.error("[eleicao-2026/analise] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
