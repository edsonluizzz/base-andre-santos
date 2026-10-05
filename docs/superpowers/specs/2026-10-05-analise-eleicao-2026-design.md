# Análise da eleição 2026 PR — design

Data: 2026-10-05 · Status: desenho aprovado em conversa, spec aguardando revisão · Plano: (a escrever)

## Objetivo
Dashboard interno e animado para entender, em detalhe, o resultado de André Santos (Dep. Estadual, NOVO, nº 30777, 9.481 votos, suplente) na eleição de 04/10/2026: de onde vieram os votos (do município até o local de votação), quanto custou cada voto, como ele se compara a qualquer outro estadual da chapa do NOVO e aos três concorrentes no eleitorado da igreja.

Público: **uso interno da equipe** (André/Edson). Prioridade é exploração livre e números honestos, não narrativa de venda. O material para o partido sai depois, a partir do que for achado aqui.

Sucesso = em poucos cliques responder: "onde o André foi forte/fraco?", "quanto custou o voto dele vs. os outros?", "onde o candidato X tirou voto e o André não apareceu?", com todos os números batendo com o TSE.

## Decisões
- **Dados congelados + página estática (abordagem A).** Resultado é final; um script de coleta roda uma vez e gera `dados.json`. Sem servidor consultando o TSE.
- **Mini-app independente** em `analise-2026/` neste repositório, no mesmo espírito do `apuracao/`: não importa nada de `src/`, nada de `src/` importa dele, fora do menu e da Vercel. Node v24 local para coleta e servidor estático.
- **Front em HTML/CSS/JavaScript puro (módulos ES), sem build.** D3 v7 + topojson-client copiados para `public/vendor/` (sem CDN, funciona offline).
- **Só votos oficiais** para a comparação de igreja. Sem sobrepor as igrejas/membros do CRM.
- Somente Deputado Estadual PR, 1º turno.

## Candidatos em foco
| Papel | Nome de urna | Nº | Partido | Votos (oficial) | Situação |
|---|---|---|---|---|---|
| Foco | ANDRÉ SANTOS | 30777 | NOVO | 9.481 | Suplente |
| Rival igreja (mesma chapa) | FABIO OLIVEIRA | 30300 | NOVO | 22.365 | Suplente |
| Rival igreja | CANTORA MARA LIMA | 10456 | REPUBLICANOS | 41.133 | Suplente |
| Rival igreja | DIRLETE PINHEIRO | 22622 | PL | 5.298 | Suplente |

Chapa NOVO estadual: 42 candidatos no snapshot de contas de 01/10 (a coleta usa a contagem do resultado oficial); 3 eleitos (Bruno Secco, Luiz Fernando Guerra, Deivid Wisley). Rivais ficam configurados numa constante (`RIVAIS_IGREJA = [30300, 10456, 22622]`) para trocar sem mexer em código de tela.

## Fontes de dados (verificadas em 2026-10-05)
| Fonte | URL | Uso |
|---|---|---|
| Votação por seção PR (dados abertos, gerado 05/10 09:50) | `cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_PR.zip` (68 MB zip / 830 MB CSV) | **Fonte única dos votos.** Filtrar `CD_CARGO=7`. Colunas: `CD_MUNICIPIO` (código TSE), `NR_ZONA`, `NR_SECAO`, `NR_LOCAL_VOTACAO`, `NR_VOTAVEL`, `SQ_CANDIDATO`, `QT_VOTOS`. `NM_LOCAL_VOTACAO` vem `#NULO#`. |
| Locais de votação (gerado 05/10) | `.../eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip` → `eleitorado_local_votacao_2026_PR.csv` | Chave `CD_MUNICIPIO+NR_ZONA+NR_LOCAL_VOTACAO` → `NM_LOCAL_VOTACAO`, `NM_BAIRRO`, `NR_LATITUDE`/`NR_LONGITUDE` (vírgula decimal), `QT_ELEITOR_SECAO` (somar = aptos do local). PR: 4.815 locais, 100% com coordenadas. |
| Resultado oficial Dep. Estadual | `resultados.tse.jus.br/oficial/ele2026/6259/dados/pr/pr-c0007-e006259-u.json` | Nome de urna, partido, federação, situação (`st`), eleito (`e`), quociente (`qe`), vagas, votos válidos, legenda por partido. Estrutura documentada em `2026-09-30-painel-apuracao-design.md`. |
| Municípios | `.../6259/config/mun-e006259-cm.json` (`abr[cd=pr].mu[]`) | Código TSE `cd` → código IBGE `cdi`, nome. 399 municípios. |
| Prestação de contas (posição 04/10 07:16) | `cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2026.zip` (166 MB) | `despesas_contratadas_candidatos_2026_PR.csv` (`SQ_CANDIDATO`, `DS_CARGO`, `VR_DESPESA_CONTRATADA`) e `receitas_candidatos_2026_PR.csv` (`SQ_CANDIDATO`, `DS_ORIGEM_RECEITA`, `DS_FONTE_RECEITA`, `VR_RECEITA`). |
| Malha municipal | `servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio` | GeoJSON, 399 feições, `properties.codarea` = IBGE. Convertido para TopoJSON na coleta. |

Fatos observados:
- CSVs do TSE: Latin-1, separador `;`, campos entre aspas exceto numéricos. Decodificar com `TextDecoder("latin1")`.
- A API DivulgaCandContas responde 403 fora do navegador (inclusive deste Mac) — **não usar**; o CSV de prestação de contas cobre todos os partidos.
- Os ZIPs ficam em cache em `analise-2026/coletar/cache/` (fora do git); a coleta não baixa de novo se o arquivo existir, salvo `--refazer`.

## Arquitetura
```
analise-2026/
  coletar/
    coletar.mjs        # orquestra: baixa, lê, agrega, confere, grava public/dados.json
    csv.mjs            # leitor de CSV TSE em stream (latin1, ;, aspas) linha a linha
    agregar.mjs        # funções puras: secao → municipio/local, por candidato
    contas.mjs         # funções puras: soma despesas/receitas por SQ_CANDIDATO
    conferir.mjs       # confere totais contra o resultado oficial
    cache/             # zips baixados (gitignored)
  public/
    index.html
    dados.json         # gerado (versionado — é pequeno e congela a análise)
    mapa.topo.json     # gerado
    css/estilo.css
    js/
      main.js          # carrega dados, roteador de telas (hash), teclado
      dados.js         # índices e consultas sobre dados.json (puras)
      calc.js          # custo/voto, diferença, sobreposição, concentração (puras)
      mapa.js          # componente de mapa reaproveitado (municípios + locais)
      animar.js        # contagem de números, corrida de barras, transições
      telas/panorama.js, andre.js, custo.js, comparador.js, igreja.js
    vendor/d3.v7.min.js, topojson-client.min.js
  test/*.teste.mjs     # node --test sobre coletar/*.mjs e public/js/{dados,calc}.js
  servidor.mjs         # estático, porta 4330
  analise.command      # sobe servidor e abre Chrome
  README.md
```

### Fluxo de coleta
1. Baixa (ou usa cache) os 4 arquivos do TSE + malha IBGE.
2. Lê o resultado oficial → lista de 591 candidatos (`n`, `sqcand`, `nmu`, partido, federação, `st`, `e`, `vap`) + agregados do cargo.
3. Stream do CSV de seção, só `CD_CARGO=7`, `NR_VOTAVEL` de 5 dígitos (descarta legenda/branco/nulo, que entram pelos agregados oficiais):
   - `votosMun[cand][cdMun]` para **todos** os candidatos;
   - `votosLocal[cand][localId]` só para **candidatos do NOVO + rivais**;
   - `totalLocal[localId]` = votos nominais estaduais de todos (denominador do "% no local").
4. Junta locais com o CSV de locais (nome, bairro, lat/lon, aptos).
5. Contas: soma `VR_DESPESA_CONTRATADA` e `VR_RECEITA` por `SQ_CANDIDATO` (só `DS_CARGO = Deputado Estadual`); receitas também quebradas por origem (partido/FEFC, pessoa física, recursos próprios, outros).
6. **Conferência (falha = aborta sem gravar):** para cada candidato, soma por município do CSV = `vap` oficial. Tolerância 0. Se o TSE ainda tiver seções pendentes e houver diferença, o relatório lista os candidatos divergentes e exige `--aceitar-divergencia` explicitamente.
7. Grava `dados.json` e `mapa.topo.json` com metadados (`geradoEm`, data/hora de cada fonte).

### Formato de `dados.json` (compacto)
```js
{
  meta: { geradoEm, fontes: { secao, locais, oficial, contas } },
  cargo: { vagas, qe, validos, nominais, legenda, brancos, nulos },
  partidos: [{ sg, fed, nominais, legenda, eleitos }],
  municipios: [{ cd, ibge, nm, regiao, validos }],          // índice i
  locais: [{ id, mun: i, nm, bairro, lat, lon, aptos, total }], // índice j
  candidatos: [{ n, sq, nm, sg, fed, st, eleito, votos,
                 despesa, receita, receitaPorOrigem,
                 mun: [[i, votos], ...],                    // esparso
                 loc: [[j, votos], ...] | null }]           // só NOVO + rivais
}
```
Regiões: `Curitiba`, `RMC` (lista fixa de municípios da RMC oficial), `Litoral` (7 municípios), `Interior` (resto). Lista em `coletar/regioes.mjs`.

Estimativa: 591 candidatos × municípios esparsos + 45 × locais esparsos ≈ 2–4 MB. Se passar de 6 MB, `loc` vira arquivo separado carregado sob demanda.

## Telas
Navegação por abas e teclas `1`–`5`; estado na URL (`#comparador?b=30300&nivel=local`) para voltar ao mesmo ponto. Tema escuro padrão, `T` alterna claro (mesma paleta do painel de apuração). Todas as animações respeitam `prefers-reduced-motion`.

1. **Panorama PR** — votos válidos, quociente, cadeiras por partido (barras animadas), chapa do NOVO em "corrida" de barras até o resultado, destaque do André (posição na chapa e geral) e dos eleitos. Card de quanto faltou para a 3ª/4ª vaga do NOVO.
2. **De onde vieram os votos do André** — mapa coroplético (votos absolutos ou % dos válidos do município, alternável); zoom aproxima e mostra locais de votação como círculos proporcionais; tooltip com escola, bairro, votos, % no local, aptos. Ao lado: regiões (Curitiba/RMC/Litoral/Interior), top 20 municípios, top 20 locais, top bairros de Curitiba, curva de concentração ("N municípios fazem 50%/80% dos votos"), municípios com zero voto.
3. **Custo do voto** — tabela e dispersão despesa × votos para os 42 do NOVO + rivais; R$/voto, receita por origem; André destacado. Mostra a data da posição das contas e o aviso de que a prestação final sai em novembro. Valor do módulo financeiro interno (R$ 90.861 gastos) aparece como nota ao lado do valor declarado ao TSE, sem substituir.
4. **Comparador** — seletor de candidato B (todos do NOVO + rivais; padrão Fabio Oliveira). Nível município ou local. Modos: lado a lado (dois mapas sincronizados) e diferença (cor divergente: André vs B). Métricas: votos, R$/voto, nº de municípios/locais com voto, sobreposição (locais onde ambos têm voto, e % dos votos de cada um que está nessa interseção), correlação geográfica. Tabelas ordenáveis "onde B foi forte e André fraco" e o inverso.
5. **Rivais da igreja** — André + Fabio + Mara + Dirlete: mapa "quem venceu" cada município/local entre os quatro, barras por região, matriz de sobreposição 4×4, e para cada rival a lista dos 15 locais onde ele foi mais forte com o voto do André no mesmo local.

## Cálculos (definições fixas)
- **R$/voto** = despesas contratadas ÷ votos nominais. Sem despesa declarada → "sem dado", nunca R$ 0.
- **% no município** = votos do candidato ÷ votos válidos estaduais do município. **% no local** = votos ÷ votos nominais estaduais do local.
- **Sobreposição A∩B** = locais com ≥1 voto de ambos; reportar também a fração dos votos de A e de B dentro desses locais.
- **Correlação geográfica** = Pearson entre os % por local dos dois (só locais com algum voto de A ou B).
- **Concentração** = menor nº de municípios (e locais) cuja soma atinge 50% e 80% dos votos.

## Erros e limites
- Coleta: falha de download → mensagem clara com URL e para; conferência divergente → aborta (ver passo 6).
- Front: se `dados.json` não carregar, tela única com instrução para rodar a coleta.
- Locais sem coordenada (nenhum hoje) entram nas tabelas e ficam fora do mapa, com contador visível.

## Testes
`node --test analise-2026/test/*.teste.mjs`, sem dependências:
- `csv.mjs`: aspas, campos numéricos sem aspas, latin1, linha final vazia.
- `agregar.mjs`/`contas.mjs`: fixtures pequenas (CSV de 20 linhas) com totais conhecidos.
- `conferir.mjs`: detecta divergência e passa quando bate.
- `calc.js`: R$/voto (incluindo sem despesa), sobreposição, correlação, concentração, diferença.
- Verificação final real: rodar a coleta completa e confirmar André = 9.481, Fabio = 22.365, Mara = 41.133, Dirlete = 5.298; abrir as 5 telas no Chrome sem erro no console.

## Fora do escopo
- Igrejas/membros do CRM no mapa.
- Deputado federal, senador, governador, presidente.
- Publicação online (pode virar Artifact privado depois, sem mudar a página).
- Comparação com 2022.
