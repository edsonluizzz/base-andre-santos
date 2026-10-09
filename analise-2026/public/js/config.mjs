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
export const anosDoCargo = (base, sigla = UF.sigla) => [...new Set(Object.entries(CARGOS).filter(([id]) => id.split("-")[0] === base && cargoNaUF(id, sigla)).map(([, c]) => c.ano))].sort((a, b) => b - a);
// Municipais (vereador/prefeito) coletadas só nestas UFs; as gerais, em todas.
export const UFS_MUNICIPAIS = ["PR"];
export const cargoNaUF = (id, sigla = UF.sigla) => !!CARGOS[id] && (!CARGOS[id].municipal || UFS_MUNICIPAIS.includes(sigla));
// Cargos das eleições gerais (a coleta estadual percorre só estes).
export const CARGOS_GERAIS = Object.fromEntries(Object.entries(CARGOS).filter(([, c]) => !c.municipal && c.ano === 2026));
export const CARGO_PADRAO = "estadual";
// Estados: nome, código IBGE, capital (cidade padrão do ranking por bairro) e artigo ("no Paraná", "na Bahia", "em Goiás").
export const UFS = {
  AC: { nome: "Acre", ibge: 12, capital: "RIO BRANCO", em: "no" }, AL: { nome: "Alagoas", ibge: 27, capital: "MACEIÓ", em: "em" },
  AM: { nome: "Amazonas", ibge: 13, capital: "MANAUS", em: "no" }, AP: { nome: "Amapá", ibge: 16, capital: "MACAPÁ", em: "no" },
  BA: { nome: "Bahia", ibge: 29, capital: "SALVADOR", em: "na" }, CE: { nome: "Ceará", ibge: 23, capital: "FORTALEZA", em: "no" },
  DF: { nome: "Distrito Federal", ibge: 53, capital: "BRASÍLIA", em: "no" }, ES: { nome: "Espírito Santo", ibge: 32, capital: "VITÓRIA", em: "no" },
  GO: { nome: "Goiás", ibge: 52, capital: "GOIÂNIA", em: "em" }, MA: { nome: "Maranhão", ibge: 21, capital: "SÃO LUÍS", em: "no" },
  MG: { nome: "Minas Gerais", ibge: 31, capital: "BELO HORIZONTE", em: "em" }, MS: { nome: "Mato Grosso do Sul", ibge: 50, capital: "CAMPO GRANDE", em: "em" },
  MT: { nome: "Mato Grosso", ibge: 51, capital: "CUIABÁ", em: "em" }, PA: { nome: "Pará", ibge: 15, capital: "BELÉM", em: "no" },
  PB: { nome: "Paraíba", ibge: 25, capital: "JOÃO PESSOA", em: "na" }, PE: { nome: "Pernambuco", ibge: 26, capital: "RECIFE", em: "em" },
  PI: { nome: "Piauí", ibge: 22, capital: "TERESINA", em: "no" }, PR: { nome: "Paraná", ibge: 41, capital: "CURITIBA", em: "no" },
  RJ: { nome: "Rio de Janeiro", ibge: 33, capital: "RIO DE JANEIRO", em: "no" }, RN: { nome: "Rio Grande do Norte", ibge: 24, capital: "NATAL", em: "no" },
  RO: { nome: "Rondônia", ibge: 11, capital: "PORTO VELHO", em: "em" }, RR: { nome: "Roraima", ibge: 14, capital: "BOA VISTA", em: "em" },
  RS: { nome: "Rio Grande do Sul", ibge: 43, capital: "PORTO ALEGRE", em: "no" }, SC: { nome: "Santa Catarina", ibge: 42, capital: "FLORIANÓPOLIS", em: "em" },
  SE: { nome: "Sergipe", ibge: 28, capital: "ARACAJU", em: "em" }, SP: { nome: "São Paulo", ibge: 35, capital: "SÃO PAULO", em: "em" },
  TO: { nome: "Tocantins", ibge: 17, capital: "PALMAS", em: "no" },
};
export const UF_PADRAO = "PR";
// UF em uso na página (trocada por definirUF); as telas leem UF.sigla/UF.nome.
export const UF = { sigla: UF_PADRAO, ...UFS[UF_PADRAO] };
export function definirUF(sigla) {
  const s = String(sigla ?? "").toUpperCase();
  Object.assign(UF, { sigla: UFS[s] ? s : UF_PADRAO, ...UFS[UFS[s] ? s : UF_PADRAO] });
  return UF;
}
// Pasta dos dados da UF: o PR na raiz de dados/, os demais em dados/uf/<uf>/ (mesmo layout).
export const raizDados = (sigla = UF.sigla) => (sigla === "PR" ? "dados/" : `dados/uf/${sigla.toLowerCase()}/`);
export const arquivoMapa = (sigla = UF.sigla) => (sigla === "PR" ? "mapa.geo.json" : `${raizDados(sigla)}mapa.geo.json`);
// No DF, o "estadual" é deputado distrital (código 8 no TSE).
// Cargo vendido: o id do cargo no PR ("estadual-2022") e "<uf>/<id>" nas demais UFs ("sc/estadual-2022").
export const chaveCargo = (id, sigla = UF.sigla) => (sigla === "PR" ? id : `${sigla.toLowerCase()}/${id}`);
export function lerChaveCargo(chave) {
  const [a, b] = String(chave).split("/");
  return b ? { uf: a.toUpperCase(), cargo: b } : { uf: "PR", cargo: a };
}
export const nomeCargo = (id, sigla = UF.sigla) => (sigla === "DF" && id.split("-")[0] === "estadual" ? "Deputado Distrital" : CARGOS[id]?.nome);
// Até quantos candidatos entram na comparação (um por cor).
export const MAX_COMPARADOS = 3;
// Cor do candidato principal e dos comparados, na ordem.
export const CORES_SERIE = ["--laranja", "--azul", "--rosa", "--roxo"];
// Ordem fixa das categorias de receita (coleta e gráfico usam a mesma lista).
export const CATEGORIAS_RECEITA = ["FEFC", "Fundo Partidário", "Partido (outros recursos)", "Pessoas físicas", "Recursos próprios", "Outros candidatos", "Outros"];
