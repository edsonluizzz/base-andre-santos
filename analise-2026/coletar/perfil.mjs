// Perfil do eleitorado (TSE, perfil_eleitor_secao) somado por local de votação.
// Cada linha do CSV é uma combinação de gênero × faixa etária × escolaridade × … numa seção, com a quantidade
// de eleitores. O local é o MESMO que a votação por seção usa: quando a seção mudou de lugar, a votação traz o
// número original do local (ver locais.mjs), então o perfil da seção vai para esse número também.
import { PERFIL_CATS, posCat } from "../public/js/config.mjs";
import { idLocal } from "./agregar.mjs";

const TAM = 1 + PERFIL_CATS.length;
const P = Object.fromEntries(PERFIL_CATS.map((c) => [c.id, posCat(c.id)]));

// Códigos do TSE (iguais em 2022 e 2026): gênero 2 = masculino, 4 = feminino; faixa "1600" = 16 anos,
// "2529" = 25 a 29, "9999" = 100 ou mais, "-3" = inválida; escolaridade 1 (analfabeto) a 8 (superior completo), 0 = não informado.
export function genero(cd) {
  return cd === "4" ? P.f : cd === "2" ? P.m : null;
}
export function idade(cd) {
  const n = Number(cd);
  if (!(n >= 1600)) return null;
  const ini = Math.floor(n / 100);
  return ini < 25 ? P.i16 : ini < 35 ? P.i25 : ini < 45 ? P.i35 : ini < 60 ? P.i45 : P.i60;
}
export function escolaridade(cd) {
  const n = Number(cd);
  if (n >= 1 && n <= 3) return P.e1;
  if (n === 4 || n === 5) return P.e2;
  if (n === 6) return P.e3;
  if (n === 7 || n === 8) return P.e4;
  return null;
}

const chaveSecao = (mun, zona, secao) => `${mun}-${Number(zona)}-${Number(secao)}`;
const originalValido = (o, local) => {
  const n = Number(o);
  return n > 0 && n !== Number(local);
};

// Seção → local usado na votação, a partir do cadastro de locais (uma linha por seção).
export function criarMapaSecoes() {
  const mapa = new Map();
  return {
    adicionar({ mun, zona, secao, local, localOriginal }) {
      mapa.set(chaveSecao(mun, zona, secao), idLocal(mun, zona, originalValido(localOriginal, local) ? localOriginal : local));
    },
    local: (mun, zona, secao) => mapa.get(chaveSecao(mun, zona, secao)) ?? null,
    get tamanho() { return mapa.size; },
  };
}

// Soma por local. Seção ausente do cadastro: fica no local que o próprio CSV de perfil informa.
export function criarSomaPerfil(secoes) {
  const locais = new Map();
  let foraDoCadastro = 0;
  return {
    adicionar({ mun, zona, secao, local, genero: g, faixa, escolaridade: e, qt }) {
      const q = Number(qt) || 0;
      if (!q) return;
      let id = secoes.local(mun, zona, secao);
      if (!id) { foraDoCadastro += q; id = idLocal(mun, zona, local); }
      let v = locais.get(id);
      if (!v) locais.set(id, (v = new Array(TAM).fill(0)));
      v[0] += q;
      for (const k of [genero(g), idade(faixa), escolaridade(e)]) if (k) v[k] += q;
    },
    resultado: () => ({ locais, foraDoCadastro }),
  };
}
