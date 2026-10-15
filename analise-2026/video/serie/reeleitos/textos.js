// Reeleitos (eleitos 2022 que se elegeram de novo ao mesmo cargo) e quem mais gastou; despesas declaradas até 04/10 (parciais).
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
const F = "TSE · despesas declaradas até 04/10 (parcial)";
window.CFG = { cenas: [
  { tipo: "abertura", rotulo: "Eleição 2026 · Paraná", titulo: ["Quanto custou", "se *reeleger?*"] },
  { tipo: "contador", titulo: ["Na *Assembleia*"], valor: 30, sub: `deputados estaduais reeleitos,<br>de ${B("38")} que tentaram.` },
  { tipo: "barras", titulo: ["Quem mais *gastou*", "para voltar à ALEP"], formato: "reais", itens: [
    { nome: "Marcio Nunes", detalhe: "PSD · 119.707 votos", v: 1218523 }, { nome: "Hussein Bakri", detalhe: "PSD · 99.700 votos", v: 1016662 },
    { nome: "Ney Leprevost", detalhe: "Republicanos · 53.372 votos", v: 850039 }], fonte: F },
  { tipo: "destaque", titulo: ["*Marcio* *Nunes*", "(PSD)"], grande: "R$ 1,22 mi", tam: 170, sub: `em despesas para a reeleição. Com 119.707<br>votos, saiu a ${B("R$ 10,18 por voto")}.`, fonte: F },
  { tipo: "contador", titulo: ["Na *Câmara*"], valor: 15, sub: `deputados federais do Paraná reeleitos,<br>de ${B("22")} que tentaram.` },
  { tipo: "barras", titulo: ["Quem mais *gastou*", "para voltar a Brasília"], formato: "reais", itens: [
    { nome: "Aliel Machado", detalhe: "PV · 118.691 votos", v: 3224175 }, { nome: "Paulo Litro", detalhe: "União · 88.601 votos", v: 3080617 },
    { nome: "Tião Medeiros", detalhe: "PP · 85.951 votos", v: 2910968 }], fonte: F },
  { tipo: "destaque", titulo: ["*Aliel* *Machado*", "(PV)"], grande: "R$ 3,22 mi", tam: 170, sub: `em despesas para a reeleição. Com 118.691<br>votos, saiu a ${B("R$ 27,16 por voto")}.`, fonte: F },
]};
