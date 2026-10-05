// dados.json em miniatura, com somas coerentes (mun e loc de cada candidato batem com "votos").
export const dadosMini = () => ({
  meta: { geradoEm: "2026-10-05T00:00:00Z", fontes: { secao: "05/10/2026 09:50:34", locais: "05/10/2026 06:29:34", oficial: "04/10/2026 23:59:59", contas: "04/10/2026 04:05:53" } },
  cargo: { vagas: 54, qe: 100, validos: 1000, nominais: 900, legenda: 100, brancos: 10, nulos: 5 },
  agremiacoes: [{ nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 1, nominais: 190, legenda: 10 }],
  municipios: [
    { cd: "75353", ibge: "4106902", nm: "CURITIBA", regiao: "Curitiba", validos: 600 },
    { cd: "75990", ibge: "4125506", nm: "SÃO JOSÉ DOS PINHAIS", regiao: "RMC", validos: 300 },
    { cd: "77771", ibge: "4118204", nm: "PARANAGUÁ", regiao: "Litoral", validos: 100 },
  ],
  locais: [
    { id: "75353-1-10", mun: 0, nm: "ESCOLA A", bairro: "CENTRO", lat: -25.43, lon: -49.27, aptos: 400, total: 300 },
    { id: "75353-1-20", mun: 0, nm: "ESCOLA B", bairro: "CAJURU", lat: -25.45, lon: -49.2, aptos: 400, total: 200 },
    { id: "75990-5-30", mun: 1, nm: "ESCOLA C", bairro: "CENTRO", lat: null, lon: null, aptos: 300, total: 250 },
    { id: "77771-9-40", mun: 2, nm: "ESCOLA D", bairro: null, lat: -25.5, lon: -48.5, aptos: 100, total: 80 },
  ],
  candidatos: [
    { n: "55555", nm: "OUTRO", sg: "PSD", st: "Eleito por QP", eleito: true, votos: 200, receita: 10, despesa: 1, receitaPorOrigem: { Outros: 10 }, mun: [[0, 200]], loc: null },
    { n: "30123", nm: "ELEITO NOVO", sg: "NOVO", st: "Eleito por QP", eleito: true, votos: 100, receita: 500, despesa: 400, receitaPorOrigem: { FEFC: 500 }, mun: [[0, 60], [1, 40]], loc: [[2, 40], [0, 30], [1, 30]] },
    { n: "30777", nm: "ANDRÉ SANTOS", sg: "NOVO", st: "Suplente", eleito: false, votos: 50, receita: 100, despesa: 80, receitaPorOrigem: { "Pessoas físicas": 100 }, mun: [[0, 30], [2, 20]], loc: [[0, 20], [3, 20], [1, 10]] },
    { n: "30300", nm: "FABIO OLIVEIRA", sg: "NOVO", st: "Suplente", eleito: false, votos: 40, receita: 400, despesa: null, receitaPorOrigem: { FEFC: 400 }, mun: [[0, 40]], loc: [[0, 25], [1, 15]] },
    { n: "10456", nm: "CANTORA MARA LIMA", sg: "REPUBLICANOS", st: "Suplente", eleito: false, votos: 30, receita: null, despesa: null, receitaPorOrigem: null, mun: [[1, 30]], loc: [[2, 30]] },
    { n: "22622", nm: "DIRLETE PINHEIRO", sg: "PL", st: "Suplente", eleito: false, votos: 0, receita: 200, despesa: 10, receitaPorOrigem: { FEFC: 200 }, mun: [], loc: [] },
  ],
});
