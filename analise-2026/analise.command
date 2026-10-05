#!/bin/bash
# Sobe o servidor local da análise e abre no Chrome. Feche esta janela para encerrar.
cd "$(dirname "$0")" || exit 1
PORTA="${PORTA:-4330}"
ANTIGO=$(lsof -ti "tcp:$PORTA" -sTCP:LISTEN)
if [ -n "$ANTIGO" ]; then kill $ANTIGO 2>/dev/null; sleep 1; fi
node servidor.mjs --porta="$PORTA" &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT INT TERM
for _ in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORTA/" && break; sleep 0.3; done
open -a "Google Chrome" "http://localhost:$PORTA/" 2>/dev/null || open "http://localhost:$PORTA/"
echo "Análise rodando em http://localhost:$PORTA/ — feche esta janela para encerrar."
wait $SRV
