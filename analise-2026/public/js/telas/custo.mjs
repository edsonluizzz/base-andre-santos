import { CATEGORIAS_RECEITA, CORES_IGREJA, FOCO, PARTIDO, RIVAIS_IGREJA } from "../config.mjs";
import { rsPorVoto } from "../calc.mjs";
import { tabela } from "../tabela.mjs";
import { esconderDica, mostrarDica } from "../dica.mjs";
import { reduzido } from "../animar.mjs";
import { esc, inteiro, reais, reaisCurto } from "../fmt.mjs";

const d3 = globalThis.d3;
const CORES_CATS = ["--laranja", "--laranja-2", "--ambar", "--azul", "--roxo", "--rosa", "--barra"];
const porVoto = (v, c) => (!c.votos ? "—" : reais(v));

// Ticks com pelo menos `px` de distância na tela (a escala de raiz junta os valores altos).
function espacados(escala, px) {
  const out = [];
  for (const v of escala.ticks(8)) if (!out.length || escala(v) - escala(out[out.length - 1]) >= px) out.push(v);
  return out;
}

function dispersao(el, pts, eixo) {
  const L = 640, A = 420, m = { t: 16, r: 120, b: 40, l: 64 };
  const x = d3.scaleSqrt().domain([0, d3.max(pts, (c) => c[eixo]) || 1]).range([m.l, L - m.r]).nice();
  const y = d3.scaleSqrt().domain([0, d3.max(pts, (c) => c.votos) || 1]).range([A - m.b, m.t]).nice();
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${L} ${A}`).style("width", "100%");
  svg.append("g").attr("transform", `translate(0,${A - m.b})`).call(d3.axisBottom(x).tickValues(espacados(x, 70)).tickFormat(reaisCurto)).attr("color", "var(--suave)");
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(inteiro)).attr("color", "var(--suave)");
  const corDe = (c) => CORES_IGREJA[c.n] ?? (c.eleito ? "var(--verde)" : "var(--barra)");
  const ms = reduzido() ? 0 : 1200;
  svg.append("g").selectAll("circle").data(pts).join("circle")
    .attr("cx", x(0)).attr("cy", y(0)).attr("r", (c) => (CORES_IGREJA[c.n] ? 7 : 4.5)).style("fill", corDe).style("fill-opacity", 0.9)
    .on("mousemove", (ev, c) => mostrarDica(ev, `<b>${esc(c.nm)}</b>${esc(c.sg)} · ${inteiro(c.votos)} votos<br>${eixo === "receita" ? "Receita" : "Despesa"}: ${reais(c[eixo], 0)}<br>${porVoto(rsPorVoto(c[eixo], c.votos), c)} por voto`))
    .on("mouseleave", esconderDica)
    .transition().duration(ms).delay((c, k) => (ms ? k * 15 : 0))
    .attr("cx", (c) => x(c[eixo])).attr("cy", (c) => y(c.votos));
  svg.append("g").selectAll("text").data(pts.filter((c) => CORES_IGREJA[c.n] || c.eleito)).join("text")
    .attr("x", (c) => (x(c[eixo]) > L - 220 ? x(c[eixo]) - 10 : x(c[eixo]) + 10)).attr("y", (c) => y(c.votos) + 4)
    .attr("text-anchor", (c) => (x(c[eixo]) > L - 220 ? "end" : "start")).text((c) => c.nm)
    .style("fill", "var(--texto)").style("font-size", "11px").style("opacity", 0)
    .transition().delay(ms).duration(ms ? 400 : 0).style("opacity", 1);
}

function origem(el, cands) {
  const max = Math.max(1, ...cands.map((c) => c.receita ?? 0));
  el.innerHTML = `<div class="legenda">${CATEGORIAS_RECEITA.map((k, i) => `<span><span class="chip" style="background:var(${CORES_CATS[i]})"></span>${esc(k)}</span>`).join("")}</div>` +
    cands.map((c) => `
      <div class="empilhada">
        <span class="rot">${esc(c.nm)}</span>
        <span class="trilho">${CATEGORIAS_RECEITA.map((k, i) => {
          const v = c.receitaPorOrigem?.[k];
          return v ? `<span title="${esc(k)}: ${reais(v, 0)}" style="width:${(100 * v) / max}%;background:var(${CORES_CATS[i]})"></span>` : "";
        }).join("")}</span>
        <span class="val">${reais(c.receita, 0)}</span>
      </div>`).join("");
}

export function montar(el, { D, params, navegar, interno }) {
  const eixo = params.eixo === "despesa" ? "despesa" : "receita";
  const grupo = D.candidatos.filter((c) => c.sg === PARTIDO || RIVAIS_IGREJA.includes(c.n));
  const comValor = grupo.filter((c) => c[eixo] != null);
  const andre = D.porNumero.get(FOCO);
  const gi = interno?.andre?.gastoInterno;
  el.innerHTML = `
    <div class="aviso">Valores declarados ao TSE na prestação de contas parcial (arquivo gerado em ${esc(D.meta.fontes.contas)}). A prestação final sai em novembro e os números podem subir. As despesas contratadas ainda estão bem abaixo das receitas; por isso o custo principal usa a <b>receita</b>.</div>
    <div class="controles espaco">
      <span class="seg"><button data-eixo="receita" class="${eixo === "receita" ? "on" : ""}">Receita</button><button data-eixo="despesa" class="${eixo === "despesa" ? "on" : ""}">Despesa contratada</button></span>
      ${gi ? `<small>Gasto do André no módulo financeiro: <b>${reais(gi)}</b> (${reais(rsPorVoto(gi, andre.votos))} por voto) — ${esc(interno.andre.fonte)}, ${esc(interno.andre.data)}</small>` : ""}
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>${eixo === "receita" ? "Receita" : "Despesa contratada"} × votos · NOVO + rivais</h2><div id="cu-disp"></div>
        <small>${grupo.length - comValor.length ? `${grupo.length - comValor.length} candidato(s) sem ${eixo} declarada ficaram fora do gráfico.` : ""}</small></div>
      <div class="cartao"><h2>De onde veio o dinheiro</h2><div id="cu-origem"></div></div>
    </div>
    <div class="cartao espaco"><h2>Chapa do NOVO + rivais da igreja · clique no cabeçalho para ordenar</h2><div id="cu-tab"></div></div>`;
  el.querySelectorAll("[data-eixo]").forEach((b) => { b.onclick = () => navegar({ eixo: b.dataset.eixo }); });
  dispersao(el.querySelector("#cu-disp"), comValor, eixo);
  origem(el.querySelector("#cu-origem"), [FOCO, ...RIVAIS_IGREJA].map((n) => D.porNumero.get(n)));
  tabela(el.querySelector("#cu-tab"), {
    linhas: grupo, ordem: 2, classe: (c) => (c.n === FOCO ? "foco" : ""),
    colunas: [
      { rotulo: "Candidato", valor: (c) => c.nm },
      { rotulo: "Partido", valor: (c) => c.sg },
      { rotulo: "Votos", valor: (c) => c.votos, formato: inteiro, num: true },
      { rotulo: "Receita", valor: (c) => c.receita, formato: (v) => reais(v, 0), num: true },
      { rotulo: "R$/voto (receita)", valor: (c) => rsPorVoto(c.receita, c.votos), formato: porVoto, num: true },
      { rotulo: "Despesa contratada", valor: (c) => c.despesa, formato: (v) => reais(v, 0), num: true },
      { rotulo: "R$/voto (despesa)", valor: (c) => rsPorVoto(c.despesa, c.votos), formato: porVoto, num: true },
      { rotulo: "Situação", valor: (c) => c.st },
    ],
  });
}
