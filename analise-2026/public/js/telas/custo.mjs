import { CATEGORIAS_RECEITA, CORES_IGREJA, FOCO, PARTIDO, RIVAIS_IGREJA } from "../config.mjs";
import { quantil, rsPorVoto } from "../calc.mjs";
import { tabela } from "../tabela.mjs";
import { esconderDica, mostrarDica } from "../dica.mjs";
import { barras, reduzido } from "../animar.mjs";
import { esc, inteiro, reais, reaisCurto } from "../fmt.mjs";

const d3 = globalThis.d3;
const CORES_CATS = ["--laranja", "--laranja-2", "--ambar", "--azul", "--roxo", "--rosa", "--barra"];
const porVoto = (v, c) => (!c.votos ? "—" : reais(v));

// Ticks com pelo menos `px` de distância na tela.
function espacados(escala, px) {
  const out = [];
  for (const v of escala.ticks(10)) if (!out.length || Math.abs(escala(v) - escala(out[out.length - 1])) >= px) out.push(v);
  return out;
}

const CUSTOS = [2, 5, 10, 25, 50, 100, 250]; // linhas de "R$ por voto" constante

// Dispersão em escala log: todos os estaduais do PR ao fundo, NOVO e rivais em destaque e
// diagonais de custo igual (acima da linha = voto mais barato que aquele valor).
function dispersao(el, todos, grupo, eixo) {
  const pts = todos.filter((c) => c[eixo] > 0 && c.votos > 0);
  const noGrupo = new Set(grupo.map((c) => c.n));
  const L = 760, A = 500, m = { t: 14, r: 20, b: 44, l: 64 };
  // corta a cauda de baixo (candidatos com poucas centenas de reais ou votos) para não espremer o gráfico
  const x = d3.scaleLog().domain([quantil(pts.map((c) => c[eixo]), 0.05), d3.max(pts, (c) => c[eixo])]).range([m.l, L - m.r]).nice();
  const y = d3.scaleLog().domain([quantil(pts.map((c) => c.votos), 0.05), d3.max(pts, (c) => c.votos)]).range([A - m.b, m.t]).nice();
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${L} ${A}`).style("width", "100%");
  const idClip = `clip-${Math.random().toString(36).slice(2)}`;
  svg.append("clipPath").attr("id", idClip).append("rect").attr("x", m.l).attr("y", m.t).attr("width", L - m.l - m.r).attr("height", A - m.t - m.b);
  svg.append("g").attr("transform", `translate(0,${A - m.b})`).call(d3.axisBottom(x).tickValues(espacados(x, 70)).tickFormat(reaisCurto)).attr("color", "var(--suave)");
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(espacados(y, 40)).tickFormat(inteiro)).attr("color", "var(--suave)");
  svg.append("text").attr("x", L - m.r).attr("y", A - 6).attr("text-anchor", "end").style("fill", "var(--suave)").style("font-size", "11px").text(eixo === "receita" ? "receita declarada (log)" : "despesa contratada (log)");
  svg.append("text").attr("transform", `translate(12,${(A - m.b + m.t) / 2}) rotate(-90)`).attr("text-anchor", "middle").style("fill", "var(--suave)").style("font-size", "11px").text("votos (log)");

  const [x0, x1] = x.domain();
  const [y0, y1] = y.domain();
  const linhas = svg.append("g").attr("clip-path", `url(#${idClip})`);
  for (const custo of CUSTOS) {
    linhas.append("line").attr("x1", x(x0)).attr("y1", y(x0 / custo)).attr("x2", x(x1)).attr("y2", y(x1 / custo))
      .style("stroke", "var(--borda)").style("stroke-dasharray", "4 4");
    // rótulo inclinado sobre a linha, um pouco depois de ela entrar no gráfico por baixo ou pela esquerda
    const xe = Math.max(x0, y0 * custo) * 1.6;
    if (xe > x1 || xe / custo > y1) continue;
    const ang = (Math.atan2(y(xe * 10 / custo) - y(xe / custo), x(xe * 10) - x(xe)) * 180) / Math.PI;
    svg.append("text").attr("transform", `translate(${x(xe)},${y(xe / custo) - 4}) rotate(${ang})`)
      .style("fill", "var(--suave)").style("font-size", "10px").text(`R$ ${custo}/voto`);
  }

  const destaque = (c) => CORES_IGREJA[c.n];
  const corDe = (c) => destaque(c) ?? (c.eleito ? "var(--verde)" : noGrupo.has(c.n) ? "var(--barra-2, var(--barra))" : "var(--barra)");
  const raio = (c) => (destaque(c) ? 7 : noGrupo.has(c.n) ? 4.5 : 2.5);
  const opac = (c) => (destaque(c) || noGrupo.has(c.n) ? 0.95 : 0.35);
  const ordem = [...pts].sort((a, b) => raio(a) - raio(b)); // destaques por cima
  const ms = reduzido() ? 0 : 1100;
  svg.append("g").attr("clip-path", `url(#${idClip})`).selectAll("circle").data(ordem).join("circle")
    .attr("cx", x(x0)).attr("cy", y(y0)).attr("r", raio).style("fill", corDe).style("fill-opacity", opac)
    .style("stroke", (c) => (noGrupo.has(c.n) ? "var(--fundo)" : "none"))
    .on("mousemove", (ev, c) => mostrarDica(ev, `<b>${esc(c.nm)}</b>${esc(c.sg)} · ${inteiro(c.votos)} votos · ${esc(c.st)}<br>${eixo === "receita" ? "Receita" : "Despesa"}: ${reais(c[eixo], 0)}<br><b>${porVoto(rsPorVoto(c[eixo], c.votos), c)}</b> por voto`))
    .on("mouseleave", esconderDica)
    .transition().duration(ms).delay((c, k) => (ms ? Math.min(k * 2, 700) : 0))
    .attr("cx", (c) => x(c[eixo])).attr("cy", (c) => y(c.votos));
  // rótulos afastados verticalmente quando ficariam um em cima do outro
  const rotulados = pts.filter((c) => destaque(c) || (noGrupo.has(c.n) && c.eleito))
    .map((c) => ({ c, x: x(c[eixo]), y: y(c.votos) + 4, dir: x(c[eixo]) > L - 200 }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < rotulados.length; i++) {
    const ant = rotulados[i - 1], r = rotulados[i];
    if (Math.abs(r.x - ant.x) < 220 && r.y - ant.y < 13) r.y = ant.y + 13;
  }
  svg.append("g").selectAll("text").data(rotulados).join("text")
    .attr("x", (r) => (r.dir ? r.x - 10 : r.x + 10)).attr("y", (r) => r.y)
    .attr("text-anchor", (r) => (r.dir ? "end" : "start")).text((r) => r.c.nm)
    .style("fill", (r) => destaque(r.c) ?? "var(--texto)").style("font-size", "11px").style("font-weight", 700).style("opacity", 0)
    .transition().delay(ms).duration(ms ? 400 : 0).style("opacity", 1);
}

// Ranking do voto mais barato ao mais caro dentro do grupo.
function ranking(el, grupo, eixo) {
  const rk = grupo.filter((c) => c[eixo] != null && c.votos > 0).map((c) => ({ c, v: rsPorVoto(c[eixo], c.votos) })).sort((a, b) => a.v - b.v);
  const pos = rk.findIndex((x) => x.c.n === FOCO) + 1;
  el.innerHTML = `<p>André tem o <b class="destaque">${pos}º</b> voto mais barato de ${rk.length} (NOVO + rivais).</p><div class="espaco"></div>`;
  const alvo = document.createElement("div");
  el.appendChild(alvo);
  barras(alvo, rk.map((x) => ({
    rotulo: x.c.nm, valor: x.v, titulo: `${x.c.nm} (${x.c.sg}) — ${inteiro(x.c.votos)} votos`,
    classe: x.c.n === FOCO ? "foco" : x.c.eleito ? "eleito" : "", cor: x.c.n === FOCO ? null : CORES_IGREJA[x.c.n],
  })), { formato: (v) => reais(v) });
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
    <div class="aviso">Custo do voto = <b>receita declarada ÷ votos</b>, assumindo que cada candidato gasta tudo o que arrecadou. Valores da prestação de contas parcial ao TSE (arquivo gerado em ${esc(D.meta.fontes.contas)}); a prestação final sai em novembro. A despesa contratada fica como comparação.</div>
    <div class="controles espaco">
      <span class="seg"><button data-eixo="receita" class="${eixo === "receita" ? "on" : ""}">Receita</button><button data-eixo="despesa" class="${eixo === "despesa" ? "on" : ""}">Despesa contratada</button></span>
      ${gi ? `<small>Gasto do André no módulo financeiro: <b>${reais(gi)}</b> (${reais(rsPorVoto(gi, andre.votos))} por voto) — ${esc(interno.andre.fonte)}, ${esc(interno.andre.data)}</small>` : ""}
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>${eixo === "receita" ? "Receita" : "Despesa contratada"} × votos · todos os estaduais do PR</h2><div id="cu-disp"></div>
        <small><span class="chip" style="background:var(--barra)"></span>outros candidatos do PR · <span class="chip" style="background:var(--verde)"></span>eleitos · NOVO com borda · André e rivais nas cores deles.
        Linhas tracejadas: custo igual por voto (acima da linha = mais barato).${grupo.length - comValor.length ? ` ${grupo.length - comValor.length} do grupo sem ${eixo} declarada ficaram fora.` : ""}</small></div>
      <div class="cartao"><h2>R$ por voto · do mais barato ao mais caro</h2><div id="cu-rank" class="rolagem" style="max-height:560px"></div></div>
    </div>
    <div class="cartao espaco"><h2>De onde veio o dinheiro</h2><div id="cu-origem"></div></div>
    <div class="cartao espaco"><h2>Chapa do NOVO + rivais da igreja · clique no cabeçalho para ordenar</h2><div id="cu-tab"></div></div>`;
  el.querySelectorAll("[data-eixo]").forEach((b) => { b.onclick = () => navegar({ eixo: b.dataset.eixo }); });
  dispersao(el.querySelector("#cu-disp"), D.candidatos, grupo, eixo);
  ranking(el.querySelector("#cu-rank"), grupo, eixo);
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
