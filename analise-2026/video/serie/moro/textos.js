// Textos das cenas: Sergio Moro, governador PR 2026 (dados TSE; custo = receita ÷ votos, contas parciais).
window.CFG = {
  s1: { rotulo: "Eleição 2026 · Paraná", titulo: ["Governador no", "*primeiro* *turno.*"] },
  s2: { nome: "Sergio Moro", cargo: "PL · GOVERNADOR", sub: "votos. <b style='color:var(--texto)'>50,11%</b> dos válidos:<br>eleito no primeiro turno." },
  s3: { titulo: ["Passou da metade", "por *6.774* *votos.*"],
        barras: [{ nome: "Sergio Moro", detalhe: "eleito", v: 3127911 }, { nome: "Metade dos válidos", detalhe: "o mínimo para levar no 1º turno", v: 3121137 }, { nome: "Sandro Alex", detalhe: "PSD · 2º colocado", v: 1583764 }],
        fonte: "TSE · votos válidos<br>para governador" },
  s4: { titulo: ["Voto em todas as", "*399* *cidades.*"], card1: { n: "17%", t: "em Curitiba" }, card2: { n: "83%", t: "no resto do estado" } },
  s5: { titulo: ["Mais votado em", "*287* *cidades.*"], sub: "<b style='color:var(--texto)'>Sete em cada dez</b> cidades do Paraná." },
  s6: { titulo: ["Quase o *dobro*", "do 2º colocado."], grande: "+1,5 mi", sub: "<b style='color:var(--texto)'>1.544.147 votos</b> à frente<br>de Sandro Alex (PSD)." },
  s7: { titulo: ["O voto mais", "*barato* dos três", "primeiros."], grande: "R$ 4,15", sub: "por voto. Sandro Alex: <b style='color:var(--texto)'>R$ 5,40</b><br>Requião Filho: <b style='color:var(--texto)'>R$ 7,54</b>" },
};
