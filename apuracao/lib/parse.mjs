// Converte um arquivo de resultado do TSE (um cargo, uma abrangência) num bloco enxuto.
// No TSE todo número vem como texto e percentual usa vírgula.

export function num(s) {
  const n = Number(s ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function pct(s) {
  const n = Number(String(s ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function parseCargo(json) {
  const cargo = json?.carg?.[0];
  if (!cargo || !Array.isArray(cargo.agr)) throw new Error("arquivo do TSE sem cargo");

  const candidatos = [];
  const partidos = [];
  for (const agr of cargo.agr) {
    for (const par of agr.par ?? []) {
      const nominais = num(par.tvtn);
      const legenda = num(par.tvtl);
      partidos.push({ sg: par.sg, nominais, legenda, total: nominais + legenda });
      for (const c of par.cand ?? []) {
        const situacao = c.st ?? "";
        candidatos.push({
          n: c.n,
          nome: c.nmu,
          partido: par.sg,
          votos: num(c.vap),
          pct: pct(c.pvap),
          situacao,
          // "e":"s" também marca quem vai ao 2º turno; isso não é eleito.
          eleito: c.e === "s" && !/turno/i.test(situacao),
        });
      }
    }
  }
  candidatos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    tseGeradoEm: `${json.dg ?? ""} ${json.hg ?? ""}`.trim(),
    secoesPct: pct(json.s?.pst),
    comparecimentoPct: pct(json.e?.pc),
    validos: num(json.v?.vv),
    vagas: num(cargo.nv),
    qeOficial: num(cargo.qe),
    candidatos,
    partidos,
  };
}
