// Apoiados do Nikolas Ferreira no PR (informado pelo Edson): Guilherme Kilter (federal) e Paulo Melo (estadual).
// Correlação de Pearson do % dos válidos por cidade (399 cidades); "reduto" = maior % do candidato em uma cidade (mediana dos eleitos).
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
window.CFG = { cenas: [
  { tipo: "abertura", rotulo: "Eleição 2026 · Paraná", titulo: ["Os apoiados do", "*Nikolas* no Paraná."] },
  { tipo: "barras", titulo: ["Os dois", "no *topo.*"], itens: [{ nome: "Guilherme Kilter", detalhe: "NOVO · 2º mais votado para federal", v: 269832 }, { nome: "Paulo Melo", detalhe: "PL · 1º mais votado para estadual", v: 192409 }], fonte: "TSE · votos em 2026" },
  { tipo: "destaque", titulo: ["O *mesmo*", "eleitor."], grande: "0,85", sub: `é a correlação entre os mapas de voto dos dois,<br>cidade a cidade. ${B("Onde um foi forte, o outro também foi.")}`, fonte: "1 = mapas idênticos · 0 = nenhuma relação" },
  { tipo: "barras", titulo: ["O mapa do Kilter", "*parece* *mais* com..."], formato: "corr", itens: [
    { nome: "Paulo Melo", detalhe: "PL · estadual", v: 0.85 }, { nome: "Jeffrey Chiquini", detalhe: "NOVO · federal", v: 0.80 },
    { nome: "Deltan Dallagnol", detalhe: "NOVO · senador", v: 0.52 }, { nome: "Sergio Moro", detalhe: "PL · governador", v: 0.48 }], fonte: "correlação do % dos votos válidos por cidade" },
  { tipo: "destaque", titulo: ["Paulo Melo", "*sem* *reduto.*"], grande: "6,5%", sub: `foi a maior fatia dele em uma cidade.<br>Um estadual eleito costuma chegar a ${B("26%")} no seu reduto.` },
  { tipo: "destaque", titulo: ["Kilter", "*sem* *reduto.*"], grande: "9,2%", sub: `foi a maior fatia dele em uma cidade.<br>Um federal eleito costuma chegar a ${B("33%")}.` },
  { tipo: "destaque", titulo: ["Não é reduto.", "É *opinião.*"], grande: "", tam: 10, sub: `Voto espalhado pelo estado, sem base regional:<br>${B("o desenho típico de quem chega pelo apoio e pelas redes.")}` },
]};
