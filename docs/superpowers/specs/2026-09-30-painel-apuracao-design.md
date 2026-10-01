# Painel de apuração PR 2026 — design

Data: 2026-09-30 · Status: desenho aprovado (fases 1 e 2) · Plano: `docs/superpowers/plans/2026-09-30-painel-apuracao.md`

## Objetivo
Acompanhar numa TV, na noite de 04/10/2026 (1º turno), a apuração oficial do Paraná com destaque para André Santos (Dep. Estadual, NOVO, nº 30777): chapas estadual e federal do NOVO, senador, governador e presidente.

Sucesso = a tela roda a noite inteira sem intervenção, atualiza sozinha a cada minuto, e de longe se lê quantos votos o André tem, em que posição está e quantas vagas o NOVO garante.

## Decisões
- **Tudo local.** Roda no Mac do Edson, exibido numa TV em tela cheia. Sem item de menu, sem login, sem banco, sem Vercel. (O pedido original de integrar ao menu do sistema saiu do escopo.)
- **Mini-app independente** na pasta `apuracao/` deste repositório. Não importa nada de `src/` e nada de `src/` importa dele. Node puro (v24 local), zero dependências, sem etapa de build.
- **Front em HTML/CSS/JavaScript puro**, sem CDN: a tela só depende de internet para o TSE.
- Somente 1º turno. 2º turno fica para depois, se houver interesse.

## Fonte de dados
Arquivos JSON oficiais do TSE, base `https://resultados.tse.jus.br/oficial/ele2026`. Verificados em 2026-09-30: publicados, zerados, HTTP 200.

| Uso | Caminho |
|---|---|
| Dep. Estadual PR | `/6259/dados/pr/pr-c0007-e006259-u.json` |
| Dep. Federal PR | `/6259/dados/pr/pr-c0006-e006259-u.json` |
| Senador PR | `/6259/dados/pr/pr-c0005-e006259-u.json` |
| Governador PR | `/6259/dados/pr/pr-c0003-e006259-u.json` |
| Presidente Brasil | `/6257/dados/br/br-c0001-e006257-u.json` |
| Presidente no PR | `/6257/dados/pr/pr-c0001-e006257-u.json` |
| Lista de municípios (fase 2) | `/6259/config/mun-e006259-cm.json` |
| Andamento por município (fase 2) | `/6259/dados/pr/pr-e006259-ab.json` |
| Dep. Estadual por município (fase 2) | `/6259/dados/pr/pr<cdMun>-c0007-e006259-u.json` |

Fatos observados:
- Estrutura: cabeçalho (`dg`/`hg` data e hora da geração, `s` seções, `e` eleitorado, `v` votos) e `carg[0].agr[].par[].cand[]`. Números vêm como texto; percentuais com vírgula.
- Candidato: `n` número, `nmu` nome de urna, `vap` votos, `pvap` %, `st` situação, `e` eleito (`s`/`n`), `seq` ordem. Partido: `sg`, `tvtn` nominais, `tvtl` legenda; total do partido = `tvtn` + `tvtl`. Cargo: `nv` vagas (54 estadual, 30 federal, 2 senador), `qe` quociente eleitoral (0 até o TSE calcular).
- Seções totalizadas: `s.pst`. Votos válidos: `v.vv`. Brancos `v.vb`, nulos `v.tvn`.
- Cache do TSE: `max-age=58`. Limite: 2000 requisições por janela.
- **Requisição com cabeçalho `Origin` de outro domínio recebe 403**: o navegador não pode buscar direto; quem busca é o servidor local.
- André Santos 30777 está no arquivo de Dep. Estadual. NOVO: 41 candidatos a estadual, 31 a federal, 1 a senador, nenhum a governador.

## Arquitetura

```
apuracao/
  server.mjs        servidor HTTP + agendador dos ciclos
  lib/tse.mjs       URLs e download (timeout, retry no ciclo seguinte)
  lib/parse.mjs     JSON do TSE → estado enxuto (funções puras)
  lib/quociente.mjs quociente eleitoral e vagas diretas (funções puras)
  lib/estado.mjs    blocos lidos → estado enviado à página (funções puras)
  lib/municipios.mjs coleta por município (fase 2)
  lib/store.mjs     gravação e releitura do histórico em disco
  lib/simulador.mjs gera apuração fictícia progressiva
  public/           index.html, app.js, styles.css
  data/             histórico da noite (fora do git)
  test/             testes + fixtures reais
```

Cada módulo de `lib/` tem uma responsabilidade e é testável sem rede.

### Fluxo
1. A cada 60 s o servidor baixa os 6 arquivos principais em paralelo (timeout de 15 s cada).
2. `parse` converte cada um num bloco enxuto; `quociente` calcula as vagas; o servidor monta o **estado**.
3. O estado é gravado em `data/` e enviado à página por Server-Sent Events (`/events`). `GET /api/state` devolve o estado atual (usado na carga inicial e na reconexão).
4. A página anima a transição do estado anterior para o novo e reinicia a contagem regressiva com o horário da próxima busca informado pelo servidor.

### Estado (contrato servidor → página)
```
{
  geradoEm, proximaBuscaEm, simulacao: bool,
  fonte: { ok: bool, ultimaLeituraOk, erro? },
  pr: { secoesPct, comparecimentoPct, tseGeradoEm },
  andre: { votos, delta, posChapa, posGeral, totalCandidatos, situacao, eleito, historico: [{t, votos, secoesPct}] },
  estadual: { vagas, validos, quociente, quocienteOficial: bool,
              novo: { nominais, legenda, total, vagasDiretas, faltamProxima },
              candidatos: [{ n, nome, votos, pct, situacao, eleito }] },   // chapa NOVO inteira, ordenada
  federal: { ...mesma forma, sem André },
  governador: { secoesPct, candidatos: [{ n, nome, partido, votos, pct, situacao, eleito }] },
  senador: { vagas: 2, candidatos: [...] },
  presidente: { br: { secoesPct, candidatos }, pr: { secoesPct, candidatos } },
  municipios?: { ... }   // fase 2
}
```

### Quociente e vagas
- Quociente eleitoral = votos válidos ÷ vagas, arredondado (fração > 0,5 sobe). Se o TSE já informar `qe` > 0, usa o oficial e marca `quocienteOficial`.
- Vagas diretas do NOVO = parte inteira de (total do partido ÷ quociente).
- `faltamProxima` = votos que faltam para a próxima vaga direta.
- **Não calcula sobras.** Durante a apuração o quociente é parcial (muda conforme entram seções) e a tela diz isso. O resultado final é o `eleito` do TSE ao lado de cada nome.

### Falhas
- Arquivo que falha ou vem com JSON inválido: mantém o bloco anterior daquele cargo; os demais atualizam normalmente.
- `fonte.ok = false` quando qualquer arquivo principal falhou no ciclo; a tela mostra aviso âmbar "sem atualização desde HH:MM" com o horário da última leitura boa. Nunca apaga números.
- SSE cai: a página reconecta sozinha e pede `/api/state`.
- Servidor reiniciado: relê o histórico de `data/` e a evolução do André continua de onde parou.
- Votos nunca diminuem numa apuração normal; se um total cair, exibe o valor do TSE mesmo assim (não mascarar a fonte).

## Tela principal (fase 1)
1920×1080, sem rolagem, escala proporcional em outras resoluções. Tema escuro, laranja do NOVO como cor de destaque, tipografia grande.

- **Cabeçalho:** título, barra com % de seções totalizadas no PR, anel de contagem regressiva, relógio e horário da última leitura.
- **Coluna esquerda — André:** nome e número, votos em tamanho máximo, variação desde a última atualização, posição na chapa do NOVO, posição geral entre todos os candidatos a estadual, gráfico de evolução dos votos ao longo da noite, situação oficial quando houver.
- **Coluna central — chapas do NOVO:** estadual (10 primeiros; André sempre visível e realçado, mesmo fora dos 10) e federal (8 primeiros). Cada uma com votos de legenda, total do partido, quociente, vagas diretas e quanto falta para a próxima.
- **Coluna direita — majoritários:** governador (4 primeiros), senador (5 primeiros, marcando as 2 vagas), presidente (4 primeiros, com % Brasil e % Paraná lado a lado).

### Animações
- Anel de contagem regressiva esvazia até a próxima busca; ao zerar, pulsa enquanto busca.
- Números sobem contando do valor antigo ao novo (~1,2 s).
- Barras deslizam até a nova largura.
- Linhas trocam de posição com transição suave quando o ranking muda (técnica FLIP).
- Valores que mudaram piscam em laranja; se o André sobe de posição, realce maior no card dele.
- Sem dados novos no ciclo: nenhuma animação além do anel.

## Fase 2 — André por município
- Ciclo próprio a cada 5 minutos, independente do ciclo principal: baixa o arquivo de andamento (`ab`) e os 399 arquivos municipais de Dep. Estadual com no máximo 8 downloads simultâneos. Extrai de cada um só os votos do 30777 e o total de válidos do município.
- Falha em alguns municípios não invalida o ciclo: mantém o valor anterior desses e segue.
- Estado ganha `municipios: { atualizadoEm, comVotos, lista: [{ cd, nome, votos, pctValidos, secoesPct }] }`, ordenado por votos.
- **Segunda tela:** 15 municípios com mais votos do André (barras, % dos válidos da cidade, % de seções apuradas da cidade), total de municípios onde ele já tem voto, e uma faixa lateral com o resumo do André para não perder o número principal.
- **Rotação:** alterna automaticamente entre as duas telas (40 s na principal, 20 s na de municípios). Teclas: `1` e `2` fixam uma tela, `R` volta à rotação, `F` alterna tela cheia.

## Modo simulação
`node apuracao/server.mjs --simular`: em vez do TSE, o simulador parte dos arquivos reais (candidatos reais, votos zerados) e gera uma apuração fictícia que avança a cada ciclo de 10 s até 100% das seções. Serve para validar visual e animações na TV antes de domingo. A tela mostra tarja fixa "SIMULAÇÃO — DADOS FICTÍCIOS", e o histórico simulado vai para pasta separada (`data/sim/`), nunca misturado ao real.

## Operação
- `node apuracao/server.mjs` sobe em `http://localhost:4310`.
- `apuracao/iniciar.command` (duplo clique): sobe o servidor sob `caffeinate` (Mac não dorme) e abre o Chrome em modo quiosque.
- `apuracao/README.md` com o passo a passo da noite e o que fazer se algo falhar.

## Testes
`node --test apuracao/test/`, sem rede:
- `parse`: fixtures reais de 2026 (zerados, os 6 arquivos) e uma de 2024 com votos reais (Curitiba, prefeito) — extrai candidatos, partidos, percentuais com vírgula, seções.
- `quociente`: arredondamento, vagas diretas, `faltamProxima`, uso do `qe` oficial.
- `store`: grava, relê e reconstrói o histórico do André.
- `simulador`: votos só crescem, termina em 100%.
- Estado: falha de um arquivo preserva o bloco anterior e marca `fonte.ok = false`.
- Verificação manual: modo simulação na TV antes de domingo; no domingo antes das 17h, conferir contra o site Resultados do TSE.

## Fora do escopo
- Cálculo de sobras e projeção de eleitos.
- 2º turno.
- Item de menu, login, publicação em `ovile.com.br`.
- Fotos dos candidatos.
- Votação por município de outros candidatos além do André.
