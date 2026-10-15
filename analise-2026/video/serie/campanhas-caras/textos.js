// Não eleitos (suplentes e não eleitos) com maior despesa declarada até 04/10 (parcial), estadual e federal PR 2026.
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
const F = "TSE · despesas declaradas até 04/10 (parcial)";
window.CFG = { cta: "Comenta: qual candidato você<br>quer ver aqui?", cenas: [
  { tipo: "abertura", rotulo: "Eleição 2026 · Paraná", titulo: ["Gastou muito", "e *não* *levou.*"] },
  { tipo: "barras", titulo: ["Assembleia: as mais", "*caras* sem vaga"], formato: "reais", itens: [
    { nome: "Natan Sperafico", detalhe: "PP · 37.679 votos · suplente", v: 962115 }, { nome: "Dr. Leônidas", detalhe: "PP · 40.899 votos · suplente", v: 880433 },
    { nome: "Evandro Lazarotto", detalhe: "Republicanos · 38.441 votos · suplente", v: 856060 }], fonte: F },
  { tipo: "destaque", titulo: ["*Natan* *Sperafico*", "(PP)"], grande: "R$ 962 mil", tam: 170, sub: `em despesas e 37.679 votos.<br>Ficou como ${B("suplente")}.`, fonte: F },
  { tipo: "barras", titulo: ["Câmara: as mais", "*caras* sem vaga"], formato: "reais", itens: [
    { nome: "Aline Sleutjes", detalhe: "PL · 44.135 votos · suplente", v: 2446127 }, { nome: "Alexandre Leprevost", detalhe: "Republicanos · 14.335 votos · suplente", v: 2366344 },
    { nome: "Beto Richa", detalhe: "PSDB · 58.946 votos · não eleito", v: 2361710 }], fonte: F },
  { tipo: "destaque", titulo: ["*Aline* *Sleutjes*", "(PL)"], grande: "R$ 2,45 mi", tam: 170, sub: `em despesas e 44.135 votos.<br>Ficou como ${B("suplente")}.`, fonte: F },
  { tipo: "destaque", titulo: ["O voto mais", "*caro.*"], grande: "R$ 325", tam: 200, sub: `por voto: ${B("Marisa Lobo (União)")}, candidata a federal,<br>com R$ 724.899 em despesas e 2.227 votos.`, fonte: "entre candidatos com mais de mil votos · " + F },
  { tipo: "destaque", titulo: ["Dinheiro não", "*garante* voto."], grande: "", tam: 10, sub: `O que faz diferença é saber ${B("onde está")}<br>${B("o seu eleitor")}, cidade por cidade.` },
]};
