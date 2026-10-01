#!/bin/bash
# Sobe o painel de apuração, impede o Mac de dormir e abre o Chrome em tela cheia.
cd "$(dirname "$0")/.." || exit 1
PORTA="${PORTA:-4310}"

caffeinate -dims node apuracao/server.mjs "$@" &
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

if [ -n "$CHROME" ]; then
  "$CHROME" --kiosk --user-data-dir="$HOME/.apuracao-chrome" --no-first-run "http://localhost:$PORTA/" >/dev/null 2>&1 &
else
  open "http://localhost:$PORTA/"
  echo "Chrome não encontrado: abri no navegador padrão. Aperte F para tela cheia."
fi

echo "Painel rodando. Para encerrar, feche esta janela ou aperte Ctrl+C."
wait $SERVIDOR
