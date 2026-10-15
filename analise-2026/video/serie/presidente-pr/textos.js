// Presidente 2026, 1º turno, no Paraná: votação por cidade (seções do TSE somadas por município; batem com o oficial).
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
window.CFG = { cta: "Comenta: qual cidade você<br>quer ver em detalhe?", cenas: [
  { tipo: "abertura", rotulo: "Presidente · 1º turno · PR", titulo: ["Como o Paraná", "votou para", "*presidente?*"] },
  { tipo: "barras", titulo: ["O resultado", "no *Paraná.*"], top: 520, itens: [
    { nome: "Flávio Bolsonaro", detalhe: "PL · 59,9% dos válidos", v: 3945345 }, { nome: "Lula", detalhe: "PT · 31,2%", v: 2054597 },
    { nome: "Augusto Cury", detalhe: "Avante · 3,1%", v: 205095 }, { nome: "Renan Santos", detalhe: "Missão · 2,7%", v: 177434 },
    { nome: "Ronaldo Caiado", detalhe: "PSD · 2,6%", v: 171294 }], fonte: "TSE · votos no 1º turno, 4 de outubro" },
  { tipo: "mapa", mapa: "vencedor", titulo: ["*350* de 399", "cidades."], legenda: [{ nome: "Flávio", cor: "rgb(47,111,255)", n: 350 }, { nome: "Lula", cor: "rgb(229,49,47)", n: 49 }],
    sub: "Quanto mais forte a cor, maior a vantagem." },
  { tipo: "barras", titulo: ["Venceu em todas", "as *grandes.*"], top: 520, formato: "pct", itens: [
    { nome: "Londrina", detalhe: "Lula 24,2%", v: 65.1 }, { nome: "Cascavel", detalhe: "Lula 27,1%", v: 64.3 }, { nome: "Maringá", detalhe: "Lula 26,8%", v: 63.1 },
    { nome: "Ponta Grossa", detalhe: "Lula 28,3%", v: 59.4 }, { nome: "Curitiba", detalhe: "Lula 30,4% · +296 mil votos de vantagem", v: 57.5 }], fonte: "% dos válidos para Flávio Bolsonaro" },
  { tipo: "lista", titulo: ["Onde foi", "mais *forte.*"], top: 620, itens: [
    { nome: "Quatro Pontes", detalhe: "Oeste", valor: "83,4%" }, { nome: "Nova Santa Rosa", detalhe: "Oeste", valor: "82,6%" },
    { nome: "Mercedes", detalhe: "Oeste", valor: "80,8%" }, { nome: "Maripá", detalhe: "Oeste", valor: "79,9%" },
    { nome: "Pato Bragado", detalhe: "Oeste", valor: "77,6%" }, { nome: "Céu Azul", detalhe: "Oeste", valor: "75,1%" }], fonte: "% dos válidos para Flávio Bolsonaro" },
  { tipo: "mapa", mapa: "lula", titulo: ["Lula venceu", "em *49* cidades."], sub: `Todas pequenas: juntas, ${B("3,4% dos votos")}<br>válidos do estado. A maior é Itaperuçu.` },
  { tipo: "destaque", titulo: ["Decidido por", "*4* *votos.*"], grande: "1.876 × 1.872", tam: 150,
    sub: `Lula × Flávio em ${B("Boa Ventura de São Roque")}.<br>Em ${B("Cerro Azul")}, a mesma diferença: 4.665 × 4.661.`, fonte: "as duas cidades mais apertadas do estado" },
]};
