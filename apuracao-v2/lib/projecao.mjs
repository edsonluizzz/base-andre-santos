// Projeção de eleitos com os votos apurados até agora. Não é resultado oficial:
// o TSE declara os eleitos ao fim da totalização.
//
// Proporcional (Código Eleitoral, arts. 106 a 109, com a Lei 14.211/2021 e a decisão do STF de 2024):
//  1. quociente eleitoral (QE) = válidos ÷ vagas;
//  2. cada partido/federação elege floor(votos ÷ QE) candidatos que tenham ao menos 10% do QE;
//  3. sobras por maior média (votos ÷ (cadeiras + 1)), só entre quem tem 80% do QE
//     e candidato com 20% do QE;
//  4. o que ainda sobrar vai por maior média entre todos os partidos, sem as exigências.
// Federação conta como um partido só (`entidade`).

import { calcularQuociente } from "./quociente.mjs";

export function projetarProporcional({ candidatos, partidos, validos, vagas, qeOficial = 0 }) {
  const { quociente: qe } = calcularQuociente({ validos, vagas, qeOficial });
  if (!(qe > 0)) return [];

  const entidades = new Map();
  const ent = (id) => {
    if (!entidades.has(id)) entidades.set(id, { votos: 0, fila: [], cadeiras: 0 });
    return entidades.get(id);
  };
  for (const p of partidos) ent(p.entidade ?? p.sg).votos += p.total;
  for (const c of candidatos) if (c.valido !== false && c.votos > 0) ent(c.entidade ?? c.partido).fila.push(c);
  for (const e of entidades.values()) e.fila.sort((a, b) => b.votos - a.votos);

  const eleitos = [];
  const eleger = (e, c, via) => {
    e.fila.splice(e.fila.indexOf(c), 1);
    e.cadeiras++;
    eleitos.push({ n: c.n, via });
  };

  // 1ª fase: quociente partidário
  for (const e of entidades.values()) {
    const qp = Math.floor(e.votos / qe);
    for (const c of e.fila.filter((x) => x.votos >= 0.1 * qe).slice(0, qp)) eleger(e, c, "QP");
  }

  const media = (e) => e.votos / (e.cadeiras + 1);
  const proximaMaiorMedia = (podeConcorrer, candidatoDe) => {
    let melhor = null;
    for (const e of entidades.values()) {
      if (!podeConcorrer(e) || !candidatoDe(e)) continue;
      if (!melhor || media(e) > media(melhor) || (media(e) === media(melhor) && e.votos > melhor.votos)) melhor = e;
    }
    return melhor;
  };

  // 2ª fase: sobras com 80% do QE para o partido e 20% do QE para o candidato
  const com20 = (e) => e.fila.find((c) => c.votos >= 0.2 * qe);
  while (eleitos.length < vagas) {
    const e = proximaMaiorMedia((x) => x.votos >= 0.8 * qe, com20);
    if (!e) break;
    eleger(e, com20(e), "MÉDIA");
  }

  // 3ª fase: todos os partidos, por maior média, candidatos por ordem de votos
  while (eleitos.length < vagas) {
    const e = proximaMaiorMedia(() => true, (x) => x.fila[0]);
    if (!e) break;
    eleger(e, e.fila[0], "MÉDIA");
  }
  return eleitos;
}

// Majoritário: com 2º turno (governador, presidente), maioria absoluta dos válidos elege;
// sem ela, os dois primeiros vão ao 2º turno. Sem 2º turno (senador), os mais votados ocupam as vagas.
export function projetarMajoritario({ candidatos, vagas, validos, segundoTurno }) {
  const ordenados = candidatos.filter((c) => c.votos > 0).sort((a, b) => b.votos - a.votos);
  if (!(validos > 0) || !ordenados.length) return [];
  if (!segundoTurno) return ordenados.slice(0, vagas).map((c) => ({ n: c.n, via: "ELEITO" }));
  if (ordenados[0].votos * 2 > validos) return [{ n: ordenados[0].n, via: "ELEITO" }];
  return ordenados.slice(0, 2).map((c) => ({ n: c.n, via: "2º TURNO" }));
}
