import { esc } from "./fmt.mjs";
import { esconderDica, mostrarDica } from "./dica.mjs";
import { reduzido } from "./animar.mjs";

const d3 = globalThis.d3;
const LIMIAR_PONTOS = 2.5; // zoom a partir do qual os locais de votação aparecem

export const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export function escalaSeq(max, nomeVar) {
  const s = d3.scaleSequentialSqrt(d3.interpolateRgb(cor("--mapa-vazio"), cor(nomeVar))).domain([0, max || 1]).clamp(true);
  return (v) => s(0.06 * (max || 1) + 0.94 * v); // valor positivo pequeno já aparece tingido
}

export function escalaDiv(lim) {
  const s = d3.scaleDivergingSqrt(d3.interpolateRgbBasis([cor("--azul"), cor("--mapa-vazio"), cor("--laranja")])).domain([-lim, 0, lim]).clamp(true);
  return (d) => s(d);
}

export function legenda(el, { cores, min, max, titulo }) {
  el.innerHTML = `<div class="legenda"><span>${esc(titulo)}</span><span>${esc(min)}</span><span class="grad" style="background:linear-gradient(90deg,${cores.join(",")})"></span><span>${esc(max)}</span></div>`;
}

// Botões sobre o mapa: ampliar o cartão, tela cheia e voltar ao estado inteiro.
function botoes(el, zerar) {
  const barra = document.createElement("div");
  barra.className = "mapa-botoes";
  barra.innerHTML = `<button type="button" data-acao="ampliar" title="Ampliar o mapa">⤢</button><button type="button" data-acao="cheia" title="Tela cheia">⛶</button><button type="button" data-acao="zerar" title="Ver o Paraná inteiro">⟲</button>`;
  barra.addEventListener("click", (ev) => {
    const acao = ev.target.closest("button")?.dataset.acao;
    const cartao = el.closest(".cartao") ?? el;
    if (acao === "ampliar") cartao.classList.toggle("ampliado");
    if (acao === "cheia") {
      if (document.fullscreenElement) document.exitFullscreen();
      else cartao.requestFullscreen?.();
    }
    if (acao === "zerar") zerar();
  });
  el.appendChild(barra);
}

export function criarMapa(el, { geo, D }) {
  el.classList.add("mapa");
  const L = 800, A = 600;
  const proj = d3.geoMercator().fitSize([L, A], geo);
  const caminho = d3.geoPath(proj);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${L} ${A}`);
  const g = svg.append("g");
  const munIdx = (f) => D.munPorIbge.get(f.properties.codarea);
  const areas = g.append("g").selectAll("path").data(geo.features).join("path")
    .attr("d", caminho).style("fill", "var(--mapa-vazio)");
  const contorno = g.append("path").attr("class", "contorno-sel").style("display", "none");
  const camadaPontos = g.append("g");
  let clique = null;
  areas.on("click", (ev, f) => { if (!ev.defaultPrevented) clique?.(munIdx(f)); });
  const xy = new Map();
  const posicao = (j) => {
    if (!xy.has(j)) xy.set(j, proj([D.locais[j].lon, D.locais[j].lat]));
    return xy.get(j);
  };
  let k = 1, pontos = [], semLimiar = false, htmlMun = null, htmlLoc = null, sincronizando = false;
  const ouvintes = [];

  areas.on("mousemove", (ev, f) => mostrarDica(ev, htmlMun?.(munIdx(f)))).on("mouseleave", esconderDica);

  function desenharPontos() {
    const visiveis = semLimiar || k >= LIMIAR_PONTOS ? pontos : [];
    camadaPontos.selectAll("circle").data(visiveis, (p) => p.j).join("circle")
      .attr("cx", (p) => posicao(p.j)[0]).attr("cy", (p) => posicao(p.j)[1])
      .attr("r", (p) => p.raio / Math.pow(k, 0.8)).style("fill", (p) => p.cor)
      .on("mousemove", (ev, p) => mostrarDica(ev, htmlLoc?.(p.j))).on("mouseleave", esconderDica);
  }

  const zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[0, 0], [L, A]]).on("zoom", (ev) => {
    g.attr("transform", ev.transform);
    k = ev.transform.k;
    desenharPontos();
    if (!sincronizando) ouvintes.forEach((fn) => fn(ev.transform));
  });
  svg.call(zoom);
  const irPara = (t) => svg.transition().duration(reduzido() ? 0 : 750).call(zoom.transform, t);
  botoes(el, () => irPara(d3.zoomIdentity));
  const destacar = (i) => {
    const f = i == null ? null : geo.features.find((x) => munIdx(x) === i);
    contorno.datum(f).attr("d", f ? caminho : null).style("display", f ? null : "none");
    return f;
  };

  return {
    destacar,
    // Zoom no município (null = Paraná inteiro) e contorno em destaque.
    focar(i) {
      const f = destacar(i);
      if (!f) { irPara(d3.zoomIdentity); return; }
      const [[x0, y0], [x1, y1]] = caminho.bounds(f);
      const kz = Math.min(40, 0.85 / Math.max((x1 - x0) / L, (y1 - y0) / A));
      irPara(d3.zoomIdentity.translate(L / 2, A / 2).scale(kz).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    },
    aoClicar(fn) { clique = fn; },
    colorir(fn) {
      areas.style("fill", (f) => {
        const i = munIdx(f);
        return (i == null ? null : fn(i)) ?? "var(--mapa-vazio)";
      });
    },
    pontos(lista, opcoes = {}) {
      semLimiar = !!opcoes.semLimiar;
      pontos = lista.filter((p) => D.locais[p.j].lat != null).sort((a, b) => b.raio - a.raio);
      desenharPontos();
      return lista.length - pontos.length;
    },
    dicas(fMun, fLoc) { htmlMun = fMun; htmlLoc = fLoc; },
    aoZoom(fn) { ouvintes.push(fn); },
    aplicarZoom(t) {
      sincronizando = true;
      svg.call(zoom.transform, t);
      sincronizando = false;
    },
  };
}
