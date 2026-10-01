import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function criarStore(dir) {
  mkdirSync(dir, { recursive: true });
  const arqHistorico = join(dir, "historico.jsonl");
  const pontos = [];

  if (existsSync(arqHistorico)) {
    const texto = readFileSync(arqHistorico, "utf8");
    for (const linha of texto.split("\n")) {
      if (!linha.trim()) continue;
      try {
        const p = JSON.parse(linha);
        if (typeof p.votos === "number") pontos.push(p);
      } catch {
        // linha truncada por queda no meio da gravação
      }
    }
    // Garante que a próxima gravação comece em linha nova.
    if (texto && !texto.endsWith("\n")) appendFileSync(arqHistorico, "\n");
  }

  return {
    historico: () => pontos.slice(),
    registrar(ponto) {
      const u = pontos.at(-1);
      if (u && u.votos === ponto.votos && u.secoesPct === ponto.secoesPct) return false;
      pontos.push(ponto);
      appendFileSync(arqHistorico, JSON.stringify(ponto) + "\n");
      return true;
    },
    salvarEstado(estado) {
      const json = JSON.stringify(estado);
      writeFileSync(join(dir, "ultimo.json"), json);
      appendFileSync(join(dir, "estados.jsonl"), json + "\n");
    },
  };
}
