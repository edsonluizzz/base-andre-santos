import { regiaoDe } from "./regioes.mjs";

const centavos = (v) => Math.round(v * 100) / 100;
const casas5 = (v) => (v == null ? null : Math.round(v * 1e5) / 1e5);

function esparso(mapa, indice, oQue) {
  const out = [];
  for (const [k, v] of mapa) {
    if (!(v > 0)) continue;
    const i = indice.get(k);
    if (i === undefined) throw new Error(`${oQue} ${k} da votação não está na lista do TSE`);
    out.push([i, v]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

export function montarDados({ oficial, municipios, agregado, locais, contas, focoLocal, meta }) {
  const { votosMun, votosLocal, totalLocal, validosMun } = agregado;
  const idxMun = new Map(municipios.map((m, i) => [m.cd, i]));
  // Votos em município fora da lista abortam, mesmo de candidato fora do foco.
  for (const porMun of votosMun.values()) {
    for (const cd of porMun.keys()) if (!idxMun.has(cd)) throw new Error(`Município ${cd} da votação não está na lista do TSE`);
  }
  const municipiosOut = municipios.map((m) => ({ cd: m.cd, ibge: m.ibge, nm: m.nm, regiao: regiaoDe(m.nm), validos: validosMun.get(m.cd) ?? 0 }));

  const ids = [...totalLocal.keys()].sort();
  const idxLoc = new Map(ids.map((id, j) => [id, j]));
  const locaisOut = ids.map((id) => {
    const cd = id.split("-")[0];
    if (!idxMun.has(cd)) throw new Error(`Município ${cd} da votação não está na lista do TSE`);
    const info = locais.get(id);
    return {
      id, mun: idxMun.get(cd), nm: info?.nm ?? `Local ${id}`, bairro: info?.bairro ?? null,
      lat: casas5(info?.lat ?? null), lon: casas5(info?.lon ?? null), aptos: info?.aptos ?? 0, total: totalLocal.get(id),
    };
  });

  const candidatos = oficial.candidatos.map((c) => {
    const r = contas.receitas.get(c.sq);
    const d = contas.despesas.get(c.sq);
    return {
      n: c.n, sq: c.sq, nm: c.nm, sg: c.sg, fed: c.fed, st: c.st, eleito: c.eleito, votos: c.votos,
      receita: r ? centavos(r.total) : null,
      despesa: d != null ? centavos(d) : null,
      receitaPorOrigem: r ? Object.fromEntries(Object.entries(r.porOrigem).map(([k, v]) => [k, centavos(v)])) : null,
      mun: esparso(votosMun.get(c.n) ?? new Map(), idxMun, "Município"),
      loc: focoLocal.has(c.n) ? esparso(votosLocal.get(c.n) ?? new Map(), idxLoc, "Local") : null,
    };
  });

  return { meta, cargo: oficial.cargo, agremiacoes: oficial.agremiacoes, municipios: municipiosOut, locais: locaisOut, candidatos };
}
