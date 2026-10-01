// Gera uma apuração fictícia no MESMO formato dos arquivos do TSE, para que a
// simulação passe pelo mesmo caminho de leitura do dado real.

const PROPORCIONAIS = new Set(["estadual", "federal"]);
const TOTAL_VOTOS = {
  estadual: 6_000_000, federal: 6_000_000, senador: 11_000_000,
  governador: 6_200_000, presBr: 118_000_000, presPr: 6_300_000,
};
const ALVO_ANDRE = 38_000;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmtPct = (x) => x.toFixed(2).replace(".", ",");
const candidatosDe = (json) => json.carg[0].agr.flatMap((a) => a.par.flatMap((p) => p.cand));

function aplicar(base, alvo, p, proporcional) {
  const json = structuredClone(base);
  let validos = 0;
  const todos = [];
  for (const agr of json.carg[0].agr) {
    for (const par of agr.par) {
      let nominais = 0;
      for (const c of par.cand) {
        const v = Math.round((alvo.get(c.n) ?? 0) * p);
        c.vap = String(v);
        nominais += v;
        todos.push(c);
      }
      const legenda = proporcional ? Math.round(nominais * 0.04) : 0;
      par.tvtn = String(nominais);
      par.tvtl = String(legenda);
      validos += nominais + legenda;
    }
  }
  for (const c of todos) c.pvap = fmtPct(validos ? (100 * Number(c.vap)) / validos : 0);
  json.s = { ...json.s, pst: fmtPct(100 * p) };
  json.e = { ...json.e, pc: fmtPct(78 * p) };
  json.v = { ...json.v, vv: String(validos) };
  json.hg = new Date().toTimeString().slice(0, 8);
  return json;
}

export function criarSimulador(bases, { passos = 30, seed = 2026 } = {}) {
  const rand = prng(seed);
  const alvos = {};
  for (const [k, json] of Object.entries(bases)) {
    const cands = candidatosDe(json);
    const pesos = cands.map(() => Math.pow(rand(), 4) + 0.002);
    const soma = pesos.reduce((a, b) => a + b, 0);
    alvos[k] = new Map(cands.map((c, i) => [c.n, Math.round((TOTAL_VOTOS[k] * 0.9 * pesos[i]) / soma)]));
  }
  alvos.estadual?.set("30777", ALVO_ANDRE);
  // Presidente no PR acompanha a proporção nacional, para a simulação ficar plausível.
  if (alvos.presBr && alvos.presPr) {
    const k = TOTAL_VOTOS.presPr / TOTAL_VOTOS.presBr;
    for (const [n, v] of alvos.presBr) if (alvos.presPr.has(n)) alvos.presPr.set(n, Math.round(v * k));
  }
  const pesosMun = Array.from({ length: 500 }, () => Math.pow(rand(), 12) + 0.0005);
  let passo = 0;

  return {
    get terminou() {
      return passo >= passos;
    },
    proximo() {
      passo = Math.min(passos, passo + 1);
      const p = passo / passos;
      return Object.fromEntries(
        Object.entries(bases).map(([k, base]) => [k, aplicar(base, alvos[k], p, PROPORCIONAIS.has(k))]),
      );
    },
    municipios(lista, agora) {
      const p = passo / passos;
      const votosAndre = ALVO_ANDRE * p;
      const soma = lista.reduce((a, _, i) => a + pesosMun[i % pesosMun.length], 0);
      const saida = lista.map((m, i) => {
        const votos = Math.round((votosAndre * pesosMun[i % pesosMun.length]) / soma);
        const validos = votos * 25 + Math.round(1000 * p);
        return {
          cd: m.cd, nome: m.nome, votos, validos,
          pctValidos: validos ? (100 * votos) / validos : 0,
          secoesPct: 100 * p,
        };
      });
      saida.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
      return {
        atualizadoEm: agora,
        comVotos: saida.filter((m) => m.votos > 0).length,
        total: saida.length,
        falhas: 0,
        lista: saida,
      };
    },
  };
}
