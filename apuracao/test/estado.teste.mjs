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
  assert.deepEqual(e.estadual.novo, { nominais: 0, legenda: 0, total: 0, vagasDiretas: 0, faltamProxima: null });
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
