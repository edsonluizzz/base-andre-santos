// Composição da ALEP 2026 por agremiação (federações somadas: PT+PV+PCdoB; PP+União). Comparação com as cadeiras de 2022.
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
window.CFG = { cenas: [
  { tipo: "abertura", rotulo: "ALEP · Eleição 2026", titulo: ["Como fica a", "*nova* Assembleia?"] },
  { tipo: "hemiciclo", titulo: ["*54* cadeiras,", "*9* bancadas."], grupos: [
    { nome: "PT/PV/PCdoB", n: 8, cor: "#d7262e" }, { nome: "PDT", n: 1, cor: "#e8833a" }, { nome: "MDB", n: 2, cor: "#8bc34a" },
    { nome: "PSD", n: 14, cor: "#f5b323" }, { nome: "PODE", n: 3, cor: "#13a06a" }, { nome: "Republicanos", n: 3, cor: "#5cc8ff" },
    { nome: "PP/União", n: 6, cor: "#22a6b3" }, { nome: "NOVO", n: 3, cor: "#ff6a13" }, { nome: "PL", n: 14, cor: "#2f5fe0" }] },
  { tipo: "pares", titulo: ["O que *mudou*", "desde 2022."], itens: [
    { nome: "PL", antes: 5, depois: 14, cor: "#2f5fe0" }, { nome: "PSD", antes: 16, depois: 14, cor: "#f5b323" },
    { nome: "PT e aliados", antes: 7, depois: 8, cor: "#d7262e" }, { nome: "PP + União", antes: 11, depois: 6, cor: "#22a6b3" },
    { nome: "NOVO", antes: 0, depois: 3, cor: "#ff6a13" }], fonte: "barra cinza: 2022 · colorida: 2026" },
  { tipo: "destaque", titulo: ["O PL quase", "*triplicou.*"], grande: "5 → 14", tam: 190, sub: "cadeiras. Virou a maior bancada,<br>empatado com o PSD." },
  { tipo: "destaque", titulo: ["PL e PSD", "*empatados.*"], grande: "14 × 14", tam: 190, sub: `Juntos, têm ${B("28 das 54")} cadeiras:<br>mais da metade da Casa.` },
  { tipo: "destaque", titulo: ["PP e União", "*encolheram.*"], grande: "11 → 6", tam: 190, sub: "Em 2026 concorreram juntos, numa federação.<br>Em 2022, separados, somavam 11 cadeiras." },
  { tipo: "destaque", titulo: ["O NOVO", "*estreia.*"], grande: "0 → 3", tam: 190, sub: "cadeiras. O partido não tinha eleito<br>deputado estadual no Paraná em 2022." },
]};
