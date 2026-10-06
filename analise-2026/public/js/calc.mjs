export const rsPorVoto = (valor, votos) => (valor == null || !votos ? null : valor / votos);

// Menor nº de áreas (municípios ou locais) que somam 50% e 80% dos votos.
export function concentracao(valores) {
  const v = valores.filter((x) => x > 0).sort((a, b) => b - a);
  const total = v.reduce((s, x) => s + x, 0);
  let acc = 0, p50 = 0, p80 = 0;
  for (let k = 0; k < v.length && !p80; k++) {
    acc += v[k];
    if (!p50 && acc >= total * 0.5) p50 = k + 1;
    if (acc >= total * 0.8) p80 = k + 1;
  }
  return { p50, p80, total, n: v.length };
}

export function sobreposicao(a, b) {
  let areas = 0, va = 0, vb = 0, ta = 0, tb = 0;
  for (const v of a.values()) ta += v;
  for (const v of b.values()) tb += v;
  for (const [k, x] of a) {
    const y = b.get(k) ?? 0;
    if (x > 0 && y > 0) { areas++; va += x; vb += y; }
  }
  return { areas, fracA: ta ? va / ta : 0, fracB: tb ? vb / tb : 0 };
}

export function pearson(a, b) {
  const ks = [...new Set([...a.keys(), ...b.keys()])];
  if (ks.length < 3) return null;
  const xs = ks.map((k) => a.get(k) ?? 0);
  const ys = ks.map((k) => b.get(k) ?? 0);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function diferenca(x, y) {
  const ks = [...new Set([...x.keys(), ...y.keys()])];
  return ks.map((k) => {
    const a = x.get(k) ?? 0, b = y.get(k) ?? 0;
    return { k, x: a, y: b, d: a - b };
  }).sort((p, q) => q.d - p.d);
}

// Para cada área, quem teve mais votos entre as séries; empate no topo → n = null.
export function vencedor(series) {
  const chaves = new Set(series.flatMap((s) => [...s.mapa.keys()]));
  const out = new Map();
  for (const k of chaves) {
    let melhor = null, v1 = 0, v2 = 0;
    for (const s of series) {
      const v = s.mapa.get(k) ?? 0;
      if (v > v1) { v2 = v1; v1 = v; melhor = s.n; } else if (v > v2) v2 = v;
    }
    if (v1 > 0) out.set(k, { n: v1 === v2 ? null : melhor, v: v1, margem: v1 - v2 });
  }
  return out;
}

// Quantil por posição (sem interpolação); usado para a escala de cor não ser achatada por um extremo.
export function quantil(valores, q) {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(q * (v.length - 1)))];
}

// Ajuste ln(y) = a + b·ln(x): b é a elasticidade (quanto % de voto a mais por % de receita a mais).
export function regressaoLog(pontos) {
  const p = pontos.filter((q) => q.x > 0 && q.y > 0).map((q) => [Math.log(q.x), Math.log(q.y)]);
  if (p.length < 3) return null;
  const mx = p.reduce((s, [x]) => s + x, 0) / p.length;
  const my = p.reduce((s, [, y]) => s + y, 0) / p.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (!sxx || !syy) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b, r2: (sxy * sxy) / (sxx * syy), n: p.length };
}

export const projetar = (votos0, receita0, receita1, b) => votos0 * Math.pow(receita1 / receita0, b);

// Afinidade geográfica entre André e outro candidato, sobre todos os locais (zeros incluídos):
// r = correlação dos % por local; lift = % médio do candidato nos locais do André (pesado pelos votos
// do André) ÷ % dele no estado.
export function afinidade(ids, andre, totAndre, x, totX) {
  const pa = [], px = [];
  let somaA = 0, pesoX = 0, votosX = 0, totalX = 0;
  for (const id of ids) {
    const ta = totAndre.get(id) ?? 0, tx = totX.get(id) ?? 0;
    if (!ta || !tx) continue;
    const a = andre.get(id) ?? 0, v = x.get(id) ?? 0;
    pa.push(a / ta); px.push(v / tx);
    somaA += a; pesoX += a * (v / tx); votosX += v; totalX += tx;
  }
  const mediaA = pa.reduce((s, v) => s + v, 0) / pa.length;
  const mediaX = px.reduce((s, v) => s + v, 0) / px.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < pa.length; i++) {
    const da = pa[i] - mediaA, dx = px[i] - mediaX;
    sxy += da * dx; sxx += da * da; syy += dx * dx;
  }
  const estado = totalX ? votosX / totalX : 0;
  return {
    r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : null,
    lift: somaA && estado ? pesoX / somaA / estado : 0,
  };
}
