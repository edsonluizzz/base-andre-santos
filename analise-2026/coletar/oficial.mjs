// Resultado oficial de Deputado Estadual (arquivo pr-c0007-e006259-u.json do TSE).
const num = (s) => {
  const v = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export function parseOficial(json) {
  const cargo = json?.carg?.[0];
  if (!cargo) throw new Error("Resultado oficial sem cargo (carg[0])");
  const agremiacoes = [];
  const candidatos = [];
  for (const agr of cargo.agr ?? []) {
    const federacao = agr.tp === "f";
    const siglas = agr.par.map((p) => p.sg);
    agremiacoes.push({
      nm: agr.nm,
      rotulo: federacao ? agr.com : siglas[0],
      federacao,
      siglas,
      vagas: num(agr.vag),
      nominais: agr.par.reduce((s, p) => s + num(p.tvtn), 0),
      legenda: agr.par.reduce((s, p) => s + num(p.tvtl), 0),
    });
    for (const par of agr.par) {
      for (const c of par.cand ?? []) {
        candidatos.push({
          n: c.n, sq: c.sqcand, nm: c.nmu, sg: par.sg, fed: federacao ? agr.nm : null,
          st: c.st, eleito: c.e === "s", valido: c.dvt === "Válido", votos: num(c.vap),
        });
      }
    }
  }
  candidatos.sort((a, b) => b.votos - a.votos);
  return {
    geradoEm: `${json.dg} ${json.hg}`,
    cargo: {
      vagas: num(cargo.nv), qe: num(cargo.qe), validos: num(json.v?.vv), nominais: num(json.v?.vnom),
      legenda: num(json.v?.vl), brancos: num(json.v?.vb), nulos: num(json.v?.tvn),
    },
    agremiacoes,
    candidatos,
  };
}

export function parseMunicipiosCfg(cfg) {
  const pr = (cfg?.abr ?? []).find((a) => a.cd.toLowerCase() === "pr");
  if (!pr) throw new Error("UF PR não encontrada na lista de municípios do TSE");
  return pr.mu.map((m) => ({ cd: m.cd, ibge: m.cdi, nm: m.nm }));
}
