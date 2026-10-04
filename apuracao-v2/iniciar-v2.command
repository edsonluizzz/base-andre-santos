#!/bin/bash
# Sobe o painel de apuração, impede o Mac de dormir e abre o Chrome em tela cheia.
cd "$(dirname "$0")/.." || exit 1
PORTA="${PORTA:-4320}"

# Um painel esquecido em outra janela ocuparia a porta: encerra antes de subir.
ANTIGO=$(lsof -ti "tcp:$PORTA" -sTCP:LISTEN)
if [ -n "$ANTIGO" ]; then
  echo "Já havia um painel na porta $PORTA; encerrando o antigo."
  kill $ANTIGO 2>/dev/null
  sleep 1
fi

# Se o servidor cair no meio da noite, sobe de novo sozinho.
(
  trap 'kill $NODE 2>/dev/null; exit' TERM INT
  while true; do
    caffeinate -dims node apuracao-v2/server.mjs "$@" &
    NODE=$!
    wait $NODE
    echo "Servidor parou; reiniciando em 2 segundos..."
    sleep 2
  done
) &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null' EXIT INT TERM

for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://localhost:$PORTA/" && break
  sleep 0.5
done

CHROME=""
for c in "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "$HOME/Desktop/Google Chrome.app"; do
  [ -d "$c" ] && CHROME="$c/Contents/MacOS/Google Chrome" && break
done

if [ -n "$SEM_NAVEGADOR" ]; then
  echo "Navegador não aberto (SEM_NAVEGADOR). Acesse http://localhost:$PORTA/"
elif [ -n "$CHROME" ]; then
  "$CHROME" --kiosk --user-data-dir="$HOME/.apuracao-v2-chrome" --no-first-run "http://localhost:$PORTA/" >/dev/null 2>&1 &
else
  open "http://localhost:$PORTA/"
  echo "Chrome não encontrado: abri no navegador padrão. Aperte F para tela cheia."
fi

echo "Painel rodando. Para encerrar, feche esta janela ou aperte Ctrl+C."
wait $SERVIDOR
