// PL × PT no Brasil, 2022 × 2026: deputados federais e estaduais (distritais no DF) eleitos; base oficial do TSE nas 27 UFs.
const B = (s) => `<b style="color:var(--texto)">${s}</b>`;
const AZUL = "rgb(47,111,255)", VERM = "rgb(229,49,47)";
window.CFG = { cta: "Comenta: qual partido você<br>quer ver em detalhe?", cenas: [
  { tipo: "abertura", rotulo: "Brasil · 2022 × 2026", titulo: ["PL × PT:", "quem *cresceu?*"] },
  { tipo: "pares", titulo: ["Câmara dos", "*Deputados.*"], itens: [{ nome: "PL", antes: 98, depois: 121, cor: AZUL }, { nome: "PT", antes: 69, depois: 70, cor: VERM }],
    saldo: [{ v: "+23", nome: "PL", cor: AZUL }, { v: "+1", nome: "PT", cor: VERM }], fonte: "deputados federais eleitos · cinza: 2022 · cor: 2026" },
  { tipo: "pares", titulo: ["Assembleias", "*estaduais.*"], itens: [{ nome: "PL", antes: 126, depois: 212, cor: AZUL }, { nome: "PT", antes: 117, depois: 141, cor: VERM }],
    saldo: [{ v: "+86", nome: "PL", cor: AZUL }, { v: "+24", nome: "PT", cor: VERM }], fonte: "deputados estaduais e distritais eleitos · cinza: 2022 · cor: 2026" },
  { tipo: "destaque", titulo: ["*+7,7* *milhões*", "de votos."], grande: "25,2 mi", tam: 230,
    sub: `votos do ${B("PL")} para deputado federal,<br>contra 17,5 milhões em 2022.<br>O ${B("PT")} foi de 12,0 para 13,8 milhões.`, fonte: "votos nominais para deputado federal" },
  { tipo: "mapa", mapa: "e2022", titulo: ["*2022:* quem elegeu", "mais estaduais?"], legenda: [{ nome: "PL", cor: AZUL, n: 14 }, { nome: "PT", cor: VERM, n: 8 }, { nome: "empate", cor: "#4a5570", n: 5 }] },
  { tipo: "mapa", mapa: "e2026", titulo: ["*2026:* quem elegeu", "mais estaduais?"], legenda: [{ nome: "PL", cor: AZUL, n: 21 }, { nome: "PT", cor: VERM, n: 5 }, { nome: "empate", cor: "#4a5570", n: 1 }],
    sub: `O PT segue na frente na ${B("Bahia, Ceará, Piauí, Pernambuco e Alagoas")}.` },
  { tipo: "lista", titulo: ["Os maiores", "*saltos.*"], top: 560, itens: [
    { nome: "Minas Gerais · PL", detalhe: "deputados estaduais", valor: "9 → 21" }, { nome: "Minas Gerais · PL", detalhe: "deputados federais", valor: "11 → 21" },
    { nome: "Paraná · PL", detalhe: "deputados estaduais", valor: "5 → 14" }, { nome: "Mato Grosso do Sul · PL", detalhe: "deputados estaduais", valor: "2 → 9" },
    { nome: "Rio Grande do Sul · PL", detalhe: "deputados estaduais", valor: "5 → 12" }, { nome: "Bahia · PT", detalhe: "deputados estaduais", valor: "9 → 14" }],
    fonte: "eleitos em 2022 → 2026" },
]};
