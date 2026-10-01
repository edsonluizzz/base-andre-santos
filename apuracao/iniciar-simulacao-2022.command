#!/bin/bash
# Reapresenta o 1º turno de 2022 com os resultados oficiais do TSE (teste com volume real).
exec "$(dirname "$0")/iniciar.command" --simular-2022 "$@"
