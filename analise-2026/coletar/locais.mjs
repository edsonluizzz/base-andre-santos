import { idLocal } from "./agregar.mjs";

const coord = (s) => {
  const t = String(s ?? "").trim();
  if (!t || t === "-1" || t.startsWith("#")) return null;
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) && v !== 0 ? v : null;
};
const texto = (s) => (s && !String(s).startsWith("#") ? s : null);

// Cada linha do CSV de locais é uma seção; o local junta as seções da mesma zona.
export function criarLeitorLocais() {
  const locais = new Map();
  return {
    adicionar({ mun, zona, local, nome, bairro, lat, lon, eleitores }) {
      const id = idLocal(mun, zona, local);
      let l = locais.get(id);
      if (!l) locais.set(id, (l = { nm: texto(nome), bairro: texto(bairro), lat: coord(lat), lon: coord(lon), aptos: 0 }));
      l.aptos += Number(eleitores) || 0;
    },
    resultado: () => locais,
  };
}
