# Análise da eleição 2026 — Paraná (Deputado Estadual)

Painel interno para entender o resultado do André Santos (30777): de onde vieram os votos
(do município ao local de votação), quanto custou cada voto e como ele se compara à chapa do NOVO
e aos rivais da igreja (Fabio Oliveira 30300, Mara Lima 10456, Dirlete Pinheiro 22622).
Roda só neste Mac; não depende do sistema em produção.

## Abrir

Dois cliques em `analise-2026/analise.command`. Abre no Chrome em `http://localhost:4330`.

Teclas: `1`–`5` trocam de tela · `T` tema claro/escuro. O endereço guarda a tela e as escolhas
(ex.: `#comparador?b=10456&nivel=loc`), então dá para salvar nos favoritos.

| Tela | O que mostra |
|---|---|
| 1 Panorama | Quociente, cadeiras por partido, chapa do NOVO, posição do André |
| 2 Votos do André | Mapa por município (zoom mostra os locais de votação), regiões, concentração, top municípios/locais, bairros de Curitiba |
| 3 Custo do voto | Receita e despesa declaradas ao TSE por voto, origem do dinheiro |
| 4 Comparador | André × qualquer estadual do NOVO ou rival, por município ou local, lado a lado ou diferença |
| 5 Rivais da igreja | Quem lidera onde entre os quatro, sobreposição de bases, onde cada rival foi forte |

## Atualizar os dados

    node analise-2026/coletar/coletar.mjs            # usa o que já está em analise-2026/coletar/cache/
    node analise-2026/coletar/coletar.mjs --refazer  # baixa tudo de novo do TSE

A coleta só grava se a soma de cada candidato no arquivo de seções bater exatamente com o resultado
oficial. Se não bater, ela mostra quem divergiu e para.

Dois detalhes do TSE que a coleta já trata:
- Votos em candidatos com registro indeferido não aparecem no resultado oficial (são nulos técnicos);
  a coleta só os lista.
- Seções que mudaram de local aparecem nos votos com o número **original** do local; a coleta casa
  esse número com o cadastro de locais.

A prestação de contas usada é parcial (arquivo do TSE de 04/10). Quando o TSE publicar a final
(novembro), rode com `--refazer`.

## Gasto interno (opcional)

`public/interno.json` (fora do git) acrescenta na tela 3 o gasto do André registrado no módulo financeiro:

    { "andre": { "gastoInterno": 90861, "fonte": "módulo financeiro", "data": "04/10/2026" } }

Sem esse arquivo a nota simplesmente não aparece.

## Desenvolvimento

    node --test analise-2026/test/*.teste.mjs
    analise-2026/verificar.sh                 # abre as 5 telas no Chrome headless e salva capturas

Fontes: TSE (dados abertos: votação por seção, locais de votação, prestação de contas; resultado oficial)
e IBGE (malha municipal). Spec: `docs/superpowers/specs/2026-10-05-analise-eleicao-2026-design.md`.
