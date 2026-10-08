// Configuração compartilhada pela coleta (Node) e pela página.
// Cargos disponíveis: código do TSE, dígitos do número do candidato e arquivo do resultado oficial.
export const CARGOS = {
  estadual: { nome: "Deputado Estadual", curto: "Estadual", cd: "7", digitos: 5, oficial: "c0007" },
  federal: { nome: "Deputado Federal", curto: "Federal", cd: "6", digitos: 4, oficial: "c0006" },
};
export const CARGO_PADRAO = "estadual";
export const UF = { sigla: "PR", nome: "Paraná" };
// Até quantos candidatos entram na comparação (um por cor).
export const MAX_COMPARADOS = 3;
// Cor do candidato principal e dos comparados, na ordem.
export const CORES_SERIE = ["--laranja", "--azul", "--rosa", "--roxo"];
// Ordem fixa das categorias de receita (coleta e gráfico usam a mesma lista).
export const CATEGORIAS_RECEITA = ["FEFC", "Fundo Partidário", "Partido (outros recursos)", "Pessoas físicas", "Recursos próprios", "Outros candidatos", "Outros"];
