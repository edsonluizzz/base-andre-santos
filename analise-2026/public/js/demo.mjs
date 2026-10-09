// Modo demonstração (?demo na URL): os mesmos dados do TSE com nomes, números de urna e partidos
// fictícios, e votos/receita multiplicados por um fator próprio de cada candidato. Serve para mostrar
// o produto (landing, vídeo) sem expor nenhum candidato real. Tudo é derivado de forma determinística,
// então a mesma URL gera sempre as mesmas telas.

const NOMES = ["Carlos", "Marcos", "Rafael", "Juliano", "Everton", "Rodrigo", "Gilmar", "Leandro", "Fabiano", "Sérgio",
  "Adriano", "Valdir", "Cristiano", "Diego", "Renato", "Paulo", "Ademir", "Márcio", "Gustavo", "Ricardo",
  "Luciana", "Patrícia", "Simone", "Cláudia", "Adriana", "Fernanda", "Rosane", "Elaine", "Juliana", "Marisa",
  "Tatiane", "Vanessa", "Débora", "Jaqueline", "Silvana", "Kátia", "Roberta", "Daniela", "Cristina", "Sandra"];
const SOBRENOMES = ["Mendes", "Prado", "Teixeira", "Kowalski", "Fontana", "Bortolini", "Machado", "Andrade", "Zanella", "Ribas",
  "Camargo", "Lacerda", "Vieira", "Nogueira", "Pacheco", "Moretti", "Siqueira", "Bueno", "Carvalho", "Rocha",
  "Brandt", "Tavares", "Muller", "Gonçalves", "Antunes", "Cordeiro", "Wolff", "Bittencourt", "Leal",
  "Marchi", "Quadros", "Furtado", "Sartori", "Hoffmann", "Batista", "Dias", "Medeiros", "Schmidt"];
// Títulos acompanham o gênero do nome (os 20 primeiros nomes de NOMES são masculinos).
const TITULOS_M = ["Professor", "Pastor", "Delegado", "Sargento", "Dr."];
const TITULOS_F = ["Professora", "Pastora", "Delegada", "Enfermeira", "Dra."];
// Nomes de partido inventados, sem semelhança com siglas ou nomes de partidos reais.
const PARTIDOS = ["AURORA", "CEDRO", "MERIDIANO", "VÉRTICE", "ARAUCÁRIA", "CORRENTE", "FAROL", "ÂNCORA",
  "TERRA FIRME", "RAÍZES", "PONTE", "BÚSSOLA", "SEMENTE", "TRILHA", "ATLAS", "ORLA",
  "NASCENTE", "PILAR", "CUME", "ELO", "MARCO", "RUMO", "ESTEIO", "VÍNCULO",
  "PRISMA", "SINTONIA", "PROA", "ALICERCE", "CAMINHO", "LUZEIRO", "PLANALTO", "ENSEADA"];

// Hash de texto → número em [0, 1).
function hash(s, sal = "") {
  let h = 2166136261;
  for (const ch of sal + s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1e6) / 1e6;
}
const escolher = (lista, s, sal) => lista[Math.floor(hash(s, sal) * lista.length)];

function nomeFicticio(chave, usados) {
  for (let tent = 0; tent < 50; tent++) {
    const k = `${chave}#${tent}`;
    const i = Math.floor(hash(k, "n") * NOMES.length);
    const titulo = hash(k, "t") < 0.14 ? `${escolher(i < 20 ? TITULOS_M : TITULOS_F, k, "ti")} ` : "";
    const nm = `${titulo}${NOMES[i]} ${escolher(SOBRENOMES, k, "s")}`.toUpperCase();
    if (!usados.has(nm)) { usados.add(nm); return nm; }
  }
  return `CANDIDATO ${chave}`;
}

function numeroFicticio(c, reais, usados) {
  const dig = c.n.length;
  for (let tent = 0; tent < 500; tent++) {
    const base = 10 ** (dig - 1);
    const n = String(base + Math.floor(hash(`${c.sq}#${tent}`, "num") * (9 * base)));
    if (!reais.has(n) && !usados.has(n)) { usados.add(n); return n; }
  }
  return c.n;
}

const escala = (pares, f) => pares.map(([k, v]) => [k, Math.max(1, Math.round(v * f))]).filter(([, v]) => v > 0);

export function aplicarDemo(D) {
  const reais = new Set(D.candidatos.map((c) => c.n));
  const siglas = [...new Set(D.agremiacoes.flatMap((a) => a.siglas))].sort();
  const mapaSigla = new Map(siglas.map((s, i) => [s, PARTIDOS[i % PARTIDOS.length]]));
  const nomesUsados = new Set(), numsUsados = new Set();
  for (const c of D.candidatos) {
    const fv = 0.72 + 0.66 * hash(c.sq, "votos");     // 0,72× a 1,38× nos votos
    const fr = 0.78 + 0.5 * hash(c.sq, "receita");    // 0,78× a 1,28× na receita
    c.nOrig = c.n;
    c.fatorVotos = fv;
    c.n = numeroFicticio(c, reais, numsUsados);
    c.nm = nomeFicticio(c.sq, nomesUsados);
    c.sg = mapaSigla.get(c.sg) ?? c.sg;
    c.mun = escala(c.mun, fv);
    c.votos = c.mun.reduce((s, [, v]) => s + v, 0);
    if (c.receita != null) c.receita = Math.round(c.receita * fr);
    if (c.despesa != null) c.despesa = Math.round(c.despesa * fr);
    if (c.receitaPorOrigem) c.receitaPorOrigem = Object.fromEntries(Object.entries(c.receitaPorOrigem).map(([k, v]) => [k, Math.round(v * fr)]));
  }
  for (const a of D.agremiacoes) {
    a.siglas = a.siglas.map((s) => mapaSigla.get(s) ?? s);
    a.rotulo = a.federacao ? a.siglas.join(" / ") : a.siglas[0];
    a.nm = a.federacao ? `FEDERAÇÃO ${a.siglas.join(" ")}` : a.siglas[0];
    const doPartido = D.candidatos.filter((c) => a.siglas.includes(c.sg));
    a.nominais = doPartido.reduce((s, c) => s + c.votos, 0);
    // Cadeiras coerentes com os votos fictícios (só o quociente; sem sobras: é demonstração).
    a.vagas = Math.floor((a.nominais + a.legenda) / D.cargo.qe);
  }
  // Ranking muda com os novos votos; situação "Eleito" passa para os mais votados de cada chapa não importa aqui.
  D.candidatos.sort((a, b) => b.votos - a.votos);
  // URL aceita o número real (para gerar as telas) e o fictício; nenhum colide (numeroFicticio evita os reais).
  D.porNumero = new Map(D.candidatos.flatMap((c) => [[c.n, c], [c.nOrig, c]]));
  D.demo = true;
  return D;
}
