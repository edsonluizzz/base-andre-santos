#!/bin/bash
# Abre cada tela no Chrome headless, salva captura e falha se a página registrou erro de JavaScript
# ou não terminou de montar. Uso: analise-2026/verificar.sh [rota ...]   (padrão: as 5 telas)
cd "$(dirname "$0")" || exit 1
PORTA=4331
SAIDA="${SAIDA:-/tmp/analise-2026-telas}"
mkdir -p "$SAIDA"
ROTAS=("$@")
[ ${#ROTAS[@]} -eq 0 ] && ROTAS=(panorama andre custo comparador igreja dobradas)
node servidor.mjs --porta=$PORTA >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; pkill -f "user-data-dir=$SAIDA/perfil" 2>/dev/null' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORTA/" && break; sleep 0.3; done
CHROME=""
for c in "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "$HOME/Desktop/Google Chrome.app"; do
  [ -d "$c" ] && CHROME="$c/Contents/MacOS/Google Chrome" && break
done
[ -z "$CHROME" ] && { echo "Chrome não encontrado"; exit 1; }
# Roda o comando e o encerra depois de 15 s, sem erro (o resultado já foi gravado até lá).
limite() { perl -e '$p = fork; if (!$p) { exec @ARGV } $SIG{ALRM} = sub { kill 9, $p; exit 0 }; alarm 15; waitpid($p, 0)' "$@"; }
FALHOU=0
for rota in "${ROTAS[@]}"; do
  url="http://localhost:$PORTA/#$rota"
  nome=$(echo "$rota" | tr '?&=' '___')
  opts=(--headless=new --disable-gpu --no-sandbox --no-first-run --disable-background-networking --disable-component-update --force-prefers-reduced-motion
        --hide-scrollbars --window-size=1600,1100 --virtual-time-budget=8000 --user-data-dir="$SAIDA/perfil")
  # Nesta máquina o Chrome headless entrega o resultado mas nem sempre encerra: limite de 15 s por chamada.
  limite "$CHROME" "${opts[@]}" --dump-dom "$url" > "$SAIDA/$nome.html" 2>/dev/null
  limite "$CHROME" "${opts[@]}" --screenshot="$SAIDA/$nome.png" "$url" >/dev/null 2>&1
  tela="${rota%%\?*}"
  if grep -q 'data-erros=' "$SAIDA/$nome.html" || ! grep -q "data-pronta=\"$tela\"" "$SAIDA/$nome.html"; then
    echo "FALHOU $rota"
    sed -n 's/.*<pre id="erros"[^>]*>\([^<]*\).*/\1/p' "$SAIDA/$nome.html"
    FALHOU=1
  else
    echo "ok     $rota → $SAIDA/$nome.png"
  fi
done
exit $FALHOU
