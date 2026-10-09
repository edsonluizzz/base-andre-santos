// Agrega a votação por seção de um cargo por município e por local de votação.
export const idLocal = (mun, zona, local) => `${mun}-${Number(zona)}-${Number(local)}`;

// `digitos` = candidato (5 no estadual, 4 no federal; válido ou anulado sub judice); 2 dígitos = legenda
// (só de partido com legenda válida; a de partido anulado não conta como válido); 95/96/97 = branco/nulo/anulado.
export function classificarVotavel(nr, validos, legendas, digitos = 5) {
  const s = String(nr);
  if (s === "95" || s === "96" || s === "97") return "descartado"; // branco, nulo, anulado (governador também tem 2 dígitos)
  if (s.length === digitos) return validos.has(s) ? "nominal" : "anulado";
  if (s.length === 2 && legendas.has(s)) return "legenda";
  return "descartado";
}

const somar = (mapa, k, v) => mapa.set(k, (mapa.get(k) ?? 0) + v);
const filho = (mapa, k) => {
  let m = mapa.get(k);
  if (!m) mapa.set(k, (m = new Map()));
  return m;
};

// focoLocal = quem guarda votos por local; sem ele, todos os candidatos.
export function criarAgregador({ validos, legendas, focoLocal = null, digitos = 5 }) {
  const votosMun = new Map();
  const votosLocal = new Map();
  const totalLocal = new Map();
  const validosMun = new Map();
  return {
    adicionar({ mun, zona, local, votavel, votos }) {
      const tipo = classificarVotavel(votavel, validos, legendas, digitos);
      if (tipo === "descartado") return;
      if (tipo === "legenda") { somar(validosMun, mun, votos); return; }
      // anulado entra em votosMun para a conferência com o "vap" oficial bater, mas não conta como válido
      somar(filho(votosMun, votavel), mun, votos);
      if (tipo !== "nominal") return;
      somar(validosMun, mun, votos);
      const id = idLocal(mun, zona, local);
      somar(totalLocal, id, votos);
      if (!focoLocal || focoLocal.has(votavel)) somar(filho(votosLocal, votavel), id, votos);
    },
    resultado: () => ({ votosMun, votosLocal, totalLocal, validosMun }),
  };
}
