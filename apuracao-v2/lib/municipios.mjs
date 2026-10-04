import { num, pct } from "./parse.mjs";

export function parseListaMunicipios(cfg, uf = "pr") {
  const abr = (cfg?.abr ?? []).find((a) => a.cd.toLowerCase() === uf);
  if (!abr) throw new Error(`UF ${uf} não encontrada na lista de municípios do TSE`);
  return abr.mu.map((m) => ({ cd: m.cd, nome: m.nm }));
}

export function parseAndamento(ab) {
  return new Map(ab.abr.filter((a) => a.tpabr === "mun").map((a) => [a.cdabr, pct(a.s?.pst)]));
}

export function parseMunicipio(json, numero) {
  const validos = num(json?.v?.vv);
  for (const agr of json?.carg?.[0]?.agr ?? []) {
    for (const par of agr.par ?? []) {
      for (const c of par.cand ?? []) {
        if (c.n === numero) return { votos: num(c.vap), validos };
      }
    }
  }
  return { votos: 0, validos };
}

// Executa fn sobre os itens com no máximo `limite` chamadas simultâneas.
export async function emLotes(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      try {
        resultados[i] = { ok: true, valor: await fn(itens[i]) };
      } catch (erro) {
        resultados[i] = { ok: false, erro };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

export async function coletarMunicipios({
  lista, baixarAndamento, baixarMunicipio, anterior = null, numero = "30777", limite = 8, agora,
}) {
  const antes = new Map((anterior?.lista ?? []).map((m) => [m.cd, m]));
  let andamento = null;
  try {
    andamento = parseAndamento(await baixarAndamento());
  } catch {
    // mantém o % de seções da coleta anterior
  }
  const res = await emLotes(lista, limite, async (m) => parseMunicipio(await baixarMunicipio(m.cd), numero));
  let falhas = 0;
  const saida = lista.map((m, i) => {
    const ant = antes.get(m.cd);
    const r = res[i];
    if (!r.ok) falhas++;
    const votos = r.ok ? r.valor.votos : ant?.votos ?? 0;
    const validos = r.ok ? r.valor.validos : ant?.validos ?? 0;
    return {
      cd: m.cd,
      nome: m.nome,
      votos,
      validos,
      pctValidos: validos ? (100 * votos) / validos : 0,
      secoesPct: andamento?.get(m.cd) ?? ant?.secoesPct ?? 0,
    };
  });
  saida.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    atualizadoEm: agora,
    comVotos: saida.filter((m) => m.votos > 0).length,
    total: saida.length,
    falhas,
    lista: saida,
  };
}

export const resumirMunicipios = (m, n = 30) => (m ? { ...m, lista: m.lista.slice(0, n) } : null);
