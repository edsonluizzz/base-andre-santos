export const BASE = "https://resultados.tse.jus.br/oficial/ele2026";

const cargoPr = (ele, cargo) => `${BASE}/${ele}/dados/pr/pr-c${cargo}-e00${ele}-u.json`;

export const URLS = {
  estadual: cargoPr("6259", "0007"),
  federal: cargoPr("6259", "0006"),
  senador: cargoPr("6259", "0005"),
  governador: cargoPr("6259", "0003"),
  presBr: `${BASE}/6257/dados/br/br-c0001-e006257-u.json`,
  presPr: cargoPr("6257", "0001"),
};

export const URL_MUNICIPIOS = `${BASE}/6259/config/mun-e006259-cm.json`;
export const URL_ANDAMENTO = `${BASE}/6259/dados/pr/pr-e006259-ab.json`;
export const urlMunicipio = (cd) => `${BASE}/6259/dados/pr/pr${cd}-c0007-e006259-u.json`;

export async function baixarJson(url, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const r = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new Error(`TSE respondeu ${r.status} em ${url}`);
  const texto = await r.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`TSE devolveu conteúdo que não é JSON em ${url}`);
  }
}

export async function baixarPrincipais(opts) {
  const chaves = Object.keys(URLS);
  const resultados = await Promise.allSettled(chaves.map((k) => baixarJson(URLS[k], opts)));
  const brutos = {};
  const erros = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") brutos[chaves[i]] = r.value;
    else {
      brutos[chaves[i]] = null;
      erros.push(String(r.reason?.message ?? r.reason));
    }
  });
  return { brutos, erros };
}
