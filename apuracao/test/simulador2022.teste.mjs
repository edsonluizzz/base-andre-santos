import test from "node:test";
import assert from "node:assert/strict";
import { carregarDados2022, criarSimulador2022 } from "../lib/simulador2022.mjs";
import { parseCargo } from "../lib/parse.mjs";
import { CHAVES, montarEstado } from "../lib/estado.mjs";

const cargoMini = (vagas, candidatos, partidos, validos, votos, legenda) => ({ vagas, candidatos, partidos, validos, votos, legenda });
const mini = () => {
  const cands = [
    { n: "30123", nome: "FULANO", partido: "NOVO", st: "Eleito por QP", e: "s" },
    { n: "30456", nome: "BELTRANA", partido: "NOVO", st: "Suplente", e: "n" },
    { n: "13000", nome: "CICLANO", partido: "PT", st: "Não eleito", e: "n" },
  ];
  const c = () => cargoMini(2, cands, ["NOVO", "PT"], [1000, 3000], [[0, 400, 1, 100, 2, 450], [0, 1600, 2, 1300]], [[0, 50], [0, 60, 1, 40]]);
  return {
    municipios: [{ cd: "1", nome: "ALFA", secoes: 10, aptos: 1500, comparecimento: 1200 }, { cd: "2", nome: "BETA", secoes: 30, aptos: 4000, comparecimento: 3300 }],
    cargos: { estadual: c(), federal: c(), senador: c(), governador: c(), presPr: c() },
    ufs: [{ cd: "PR", nome: "PR", secoes: 40, aptos: 5500, comparecimento: 4500 }],
    presBr: cargoMini(1, cands, ["NOVO", "PT"], [4000], [[0, 2000, 1, 100, 2, 1750]], [[]]),
  };
};

test("votos só crescem e o último passo fecha exatamente no resultado final", () => {
  const sim = criarSimulador2022(mini(), { passos: 8, foco: "30123" });
  let antes = -1;
  let ultimo;
  let viuParcial = false;
  for (let i = 0; i < 8; i++) {
    ultimo = sim.proximo();
    const est = parseCargo(ultimo.estadual);
    const v = est.candidatos.find((c) => c.n === "30123").votos;
    assert.ok(v >= antes, `passo ${i}: ${v} < ${antes}`);
    antes = v;
    if (i < 7) {
      assert.equal(est.candidatos.find((c) => c.n === "30123").situacao, "", "situação final só no fim");
      if (est.secoesPct > 0 && est.secoesPct < 100) viuParcial = true;
    }
  }
  assert.ok(viuParcial, "passou por apuração parcial");
  assert.equal(sim.terminou, true);
  const est = parseCargo(ultimo.estadual);
  assert.equal(est.secoesPct, 100);
  assert.equal(est.validos, 4000);
  assert.equal(est.comparecimentoPct, 81.82);
  assert.deepEqual(est.candidatos.map((c) => [c.n, c.votos]), [["30123", 2000], ["13000", 1750], ["30456", 100]]);
  assert.deepEqual(est.candidatos[0], { n: "30123", nome: "FULANO", partido: "NOVO", votos: 2000, pct: 50, situacao: "Eleito por QP", eleito: true });
  assert.deepEqual(est.partidos.find((p) => p.sg === "NOVO"), { sg: "NOVO", nominais: 2100, legenda: 110, total: 2210 });
  assert.equal(est.vagas, 2);
  for (const k of CHAVES) assert.ok(parseCargo(ultimo[k]).candidatos.length === 3, k);
});

test("municípios do candidato em foco acompanham a apuração", () => {
  const sim = criarSimulador2022(mini(), { passos: 4, foco: "30123" });
  for (let i = 0; i < 4; i++) sim.proximo();
  const m = sim.municipios(null, 77);
  assert.equal(m.atualizadoEm, 77);
  assert.equal(m.total, 2);
  assert.equal(m.comVotos, 2);
  assert.deepEqual(m.lista.map((x) => [x.nome, x.votos, x.validos, x.secoesPct]), [["BETA", 1600, 3000, 100], ["ALFA", 400, 1000, 100]]);
  assert.equal(m.lista[1].pctValidos, 40);
});

test("o destaque do painel segue o candidato em foco", () => {
  const sim = criarSimulador2022(mini(), { passos: 1, foco: "30456" });
  const brutos = sim.proximo();
  const blocos = Object.fromEntries(CHAVES.map((k) => [k, parseCargo(brutos[k])]));
  const e = montarEstado({ blocos, falhas: [], agora: 1, proximaBuscaEm: 2, foco: "30456" });
  assert.equal(e.andre.n, "30456");
  assert.equal(e.andre.nome, "BELTRANA");
  assert.equal(e.andre.posChapa, 2);
  const padrao = montarEstado({ blocos, falhas: [], agora: 1, proximaBuscaEm: 2 });
  assert.equal(padrao.andre, null); // 30777 não existe nesse conjunto
});

test("dados oficiais de 2022: totais finais conferem com o TSE", () => {
  const dados = carregarDados2022(new URL("../dados-2022/pr-2022.json.gz", import.meta.url));
  const sim = criarSimulador2022(dados, { passos: 3, foco: "30123" });
  let b;
  for (let i = 0; i < 3; i++) b = sim.proximo();
  const gov = parseCargo(b.governador);
  assert.deepEqual([gov.candidatos[0].nome, gov.candidatos[0].votos, gov.candidatos[0].eleito], ["CARLOS MASSA RATINHO JUNIOR", 4243292, true]);
  const br = parseCargo(b.presBr);
  assert.deepEqual([br.candidatos[0].nome, br.candidatos[0].votos, br.candidatos[0].situacao, br.candidatos[0].eleito], ["LULA", 57259504, "2º turno", false]);
  assert.equal(br.validos, 118229719);
  assert.equal(parseCargo(b.senador).candidatos[0].votos, 1953188);
  const est = parseCargo(b.estadual);
  assert.equal(est.candidatos.length, 860);
  assert.equal(est.validos, 6058064);
  assert.equal(est.secoesPct, 100);
  assert.equal(est.candidatos.find((c) => c.n === "30123").votos, 27256);
  assert.equal(est.candidatos.filter((c) => c.partido === "NOVO").length, 15);
  const m = sim.municipios(null, 1);
  assert.equal(m.total, 399);
  assert.equal(m.lista.reduce((a, x) => a + x.votos, 0), 27256);
});
