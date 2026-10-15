// Renovação na ALEP (deputado estadual PR 2026 × eleitos de 2022, casando nome de urna; Prof. Lemos e Adão Litro mudaram o nome).
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
window.CFG = { cenas: [
  { tipo: "abertura", rotulo: "ALEP · Eleição 2026", titulo: ["Quanto a Assembleia", "*mudou?*"] },
  { tipo: "contador", titulo: ["Caras *novas*"], valor: 24, sub: `dos 54 deputados estaduais eleitos não<br>estavam entre os eleitos de 2022. ${B("Renovação de 44%.")}` },
  { tipo: "hemiciclo", titulo: ["*30* voltaram,", "*24* chegaram."], grupos: [{ nome: "Reeleitos", n: 30, cor: "#4a5570" }, { nome: "Novos", n: 24, cor: "#ff6a13" }] },
  { tipo: "barras", titulo: ["*38* tentaram", "se reeleger."], itens: [{ nome: "Tentaram voltar", detalhe: "dos 54 eleitos em 2022", v: 38 }, { nome: "Conseguiram", detalhe: "reeleitos", v: 30 }, { nome: "Ficaram de fora", detalhe: "5 deles do PSD", v: 8 }], fonte: "TSE · eleitos de 2022 e 2026" },
  { tipo: "lista", titulo: ["Quem ficou", "de *fora*."], top: 560, itens: [
    { nome: "Secretária Márcia", detalhe: "PSD", valor: "45.833" }, { nome: "Cantora Mara Lima", detalhe: "Republicanos", valor: "41.133" },
    { nome: "Marli Paulino", detalhe: "PSD", valor: "36.893" }, { nome: "Tercilio Turini", detalhe: "MDB", valor: "32.596" },
    { nome: "Luis Corti", detalhe: "PSD", valor: "31.986" }, { nome: "Evandro Araujo", detalhe: "PSD", valor: "30.447" },
    { nome: "Samuel Dantas", detalhe: "PL", valor: "28.505" }, { nome: "Fabio Oliveira", detalhe: "NOVO", valor: "22.365" }], fonte: "votos em 2026" },
  { tipo: "lista", titulo: ["Rumo a", "*Brasília.*"], top: 640, itens: [
    { nome: "Ana Júlia", detalhe: "PT · eleita deputada federal", valor: "✓" }, { nome: "Renato Freitas", detalhe: "PT · eleito deputado federal", valor: "✓" },
    { nome: "Arilson Chiorato", detalhe: "PT · eleito deputado federal", valor: "✓" }, { nome: "Ricardo Arruda", detalhe: "PL · eleito deputado federal", valor: "✓" }],
    fonte: "12 deputados eleitos em 2022 disputaram outro cargo em 2026" },
  { tipo: "destaque", titulo: ["O novato", "*mais* *votado.*"], grande: "192.409", tam: 200, sub: `votos de ${B("Paulo Melo (PL)")}, que não estava entre<br>os eleitos de 2022 e chega como o mais votado.` },
]};
