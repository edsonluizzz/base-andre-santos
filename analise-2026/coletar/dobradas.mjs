// Votos de federal, senador e governador por local, para medir com quem os votos do André andaram juntos.
import { afinidade } from "../public/js/calc.mjs";
import { idLocal } from "./agregar.mjs";

export const CARGOS_DOBRADA = { 6: "federal", 5: "senador", 3: "governador" };

// nominais: Map cargo → Set dos números de candidatos válidos daquele cargo.
export function criarAgregadorCargos(nominais) {
  const res = new Map([...nominais.keys()].map((c) => [c, { votos: new Map(), total: new Map() }]));
  return {
    adicionar({ cargo, mun, zona, local, votavel, votos }) {
      const r = res.get(cargo);
      if (!r || !nominais.get(cargo).has(votavel)) return;
      const id = idLocal(mun, zona, local);
      r.total.set(id, (r.total.get(id) ?? 0) + votos);
      let m = r.votos.get(votavel);
      if (!m) r.votos.set(votavel, (m = new Map()));
      m.set(id, (m.get(id) ?? 0) + votos);
    },
    resultado: () => res,
  };
}

// Afinidade de cada candidato do cargo com o André; comMapa(linha, posição) decide quem leva a série por local.
export function calcularDobradas({ candidatos, agregado, ids, andre, totAndre, comMapa }) {
  return candidatos
    .map((c) => {
      const x = agregado.votos.get(c.n) ?? new Map();
      const { r, lift } = afinidade(ids, andre, totAndre, x, agregado.total);
      return { n: c.n, nm: c.nm, sg: c.sg, st: c.st, eleito: c.eleito, votos: c.votos, r, lift, x };
    })
    .sort((a, b) => (b.r ?? -2) - (a.r ?? -2))
    .map((l, k) => {
      const { x, ...resto } = l;
      return { ...resto, loc: comMapa(l, k) ? x : null };
    });
}
