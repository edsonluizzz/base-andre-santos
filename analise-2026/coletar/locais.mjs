import { idLocal } from "./agregar.mjs";

const coord = (s) => {
  const t = String(s ?? "").trim();
  if (!t || t === "-1" || t.startsWith("#")) return null;
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) && v !== 0 ? v : null;
};
const texto = (s) => (s && !String(s).startsWith("#") ? s : null);

// Cada linha do CSV de locais é uma seção; o local junta as seções da mesma zona.
// A votação por seção usa o número ORIGINAL do local quando a seção mudou de lugar; esse número
// vira apelido (nome original, coordenadas do local atual). Um local atual sempre tem prioridade.
export function criarLeitorLocais() {
  const locais = new Map();
  const apelidos = new Map();
  return {
    adicionar({ mun, zona, local, nome, bairro, lat, lon, eleitores, localOriginal, nomeOriginal }) {
      const id = idLocal(mun, zona, local);
      let l = locais.get(id);
      if (!l) locais.set(id, (l = { nm: texto(nome), bairro: texto(bairro), lat: coord(lat), lon: coord(lon), aptos: 0 }));
      l.aptos += Number(eleitores) || 0;
      if (localOriginal == null || Number(localOriginal) === Number(local)) return;
      const ido = idLocal(mun, zona, localOriginal);
      let a = apelidos.get(ido);
      if (!a) apelidos.set(ido, (a = { nm: texto(nomeOriginal) ?? l.nm, bairro: l.bairro, lat: l.lat, lon: l.lon, aptos: 0 }));
      a.aptos += Number(eleitores) || 0;
    },
    resultado() {
      for (const [id, a] of apelidos) if (!locais.has(id)) locais.set(id, a);
      return locais;
    },
  };
}
