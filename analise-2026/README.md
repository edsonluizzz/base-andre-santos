# Análise da eleição 2026 — Paraná (Deputado Estadual e Federal)

Painel de diagnóstico eleitoral para **qualquer candidato** a deputado estadual ou federal no PR:
de onde vieram os votos (do município ao local de votação), quanto custou cada voto, com quem
divide a base e um **relatório em PDF** pronto para entregar. Base para o produto vendável
(acesso por candidato). Começou como o painel do André Santos (30777).

## Abrir

Dois cliques em `analise-2026/analise.command`. Abre no Chrome em `http://localhost:4330`.
Online: `/eleicao-2026/analise` no sistema.

Sem candidato escolhido, a página mostra a lista para escolher. A barra de cima troca o cargo
(Estadual/Federal), o candidato e quem entra na comparação (até 3). Sem escolha manual, entram
sozinhos os **concorrentes diretos**: candidatos com ¼ a 4× os votos e a maior correlação do %
por município. Tudo fica no endereço, então o link pode ser enviado ao cliente:

    #relatorio?cargo=estadual&c=30777&vs=30300,10456,22622
    (vs=- → nenhum comparado; sem vs → sugestão automática)

Teclas: `1`–`6` trocam de tela · `T` tema claro/escuro.

| Tela | O que mostra |
|---|---|
| 1 Panorama | Quociente, cadeiras por partido/federação, chapa do candidato, posição |
| 2 Votos do candidato | Mapa por município (zoom mostra os locais de votação), regiões, concentração, os 399 municípios com busca, locais e bairros, ranking na cidade |
| 3 Custo do voto | Receita ÷ votos do candidato, comparados e chapa; curvas recurso × voto e cenários (1,5× a 5× a receita); origem do dinheiro |
| 4 Comparador | Candidato × qualquer outro do mesmo cargo, por município ou local, lado a lado ou diferença |
| 5 Concorrentes | "Quem lidera" ou "Mapa de calor" com os comparados; sobreposição de bases; onde cada um foi forte |
| 6 Relatório PDF | 5 folhas A4: capa com conclusões automáticas, geografia, locais e bairros, custo e concorrentes, espaço para crescer e metodologia. "Baixar PDF" abre a impressão do navegador |

Em todos os mapas: ⤢ amplia, ⛶ tela cheia, ⟲ volta ao Paraná inteiro. Clique num município (ou use o campo
"Município") para dar zoom nele e ver os locais de votação daquela cidade nas tabelas.

## Atualizar os dados

    node analise-2026/coletar/coletar.mjs            # usa o que já está em analise-2026/coletar/cache/
    node analise-2026/coletar/coletar.mjs --refazer  # baixa tudo de novo do TSE

Uma leitura do CSV de seção alimenta os dois cargos (estadual = cargo 7, números de 5 dígitos;
federal = cargo 6, 4 dígitos). Grava `public/dados/<cargo>.json` (base, ~1,5 MB) e
`public/dados/<cargo>/<número>.json` (votos por local de cada candidato, carregados só quando o
candidato é aberto). A coleta só grava se a soma de cada candidato bater exatamente com o resultado
oficial dos dois cargos (hoje: 591/591 e 404/404). Se não bater, mostra quem divergiu e para.

Dois detalhes do TSE que a coleta já trata:
- Votos em candidatos com registro indeferido não aparecem no resultado oficial (são nulos técnicos);
  a coleta só os lista.
- Seções que mudaram de local aparecem nos votos com o número **original** do local; a coleta casa
  esse número com o cadastro de locais.

A prestação de contas usada é parcial (arquivo do TSE de 04/10). Quando o TSE publicar a final
(novembro), rode com `--refazer`.

## Gasto interno (opcional)

`public/interno.json` (fora do git) acrescenta na tela 3 o gasto registrado no módulo financeiro, por número:

    { "30777": { "gastoInterno": 90861, "fonte": "módulo financeiro", "data": "04/10/2026" } }

Sem esse arquivo a nota simplesmente não aparece.

## Desenvolvimento

    node --test analise-2026/test/*.teste.mjs
    analise-2026/verificar.sh                 # abre as 6 telas (estadual) + relatório federal no Chrome headless

Fontes: TSE (dados abertos: votação por seção, locais de votação, prestação de contas; resultado oficial)
e IBGE (malha municipal). Spec: `docs/superpowers/specs/2026-10-05-analise-eleicao-2026-design.md`.
