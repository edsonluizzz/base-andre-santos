// Configuração compartilhada pela coleta (Node) e pela página.
// Cargos disponíveis: código do TSE, dígitos do número do candidato e arquivo do resultado oficial.
// Eleições gerais (2026, o estado inteiro) e municipais (cada cidade é uma eleição; `arquivo` = pasta em dados/).
export const CARGOS = {
  estadual: { nome: "Deputado Estadual", curto: "Estadual", cd: "7", digitos: 5, oficial: "c0007", ano: 2026 },
  federal: { nome: "Deputado Federal", curto: "Federal", cd: "6", digitos: 4, oficial: "c0006", ano: 2026 },
  governador: { nome: "Governador", curto: "Governador", cd: "3", digitos: 2, oficial: "c0003", ano: 2026, majoritario: true },
  senador: { nome: "Senador", curto: "Senador", cd: "5", digitos: 3, oficial: "c0005", ano: 2026, majoritario: true },
  "estadual-2022": { nome: "Deputado Estadual", curto: "Estadual 2022", ano: 2022, arquivo: "2022/estadual" },
  "federal-2022": { nome: "Deputado Federal", curto: "Federal 2022", ano: 2022, arquivo: "2022/federal" },
  "governador-2022": { nome: "Governador", curto: "Governador 2022", ano: 2022, arquivo: "2022/governador", majoritario: true },
  "senador-2022": { nome: "Senador", curto: "Senador 2022", ano: 2022, arquivo: "2022/senador", majoritario: true },
  "presidente-2022": { nome: "Presidente", curto: "Presidente 2022", ano: 2022, arquivo: "2022/presidente", majoritario: true },
  "vereador-2024": { nome: "Vereador", curto: "Vereador 2024", municipal: true, ano: 2024, arquivo: "2024/vereador" },
  "prefeito-2024": { nome: "Prefeito", curto: "Prefeito 2024", municipal: true, ano: 2024, arquivo: "2024/prefeito" },
  "vereador-2020": { nome: "Vereador", curto: "Vereador 2020", municipal: true, ano: 2020, arquivo: "2020/vereador" },
  "prefeito-2020": { nome: "Prefeito", curto: "Prefeito 2020", municipal: true, ano: 2020, arquivo: "2020/prefeito" },
};
// Anos coletados (o mais recente primeiro). Gerais de 2026 usam o id sem ano ("estadual"); os demais, "<cargo>-<ano>".
export const ANOS_MUNICIPAIS = [2024, 2020];
export const ANOS_GERAIS = [2026, 2022];
export const idCargo = (base, ano) => (ano === 2026 && ["estadual", "federal", "governador", "senador"].includes(base) ? base : `${base}-${ano}`);
// Anos em que um cargo existe (ex.: presidente só 2022 até sair o 2º turno de 2026).
export const anosDoCargo = (base) => [...new Set(Object.entries(CARGOS).filter(([id]) => id.split("-")[0] === base).map(([, c]) => c.ano))].sort((a, b) => b - a);
// Cargos das eleições gerais (a coleta estadual percorre só estes).
export const CARGOS_GERAIS = Object.fromEntries(Object.entries(CARGOS).filter(([, c]) => !c.municipal && c.ano === 2026));
export const CARGO_PADRAO = "estadual";
export const UF = { sigla: "PR", nome: "Paraná" };
// Até quantos candidatos entram na comparação (um por cor).
export const MAX_COMPARADOS = 3;
// Cor do candidato principal e dos comparados, na ordem.
export const CORES_SERIE = ["--laranja", "--azul", "--rosa", "--roxo"];
// Ordem fixa das categorias de receita (coleta e gráfico usam a mesma lista).
export const CATEGORIAS_RECEITA = ["FEFC", "Fundo Partidário", "Partido (outros recursos)", "Pessoas físicas", "Recursos próprios", "Outros candidatos", "Outros"];
