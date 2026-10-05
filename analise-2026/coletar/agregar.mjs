// Agrega a votação por seção (Dep. Estadual) por município e por local de votação.
export const idLocal = (mun, zona, local) => `${mun}-${Number(zona)}-${Number(local)}`;

// 5 dígitos = candidato (válido ou anulado sub judice); 2 dígitos = legenda; 95/96/97 = branco/nulo/anulado.
export function classificarVotavel(nr, validos) {
  const s = String(nr);
  if (s.length === 5) return validos.has(s) ? "nominal" : "anulado";
  if (s.length === 2 && !["95", "96", "97"].includes(s)) return "legenda";
  return "descartado";
}

const somar = (mapa, k, v) => mapa.set(k, (mapa.get(k) ?? 0) + v);
const filho = (mapa, k) => {
  let m = mapa.get(k);
  if (!m) mapa.set(k, (m = new Map()));
  return m;
};

export function criarAgregador({ validos, focoLocal }) {
  const votosMun = new Map();
  const votosLocal = new Map();
  const totalLocal = new Map();
  const validosMun = new Map();
  return {
    adicionar({ mun, zona, local, votavel, votos }) {
      const tipo = classificarVotavel(votavel, validos);
      if (tipo === "descartado") return;
      if (tipo === "legenda") { somar(validosMun, mun, votos); return; }
      // anulado entra em votosMun para a conferência com o "vap" oficial bater, mas não conta como válido
      somar(filho(votosMun, votavel), mun, votos);
      if (tipo !== "nominal") return;
      somar(validosMun, mun, votos);
      const id = idLocal(mun, zona, local);
      somar(totalLocal, id, votos);
      if (focoLocal.has(votavel)) somar(filho(votosLocal, votavel), id, votos);
    },
    resultado: () => ({ votosMun, votosLocal, totalLocal, validosMun }),
  };
}
