import { CORES_IGREJA, FOCO, RIVAIS_IGREJA } from "../config.mjs";
import { percentuais, porRegiao, serie } from "../dados.mjs";
import { sobreposicao, vencedor } from "../calc.mjs";
import { criarMapa } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { dicaLocal, dicaMunicipio } from "./andre.mjs";

export function montar(el, { D, geo, params, navegar }) {
  const nivel = params.nivel === "loc" ? "loc" : "mun";
  const un = nivel === "loc" ? "locais" : "municípios";
  const cands = [FOCO, ...RIVAIS_IGREJA].map((n) => D.porNumero.get(n));
  const series = cands.map((c) => ({ n: c.n, mapa: serie(c, nivel) }));
  const venc = vencedor(series);
  const vitorias = (n) => [...venc.values()].filter((w) => w.n === n).length;
  const curto = (c) => (c.n === FOCO ? "André" : c.nm.replace("CANTORA ", "").split(" ")[0]);

  el.innerHTML = `
    <div class="controles">
      <span class="seg"><button data-nivel="mun" class="${nivel === "mun" ? "on" : ""}">Municípios</button><button data-nivel="loc" class="${nivel === "loc" ? "on" : ""}">Locais de votação</button></span>
      ${cands.map((c) => `<span><span class="chip" style="background:${CORES_IGREJA[c.n]}"></span>${esc(c.nm)} (${esc(c.sg)}) · ${inteiro(c.votos)} votos · lidera em ${inteiro(vitorias(c.n))} ${un}</span>`).join("")}
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>Quem teve mais votos em cada ${nivel === "loc" ? "local" : "município"}, entre os quatro</h2><div id="ig-mapa"></div>
        <small>Sem cor: nenhum dos quatro teve voto. Cinza: empate no primeiro lugar.</small></div>
      <div class="grade" style="align-content:start">
        <div class="cartao"><h2>Votos por região</h2><div id="ig-reg"></div></div>
        <div class="cartao"><h2>Sobreposição de bases (locais de votação)</h2><div id="ig-sob"></div>
          <small>Cada linha: % dos votos daquele candidato que estão em locais onde o da coluna também teve voto.</small></div>
      </div>
    </div>
    <div class="grade g3 espaco">${RIVAIS_IGREJA.map((n) =>
      `<div class="cartao"><h2>Onde ${esc(D.porNumero.get(n).nm)} foi mais forte</h2><div id="ig-top-${n}" class="rolagem"></div></div>`).join("")}</div>`;
  el.querySelectorAll("[data-nivel]").forEach((x) => { x.onclick = () => navegar({ nivel: x.dataset.nivel }); });

  const corVenc = (w) => (!w ? null : w.n ? CORES_IGREJA[w.n] : "var(--barra)");
  const linhasDica = cands.map((c) => ({ nm: c.nm, v: serie(c, nivel), p: percentuais(D, c, nivel), destaque: c.n === FOCO }));
  const mapa = criarMapa(el.querySelector("#ig-mapa"), { geo, D });
  if (nivel === "mun") {
    mapa.colorir((i) => corVenc(venc.get(i)));
    mapa.dicas((i) => dicaMunicipio(D, i, linhasDica), null);
  } else {
    mapa.colorir(() => null);
    const soma = (j) => series.reduce((s, x) => s + (x.mapa.get(j) ?? 0), 0);
    const maxS = Math.max(1, ...[...venc.keys()].map(soma));
    mapa.pontos([...venc].map(([j, w]) => ({ j, raio: 1.5 + 9 * Math.sqrt(soma(j) / maxS), cor: corVenc(w) })), { semLimiar: true });
    mapa.dicas((i) => `<b>${esc(D.municipios[i].nm)}</b>`, (j) => dicaLocal(D, j, linhasDica));
  }

  const regioes = cands.map((c) => porRegiao(D, c));
  const maxReg = Math.max(1, ...regioes.flatMap((r) => Object.values(r)));
  barras(el.querySelector("#ig-reg"), Object.keys(regioes[0]).flatMap((reg) => cands.map((c, k) => ({
    rotulo: `${reg} · ${curto(c)}`, valor: regioes[k][reg], cor: CORES_IGREJA[c.n], titulo: `${c.nm} em ${reg}`,
  }))), { formato: inteiro, max: maxReg });

  const sl = cands.map((c) => serie(c, "loc"));
  el.querySelector("#ig-sob").innerHTML = `<table><thead><tr><th></th>${cands.map((c) => `<th class="n">${esc(curto(c))}</th>`).join("")}</tr></thead><tbody>${
    cands.map((c, i) => `<tr><td><span class="chip" style="background:${CORES_IGREJA[c.n]}"></span>${esc(curto(c))}</td>${
      cands.map((_, j) => `<td class="n">${i === j ? "—" : pct(sobreposicao(sl[i], sl[j]).fracA, 0)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const vAndre = serie(D.porNumero.get(FOCO), "loc");
  for (const n of RIVAIS_IGREJA) {
    const c = D.porNumero.get(n);
    const p = percentuais(D, c, "loc");
    tabela(el.querySelector(`#ig-top-${n}`), {
      linhas: [...serie(c, "loc")].map(([j, v]) => ({ j, v, p: p.get(j), a: vAndre.get(j) ?? 0 })), ordem: 1, limite: 15,
      colunas: [
        { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")} · ${esc(D.municipios[D.locais[l.j].mun].nm)}</small>` },
        { rotulo: `Votos ${curto(c)}`, valor: (l) => l.v, formato: inteiro, num: true },
        { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
        { rotulo: "Votos André", valor: (l) => l.a, formato: inteiro, num: true },
      ],
    });
  }
}
