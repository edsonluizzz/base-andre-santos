// Regiões usadas na análise. RMC = lei estadual (29 municípios, Curitiba à parte); Litoral = 7 municípios.
export const REGIOES = ["Curitiba", "RMC", "Litoral", "Interior"];

export const RMC = [
  "ADRIANOPOLIS", "AGUDOS DO SUL", "ALMIRANTE TAMANDARE", "ARAUCARIA", "BALSA NOVA", "BOCAIUVA DO SUL",
  "CAMPINA GRANDE DO SUL", "CAMPO DO TENENTE", "CAMPO LARGO", "CAMPO MAGRO", "CERRO AZUL", "COLOMBO",
  "CONTENDA", "DOUTOR ULYSSES", "FAZENDA RIO GRANDE", "ITAPERUCU", "LAPA", "MANDIRITUBA", "PIEN",
  "PINHAIS", "PIRAQUARA", "QUATRO BARRAS", "QUITANDINHA", "RIO BRANCO DO SUL", "RIO NEGRO",
  "SAO JOSE DOS PINHAIS", "TIJUCAS DO SUL", "TUNAS DO PARANA",
];
export const LITORAL = ["ANTONINA", "GUARAQUECABA", "GUARATUBA", "MATINHOS", "MORRETES", "PARANAGUA", "PONTAL DO PARANA"];

const normal = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

export function regiaoDe(nome) {
  const n = normal(nome);
  if (n === "CURITIBA") return "Curitiba";
  if (RMC.includes(n)) return "RMC";
  if (LITORAL.includes(n)) return "Litoral";
  return "Interior";
}

export function conferirRegioes(nomes) {
  const existentes = new Set(nomes.map(normal));
  return [...RMC, ...LITORAL, "CURITIBA"].filter((n) => !existentes.has(n));
}
