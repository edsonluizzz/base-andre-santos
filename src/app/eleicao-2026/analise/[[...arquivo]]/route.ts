import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cabecalhosCache, lerArquivoAnalise, prepararIndex, resolverArquivo } from "@/lib/analise-2026";
import {
  COOKIE_DIAGNOSTICO, HOST_DIAGNOSTICO, arquivoDeCandidato, chaveCandidato, ehHostDiagnostico, juntarToken, lerTokens, tokenValido,
} from "@/lib/diagnostico";

// Diagnóstico Eleitoral: arquivos de analise-2026/public (dados públicos do TSE/IBGE).
// Produto à parte, público só em diagnostico.ovile.com.br (rewrite no next.config); em ovile.com.br/eleicao-2026/analise
// é ferramenta interna, só para ADMIN.
// Quem não comprou vê a prévia; os votos por local de cada candidato (dados/[uf/<uf>/]<cargo>/<nº>.json) só saem para
// quem tem token ativo (link vendido) ou é ADMIN do sistema. O gasto interno (interno.json) nunca sai.
export const dynamic = "force-dynamic";

const RAIZ = join(process.cwd(), "analise-2026", "public");
const VERSAO = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";
const UM_ANO = 60 * 60 * 24 * 365;

async function acessosAtivos(tokens: string[]) {
  if (!tokens.length) return [];
  return db.diagnosticoAcesso.findMany({ where: { token: { in: tokens }, ativo: true }, select: { id: true, cargo: true, numero: true } });
}

export async function GET(req: NextRequest, { params }: { params: { arquivo?: string[] } }) {
  try {
    // Cabeçalho Host, o mesmo da regra de rewrite (x-forwarded-host pode ser forjado pelo cliente).
    const noSubdominio = ehHostDiagnostico(req.headers.get("host"));
    const base = noSubdominio ? "/" : "/eleicao-2026/analise/";
    // Produto à parte: fora do subdomínio, o painel é ferramenta interna (só ADMIN do sistema).
    // O middleware já barra; esta checagem é a segunda trava, caso a regra de lá mude.
    if (!noSubdominio && (await auth())?.user?.role !== "ADMIN") return new NextResponse("não encontrado", { status: 404 });

    // Entrada pelo link vendido (?k=token): grava o token no cookie e limpa a URL (o #hash continua).
    const k = req.nextUrl.searchParams.get("k");
    if (k != null) {
      const destino = new URL(noSubdominio ? `https://${HOST_DIAGNOSTICO}/` : req.nextUrl.toString());
      if (!noSubdominio) destino.searchParams.delete("k");
      const res = NextResponse.redirect(destino, 303);
      if (tokenValido(k) && (await acessosAtivos([k])).length) {
        res.cookies.set(COOKIE_DIAGNOSTICO, juntarToken(req.cookies.get(COOKIE_DIAGNOSTICO)?.value, k), {
          httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: UM_ANO,
        });
      }
      return res;
    }

    const partes = (params.arquivo ?? []).filter(Boolean); // raiz do subdomínio chega como "/eleicao-2026/analise/"
    const rel = partes.join("/");
    const ehAdmin = async () => (await auth())?.user?.role === "ADMIN";
    const tokens = lerTokens(req.cookies.get(COOKIE_DIAGNOSTICO)?.value);

    // O que este navegador pode ver: candidatos comprados (cargo:número), tudo (admin) e os dados de venda.
    if (rel === "acesso.json") {
      const [admin, acessos] = await Promise.all([ehAdmin(), acessosAtivos(tokens)]);
      return NextResponse.json({
        todos: admin,
        liberados: acessos.map((a) => chaveCandidato(a.cargo, a.numero)),
        venda: { preco: Number(process.env.DIAGNOSTICO_PRECO ?? 297), whatsapp: process.env.DIAGNOSTICO_WHATSAPP ?? null },
      }, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
    }

    const alvo = resolverArquivo(RAIZ, partes);
    if (!alvo) return new NextResponse("não encontrado", { status: 404 });

    // Votos por local: produto pago. Qualquer token ativo libera (o cliente também carrega os comparados).
    if (arquivoDeCandidato(alvo.rel)) {
      const acessos = await acessosAtivos(tokens);
      if (!acessos.length && !(await ehAdmin())) return new NextResponse("acesso restrito", { status: 403 });
      if (acessos.length) {
        db.diagnosticoAcesso.updateMany({ where: { id: { in: acessos.map((a) => a.id) } }, data: { ultimoUso: new Date() } })
          .catch((e) => console.error("[eleicao-2026/analise] ultimoUso:", e));
      }
      const corpo = await lerArquivoAnalise(RAIZ, alvo.rel);
      if (!corpo) return new NextResponse("não encontrado", { status: 404 });
      return new NextResponse(corpo, { headers: { "content-type": alvo.tipo, "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
    }

    const cache = cabecalhosCache(alvo.rel, VERSAO);
    if (cache.etag && req.headers.get("if-none-match") === cache.etag) return new NextResponse(null, { status: 304, headers: cache });
    const corpo = await lerArquivoAnalise(RAIZ, alvo.rel);
    if (!corpo) return new NextResponse("não encontrado", { status: 404 });

    // O link "← sistema" só faz sentido no endereço do sistema, não no subdomínio do produto.
    const saida = alvo.rel === "index.html" ? prepararIndex(corpo.toString("utf8"), base, !noSubdominio && (await ehAdmin())) : corpo;
    // Link compartilhável, mas fora de buscadores.
    return new NextResponse(saida, { headers: { "content-type": alvo.tipo, "x-robots-tag": "noindex, nofollow", ...cache } });
  } catch (err) {
    console.error("[eleicao-2026/analise] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
