# Painel de apuração — Paraná 2026

Tela para TV com a apuração oficial do TSE, com destaque para André Santos (30777).
Roda só neste Mac; não depende do sistema em produção.

## Na noite da apuração (domingo, 04/10)

1. Ligue o Mac na TV (HDMI) e deixe a TV como tela principal ou espelhada.
2. Dê dois cliques em `apuracao/iniciar.command`.
   O painel abre no Chrome em tela cheia e o Mac não dorme enquanto ele estiver aberto.
3. Antes das 17h os números ficam zerados. A partir do início da totalização, a tela
   atualiza sozinha a cada minuto.

Teclas: `1` tela principal · `2` André por município · `R` alternar sozinho · `F` tela cheia.
Para sair do Chrome: `Cmd+Q`. Para encerrar o painel: feche a janela do Terminal.

## Para testar antes

Dois cliques em `apuracao/iniciar-simulacao.command`. Aparece uma tarja vermelha
"SIMULAÇÃO — DADOS FICTÍCIOS": são números inventados sobre os candidatos reais,
avançando a cada 10 segundos.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Faixa âmbar "Sem atualização desde HH:MM" | O TSE ou a internet falharam. Os números na tela são os últimos lidos. Volta sozinho; confira o Wi-Fi. |
| Tela parada, contagem não anda | Aperte `Cmd+R` no Chrome. |
| Chrome fechou | Abra `http://localhost:4310` em qualquer navegador e aperte `F`. |
| Terminal fechou | Dois cliques em `iniciar.command` de novo. O gráfico de evolução do André continua de onde parou. |
| "address already in use" | Já há um painel rodando. Abra `http://localhost:4310`. |

## O que a tela mostra

- **Quociente parcial:** votos válidos ÷ vagas, com o que já foi apurado. Muda durante a noite.
  Vira "quociente oficial" quando o TSE publicar o dele.
- **Vagas diretas:** quantas cadeiras o NOVO garante só pelo quociente. As sobras não são
  calculadas aqui; o resultado final é o "✔" ao lado de cada eleito, que vem do TSE.
- **Municípios:** atualizam a cada 5 minutos (são 399 arquivos por rodada).

## Dados

- Fonte: `https://resultados.tse.jus.br/oficial/ele2026` (eleições 6259 e 6257).
- Histórico da noite: `apuracao/data/real/` (`historico.jsonl`, `estados.jsonl`). Fica fora do git.

## Desenvolvimento

    node apuracao/server.mjs            # dados reais
    node apuracao/server.mjs --simular  # simulação
    node --test apuracao/test/*.teste.mjs
