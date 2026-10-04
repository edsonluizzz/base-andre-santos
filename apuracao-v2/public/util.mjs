const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const fmtInt = (n) => inteiro.format(Math.round(n ?? 0));

export const fmtPct = (n, casas = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtHora = (ms) => (ms ? new Date(ms).toLocaleTimeString("pt-BR") : "--:--:--");

// Antes do primeiro voto todos empatam em 1º; mostrar posição seria enganoso.
export const fmtPos = (pos, votos) => (votos > 0 ? `${pos}º` : "–");

// A página perdeu o servidor: o último estado é mais velho que 2,5 intervalos de busca.
export const semContato = (estado, agora) =>
  !!estado && agora - estado.geradoEm > 2.5 * (estado.proximaBuscaEm - estado.geradoEm);

export const fmtDelta = (d) => (d > 0 ? `▲ +${fmtInt(d)}` : d < 0 ? `▼ ${fmtInt(d)}` : "");

// Primeiras `limite` linhas; se o candidato fixo ficou de fora, ocupa a última.
export function selecionarChapa(candidatos, limite, fixo) {
  const topo = candidatos.slice(0, limite);
  if (!fixo || topo.some((c) => c.n === fixo)) return topo;
  const alvo = candidatos.find((c) => c.n === fixo);
  return alvo ? [...topo.slice(0, limite - 1), alvo] : topo;
}

// Polígono da área sob a linha: desce até a base no primeiro e no último ponto.
export function areaSparkline(pontos, altura) {
  if (!pontos) return "";
  const lista = pontos.split(" ");
  const x = (p) => p.split(",")[0];
  return `${x(lista[0])},${altura} ${pontos} ${x(lista.at(-1))},${altura}`;
}

// Selo de situação do TSE em texto curto e legível de longe.
export function seloSituacao(situacao, eleito) {
  const s = (situacao ?? "").toLowerCase();
  if (s.includes("qp")) return "ELEITO QP";
  if (s.includes("média")) return "ELEITO MÉDIA";
  if (eleito || s === "eleito") return "ELEITO";
  if (s.includes("suplente")) return "SUPLENTE";
  if (s.includes("turno")) return "2º TURNO";
  return "";
}

// Primeiras `limite` linhas, mas quem foi eleito e o candidato fixo sempre aparecem,
// ocupando o lugar das últimas linhas comuns. O fixo tem prioridade sobre eleitos.
export function selecionarLinhas(candidatos, limite, fixo) {
  const obrigatorio = (c) => c.eleito || c.n === fixo;
  const topo = candidatos.slice(0, limite);
  const faltam = candidatos
    .filter((c) => obrigatorio(c) && !topo.includes(c))
    .sort((a, b) => (b.n === fixo) - (a.n === fixo));
  for (const c of faltam) {
    let i = topo.length - 1;
    while (i >= 0 && obrigatorio(topo[i])) i--;
    if (i < 0 && c.n === fixo) {
      i = topo.length - 1;
      while (i >= 0 && topo[i].n === fixo) i--;
    }
    if (i < 0) continue;
    topo.splice(i, 1);
    topo.push(c);
  }
  const ordem = new Map(candidatos.map((c, i) => [c, i]));
  return topo.sort((a, b) => ordem.get(a) - ordem.get(b));
}

// Selo de projeção (não oficial): o TSE ainda não declarou os eleitos do cargo.
export function seloProjecao(via) {
  return { QP: "PROJ. QP", "MÉDIA": "PROJ. MÉDIA", ELEITO: "PROJ. ELEITO", "2º TURNO": "PROJ. 2º T" }[via] ?? "";
}

export function pontosSparkline(historico, largura, altura) {
  if (historico.length < 2) return "";
  const t0 = historico[0].t;
  const dt = Math.max(1, historico.at(-1).t - t0);
  const max = Math.max(1, ...historico.map((p) => p.votos));
  return historico
    .map((p) => `${(((p.t - t0) / dt) * largura).toFixed(1)},${(altura - (p.votos / max) * altura).toFixed(1)}`)
    .join(" ");
}
