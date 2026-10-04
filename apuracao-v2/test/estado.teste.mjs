import test from "node:test";
import assert from "node:assert/strict";
import { parseCargo } from "../lib/parse.mjs";
import { CHAVES, mesclarBlocos, montarEstado } from "../lib/estado.mjs";
import { fx } from "./fx.mjs";

const blocosReais = () => Object.fromEntries(CHAVES.map((k) => [k, parseCargo(fx(`${k}.json`))]));
const base = { agora: 1000, proximaBuscaEm: 61000 };

function comVotos(bloco, votosPorNumero) {
  const b = structuredClone(bloco);
  for (const c of b.candidatos) if (votosPorNumero[c.n] != null) c.votos = votosPorNumero[c.n];
  b.candidatos.sort((x, y) => y.votos - x.votos);
  return b;
}

test("estado com os arquivos zerados de 2026", () => {
  const e = montarEstado({ ...base, blocos: blocosReais(), falhas: [] });
  assert.equal(e.fonte.ok, true);
  assert.equal(e.fonte.ultimaLeituraOk, 1000);
  assert.equal(e.andre.nome, "ANDRÉ SANTOS");
  assert.equal(e.andre.votos, 0);
  assert.equal(e.andre.delta, 0);
  assert.equal(e.andre.posGeral, 1); // todos empatados em zero
  assert.equal(e.andre.totalCandidatos, 592);
  assert.equal(e.estadual.candidatos.length, 41);
  assert.equal(e.federal.candidatos.length, 31);
  assert.equal(e.estadual.quociente, 0);
  assert.deepEqual(e.estadual.novo, { nominais: 0, legenda: 0, total: 0, vagasDiretas: 0, faltamProxima: null, eleitos: 0, eleitosProjecao: false });
  assert.equal(e.senador.vagas, 2);
  assert.equal(e.presidente.br.candidatos.length, 13);
  assert.equal(e.presidente.pr.candidatos.length, 13);
  assert.doesNotMatch(JSON.stringify(e), /NaN|Infinity/);
});

test("posição conta quem tem estritamente mais votos", () => {
  const blocos = blocosReais();
  const novo = blocos.estadual.candidatos.filter((c) => c.partido === "NOVO" && c.n !== "30777");
  const outro = blocos.estadual.candidatos.find((c) => c.partido !== "NOVO");
  blocos.estadual = comVotos(blocos.estadual, { 30777: 500, [novo[0].n]: 900, [outro.n]: 700 });
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.andre.posChapa, 2);
  assert.equal(e.andre.posGeral, 3);
  assert.equal(e.estadual.candidatos[0].pos, 1);
  assert.equal(e.estadual.candidatos[1].n, "30777");
});

test("delta guarda a última variação mesmo em ciclo sem mudança", () => {
  const blocos = blocosReais();
  const e1 = montarEstado({ ...base, blocos, falhas: [] });
  const b2 = { ...blocos, estadual: comVotos(blocos.estadual, { 30777: 150 }) };
  const e2 = montarEstado({ ...base, blocos: b2, falhas: [], anterior: e1 });
  assert.equal(e2.andre.delta, 150);
  const e3 = montarEstado({ ...base, blocos: b2, falhas: [], anterior: e2 });
  assert.equal(e3.andre.delta, 150);
});

test("primeiro ciclo com tudo falhando não quebra", () => {
  const vazio = Object.fromEntries(CHAVES.map((k) => [k, null]));
  const { blocos, falhas } = mesclarBlocos(null, vazio);
  assert.deepEqual(falhas, CHAVES);
  const e = montarEstado({ ...base, blocos, falhas, erros: ["TSE respondeu 403"] });
  assert.equal(e.fonte.ok, false);
  assert.equal(e.fonte.ultimaLeituraOk, null);
  assert.equal(e.fonte.erro, "TSE respondeu 403");
  assert.equal(e.andre, null);
  assert.equal(e.pr, null);
  assert.equal(e.estadual, null);
  assert.deepEqual(e.presidente, { br: null, pr: null });
});

test("falha de um arquivo preserva o bloco anterior e marca a fonte", () => {
  const anteriores = blocosReais();
  const e1 = montarEstado({ ...base, blocos: anteriores, falhas: [] });
  const novos = { ...blocosReais(), federal: null };
  const { blocos, falhas } = mesclarBlocos(anteriores, novos);
  assert.deepEqual(falhas, ["federal"]);
  assert.equal(blocos.federal, anteriores.federal);
  const e2 = montarEstado({ ...base, agora: 61000, blocos, falhas, anterior: e1 });
  assert.equal(e2.fonte.ok, false);
  assert.equal(e2.fonte.ultimaLeituraOk, 1000);
  assert.equal(e2.federal.candidatos.length, 31);
});

test("André ausente do arquivo: andre nulo, resto intacto", () => {
  const blocos = blocosReais();
  blocos.estadual = { ...blocos.estadual, candidatos: blocos.estadual.candidatos.filter((c) => c.n !== "30777") };
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.andre, null);
  assert.equal(e.estadual.candidatos.length, 40);
});

function comEleitos(bloco, numeros, situacao = "Eleito por QP") {
  const b = structuredClone(bloco);
  for (const c of b.candidatos) if (numeros.includes(c.n)) { c.eleito = true; c.situacao = situacao; }
  return b;
}

test("V2: contagem de eleitos do NOVO e lista geral de eleitos", () => {
  const blocos = blocosReais();
  const novo = blocos.estadual.candidatos.filter((c) => c.partido === "NOVO").slice(0, 2).map((c) => c.n);
  const outro = blocos.estadual.candidatos.find((c) => c.partido !== "NOVO");
  blocos.estadual = comEleitos(comVotos(blocos.estadual, { [novo[0]]: 300, [novo[1]]: 200, [outro.n]: 900 }), [...novo, outro.n]);
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.estadual.novo.eleitos, 2);
  assert.equal(e.federal.novo.eleitos, 0);
  assert.deepEqual(e.eleitos.estadual.map((c) => c.n), [outro.n, novo[0], novo[1]]);
  assert.deepEqual(Object.keys(e.eleitos.estadual[0]).sort(), ["n", "nome", "partido", "situacao", "votos"]);
  assert.deepEqual(e.eleitos.federal, []);
});

test("V2: presidente traz comparecimento, válidos, brancos e nulos", () => {
  const e = montarEstado({ ...base, blocos: blocosReais(), falhas: [] });
  for (const k of ["br", "pr"]) {
    assert.deepEqual(
      Object.keys(e.presidente[k]).sort(),
      ["brancos", "candidatos", "comparecimentoPct", "nulos", "secoesPct", "vagas", "validos"],
    );
  }
});

test("V2: sem bloco estadual a lista de eleitos fica vazia", () => {
  const e = montarEstado({ ...base, blocos: { ...blocosReais(), estadual: null }, falhas: ["estadual"] });
  assert.deepEqual(e.eleitos, { estadual: [], federal: [], projecao: false });
});

test("V2: sem eleitos oficiais, projeta pelo que já foi apurado e marca como projeção", () => {
  const blocos = blocosReais();
  // Dá votos a todos: o NOVO com muito voto garante cadeiras na projeção
  const votos = {};
  blocos.estadual.candidatos.forEach((c, i) => { votos[c.n] = c.partido === "NOVO" ? 200000 - i : 1000 + i; });
  const est = comVotos(blocos.estadual, votos);
  const totalPorPartido = new Map();
  for (const c of est.candidatos) totalPorPartido.set(c.partido, (totalPorPartido.get(c.partido) ?? 0) + c.votos);
  est.partidos = est.partidos.map((p) => ({ ...p, nominais: totalPorPartido.get(p.sg) ?? 0, total: totalPorPartido.get(p.sg) ?? 0 }));
  est.validos = [...totalPorPartido.values()].reduce((a, b) => a + b, 0);
  blocos.estadual = est;
  blocos.governador = comVotos(blocos.governador, Object.fromEntries(blocos.governador.candidatos.map((c, i) => [c.n, i === 0 ? 2000 : 100])));
  blocos.governador.validos = 2000 + 100 * (blocos.governador.candidatos.length - 1); // 74%: maioria absoluta
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.eleitos.projecao, true);
  assert.equal(e.eleitos.estadual.length, 54);
  assert.match(e.eleitos.estadual[0].situacao, /^Projeção/);
  assert.ok(e.estadual.novo.eleitos > 0);
  assert.equal(e.estadual.novo.eleitosProjecao, true);
  assert.ok(["QP", "MÉDIA"].includes(e.estadual.candidatos[0].projecao));
  assert.equal(e.governador.candidatos[0].projecao, "ELEITO");
  assert.equal(e.governador.candidatos[1].projecao, null);
  assert.equal(e.presidente.pr.candidatos[0].projecao ?? null, null);
});

test("V2: com eleitos oficiais, não projeta", () => {
  const blocos = blocosReais();
  const novo = blocos.estadual.candidatos.find((c) => c.partido === "NOVO");
  blocos.estadual = comEleitos(comVotos(blocos.estadual, { [novo.n]: 500 }), [novo.n]);
  blocos.estadual.validos = 1000;
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.eleitos.projecao, false);
  assert.deepEqual(e.eleitos.estadual.map((c) => c.n), [novo.n]);
  assert.equal(e.estadual.novo.eleitosProjecao, false);
  assert.equal(e.estadual.candidatos.find((c) => c.n === novo.n).projecao, null);
});
