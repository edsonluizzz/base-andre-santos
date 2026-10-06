// Configuração compartilhada pela coleta (Node) e pela página.
export const FOCO = "30777";
export const PARTIDO = "NOVO";
export const RIVAIS_IGREJA = ["30300", "10456", "22622"];
export const PADRAO_B = "30300";
export const CORES_VAR = { 30777: "--laranja", 30300: "--azul", 10456: "--rosa", 22622: "--roxo" };
export const CORES_IGREJA = Object.fromEntries(Object.entries(CORES_VAR).map(([n, v]) => [n, `var(${v})`]));
// Ordem fixa das categorias de receita (coleta e gráfico usam a mesma lista).
export const CATEGORIAS_RECEITA = ["FEFC", "Fundo Partidário", "Partido (outros recursos)", "Pessoas físicas", "Recursos próprios", "Outros candidatos", "Outros"];
