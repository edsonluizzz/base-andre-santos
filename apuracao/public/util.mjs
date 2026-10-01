const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const fmtInt = (n) => inteiro.format(Math.round(n ?? 0));

export const fmtPct = (n, casas = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtHora = (ms) => (ms ? new Date(ms).toLocaleTimeString("pt-BR") : "--:--:--");

export const fmtDelta = (d) => (d > 0 ? `▲ +${fmtInt(d)}` : d < 0 ? `▼ ${fmtInt(d)}` : "");

// Primeiras `limite` linhas; se o candidato fixo ficou de fora, ocupa a última.
export function selecionarChapa(candidatos, limite, fixo) {
  const topo = candidatos.slice(0, limite);
  if (!fixo || topo.some((c) => c.n === fixo)) return topo;
  const alvo = candidatos.find((c) => c.n === fixo);
  return alvo ? [...topo.slice(0, limite - 1), alvo] : topo;
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
