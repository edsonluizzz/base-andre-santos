import { CATEGORIAS_RECEITA } from "../config.mjs";
import { agremiacaoDe, chapa, nomeCurto, unidade } from "../dados.mjs";
import { folgaQuociente } from "./panorama.mjs";
import { projetar, quantil, regressaoLog, rsPorVoto } from "../calc.mjs";
import { tabela } from "../tabela.mjs";
import { barras, reduzido } from "../animar.mjs";
import { esc, inteiro, pct, reais, reaisCurto } from "../fmt.mjs";

const CORES_CATS = ["--laranja", "--laranja-2", "--ambar", "--azul", "--roxo", "--rosa", "--barra"];
const porVoto = (v, c) => (!c.votos ? "—" : reais(v));

// Cores e grupo do candidato escolhido (preenchidos em montar).
let CORES = new Map();
const corDe = (c) => CORES.get(c.n) ?? (c.eleito ? "var(--verde)" : "var(--barra)");

// Cartões grandes: quanto cada um pagou por voto, mais a mediana da chapa.
export function medianaChapa(lista, eixo) {
  return quantil(lista.filter((c) => c[eixo] != null && c.votos > 0).map((c) => rsPorVoto(c[eixo], c.votos)), 0.5);
}
function cartoes(el, destaques, lista, rotuloChapa, eixo) {
  const mediana = medianaChapa(lista, eixo);
  el.innerHTML = destaques.map((c) => {
    return `<div class="cartao kpi" style="border-top:3px solid ${CORES.get(c.n)}"><h2>${esc(c.nm)}</h2>
      <b style="color:${CORES.get(c.n)}">${porVoto(rsPorVoto(c[eixo], c.votos), c)}</b>
      <small>por voto · ${reaisCurto(c[eixo])} ÷ ${inteiro(c.votos)} votos</small></div>`;
  }).join("") + `<div class="cartao kpi"><h2>Mediana da chapa ${esc(rotuloChapa)}</h2><b>${reais(mediana || null)}</b><small>por voto · metade da chapa pagou mais que isso</small></div>`;
}

// Para cada candidato, a barra cinza é o dinheiro e a colorida são os votos, um embaixo do outro.
function dinheiroVotos(el, cands, eixo) {
  const maxR = Math.max(1, ...cands.map((c) => c[eixo] ?? 0));
  const maxV = Math.max(1, ...cands.map((c) => c.votos));
  el.innerHTML = `<div class="legenda"><span><span class="chip" style="background:var(--barra)"></span>${eixo === "receita" ? "dinheiro recebido" : "despesa contratada"}</span>
      <span><span class="chip" style="background:var(--laranja)"></span>votos (na cor do candidato; verde = eleito)</span></div>` +
    cands.map((c) => `
      <div class="par-barras">
        <div class="par-nome"><b style="color:${CORES.get(c.n) ?? "var(--texto)"}">${esc(c.nm)}</b><small>${esc(c.sg)} · <b>${porVoto(rsPorVoto(c[eixo], c.votos), c)}</b> por voto</small></div>
        <div class="par-linhas">
          <div class="barra"><span class="trilho"><span class="enche" data-w="${(100 * (c[eixo] ?? 0)) / maxR}" style="background:var(--barra)"></span></span><span class="val">${reaisCurto(c[eixo])}</span></div>
          <div class="barra"><span class="trilho"><span class="enche" data-w="${(100 * c.votos) / maxV}" style="background:${corDe(c)}"></span></span><span class="val">${inteiro(c.votos)} votos</span></div>
        </div>
      </div>`).join("");
  el.offsetWidth; // largura 0 antes de animar
  el.querySelectorAll(".enche").forEach((e, k) => {
    e.style.transitionDelay = reduzido() ? "0s" : `${k * 40}ms`;
    e.style.width = `${e.dataset.w}%`;
  });
}

// Ranking do voto mais barato ao mais caro dentro do grupo.
function ranking(el, grupo, eixo, foco, rotuloGrupo) {
  const rk = grupo.filter((c) => c[eixo] != null && c.votos > 0).map((c) => ({ c, v: rsPorVoto(c[eixo], c.votos) })).sort((a, b) => a.v - b.v);
  const pos = rk.findIndex((x) => x.c.n === foco.n) + 1;
  el.innerHTML = `<p>${esc(nomeCurto(foco))} tem o <b class="destaque">${pos}º</b> voto mais barato de ${rk.length} (${esc(rotuloGrupo)}).</p><div class="espaco"></div>`;
  const alvo = document.createElement("div");
  el.appendChild(alvo);
  barras(alvo, rk.map((x) => ({
    rotulo: x.c.nm, valor: x.v, titulo: `${x.c.nm} (${x.c.sg}) — ${inteiro(x.c.votos)} votos`,
    classe: x.c.n === foco.n ? "foco" : x.c.eleito ? "eleito" : "", cor: x.c.n === foco.n ? null : CORES.get(x.c.n),
  })), { formato: (v) => reais(v) });
}

// Cenários relativos à receita atual, para servir a qualquer candidato.
const MULTIPLOS_CENARIO = [1.5, 2, 3, 5];
const nf2 = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Quanto voto cada real trouxe (ajuste log-log entre candidatos) e o que isso sugere para o candidato.
// É correlação entre candidatos, não efeito causal: candidato popular também arrecada mais.
export function eficienciaVoto(fit, c, eixo) {
  const r0 = c[eixo];
  if (!fit || !r0) return null;
  const previsto = Math.exp(fit.a) * Math.pow(r0, fit.b);
  return { previsto, razao: c.votos / previsto };
}

function cenarios(el, D, andre, eixo, fitPR, fitNovo) {
  const r0 = andre[eixo];
  if (!fitPR || !r0) { el.innerHTML = "<small>Sem dados suficientes para o ajuste.</small>"; return; }
  const previsto = (fit, r) => Math.exp(fit.a) * Math.pow(r, fit.b);
  const eficiencia = andre.votos / previsto(fitPR, r0);
  const b = (fitNovo ?? fitPR).b;
  const ag = agremiacaoDe(D, andre);
  const U = unidade(D);
  // Majoritário não tem quociente: a frase da cadeira seguinte só vale no proporcional.
  const faltaNovo = D.cargo.majoritario ? null : folgaQuociente(D, ag).falta;
  const nome = esc(nomeCurto(andre));
  const mais10 = (fit) => `${nf2((Math.pow(1.1, fit.b) - 1) * 100)}%`;
  const linhas = [r0, ...MULTIPLOS_CENARIO.map((m) => r0 * m)].map((r) => ({
    r, piso: previsto(fitPR, r), cons: projetar(andre.votos, r0, r, b / 2), otim: projetar(andre.votos, r0, r, b),
  }));
  el.innerHTML = `
    <div class="grade g2">
      <div>
        <p>Entre os ${inteiro(fitPR.n)} candidatos a ${esc(D.cargo.nome.toLowerCase())} ${esc(U.daArea)} com ${eixo} declarada, <b>cada 10% a mais de ${eixo} veio com ${mais10(fitPR)} a mais de votos</b>
          (elasticidade ${nf2(fitPR.b)}; a curva explica ${pct(fitPR.r2, 0)} da variação).${fitNovo ? ` Só na chapa ${esc(ag.rotulo)} (${fitNovo.n} candidatos): ${mais10(fitNovo)} (elasticidade ${nf2(fitNovo.b)}).` : ""}</p>
        <p class="espaco">Com ${reais(r0, 0)}, um candidato médio ${esc(U.daArea)} faria cerca de <b>${inteiro(previsto(fitPR, r0))}</b> votos.
          ${nome} fez <b class="destaque">${inteiro(andre.votos)}</b>: <b class="destaque">${nf2(eficiencia)}× o esperado</b> para o dinheiro que teve.</p>
        <p class="espaco"><small>Os cenários ao lado partem dessa relação entre os candidatos — ela não prova que mais dinheiro causa mais voto
          (candidato com mais base também arrecada mais). Use o intervalo, não um número só.
          ${faltaNovo == null ? "" : `Para a ${ag.vagas + 1}ª cadeira, ${esc(ag.rotulo)} precisava de ${inteiro(faltaNovo)} votos a mais na legenda.`}</small></p>
      </div>
      <div id="cu-cen-tab"></div>
    </div>`;
  tabela(el.querySelector("#cu-cen-tab"), {
    linhas, ordem: 0, desc: false,
    classe: (l) => (l.r === r0 ? "foco" : ""),
    colunas: [
      { rotulo: eixo === "receita" ? "Receita" : "Despesa", valor: (l) => l.r, formato: (v) => reaisCurto(v), num: true },
      { rotulo: "Piso (candidato médio)", valor: (l) => l.piso, formato: inteiro, num: true },
      { rotulo: "Conservador", valor: (l) => l.cons, formato: inteiro, num: true },
      { rotulo: "Otimista", valor: (l) => l.otim, formato: inteiro, num: true },
    ],
  });
  el.querySelector("#cu-cen-tab").insertAdjacentHTML("beforeend", `<small>Conservador: metade da elasticidade ${fitNovo ? `da chapa ${esc(ag.rotulo)}` : esc(U.daArea)}, mantendo a base de ${nome}. Otimista: elasticidade inteira, mantendo a eficiência atual. Piso: o que a curva ${esc(U.daArea)} dá para essa receita.</small>`);
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

export function montar(el, { D, params, navegar, interno, foco, comparados, cores }) {
  CORES = cores;
  const eixo = params.eixo === "despesa" ? "despesa" : "receita";
  const ag = agremiacaoDe(D, foco);
  const lista = chapa(D, foco);
  const naChapa = new Set(lista.map((c) => c.n));
  const grupo = [...lista, ...comparados.filter((c) => !naChapa.has(c.n))];
  const destaques = [foco, ...comparados];
  const rotuloGrupo = `chapa ${ag.rotulo}${comparados.length ? " + comparados" : ""}`;
  const comValor = grupo.filter((c) => c[eixo] != null);
  const nome = esc(nomeCurto(foco));
  // Gasto do módulo financeiro (interno.json, só no Mac), por número do candidato.
  const gi = interno?.[foco.n]?.gastoInterno;
  el.innerHTML = `
    <div class="aviso">Custo do voto = <b>receita declarada ÷ votos</b>, assumindo que cada candidato gasta tudo o que arrecadou. ${(D.cargo.ano ?? 2026) < 2026 ? `Valores da prestação de contas final ao TSE (arquivo gerado em ${esc(D.meta.fontes.contas ?? "sem dado")}).` : `Valores da prestação de contas parcial ao TSE (arquivo gerado em ${esc(D.meta.fontes.contas)}); a prestação final sai em novembro.`} A despesa contratada fica como comparação.</div>
    <div class="controles espaco">
      <span class="seg"><button data-eixo="receita" class="${eixo === "receita" ? "on" : ""}">Receita</button><button data-eixo="despesa" class="${eixo === "despesa" ? "on" : ""}">Despesa contratada</button></span>
      ${gi ? `<small>Gasto de ${nome} no módulo financeiro: <b>${reais(gi)}</b> (${reais(rsPorVoto(gi, foco.votos))} por voto) — ${esc(interno[foco.n].fonte)}, ${esc(interno[foco.n].data)}</small>` : ""}
    </div>
    <div id="cu-kpis" class="grade kpis"></div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Dinheiro × votos · ${nome}, comparados e eleitos da chapa</h2><div id="cu-par"></div>
        <small>Ordem: do voto mais barato ao mais caro.${grupo.length - comValor.length ? ` ${grupo.length - comValor.length} do grupo sem ${eixo} declarada ficaram fora.` : ""}</small></div>
      <div class="cartao"><h2>R$ por voto · do mais barato ao mais caro</h2><div id="cu-rank" class="rolagem" style="max-height:560px"></div></div>
    </div>
    <div class="cartao espaco"><h2>Recurso × voto · cenários para ${nome}</h2><div id="cu-cen"></div></div>
    <div class="cartao espaco"><h2>De onde veio o dinheiro</h2><div id="cu-origem"></div></div>
    <div class="cartao espaco"><h2>${esc(rotuloGrupo)} · clique no cabeçalho para ordenar</h2><div id="cu-tab"></div></div>`;
  el.querySelectorAll("[data-eixo]").forEach((b) => { b.onclick = () => navegar({ eixo: b.dataset.eixo }); });
  const pontos = (f) => D.candidatos.filter(f).map((c) => ({ x: c[eixo], y: c.votos }));
  const fitPR = regressaoLog(pontos(() => true));
  const fitChapa = regressaoLog(pontos((c) => naChapa.has(c.n)));
  cartoes(el.querySelector("#cu-kpis"), destaques, lista, ag.rotulo, eixo);
  const destaque = grupo.filter((c) => (cores.has(c.n) || (naChapa.has(c.n) && c.eleito)) && c[eixo] != null && c.votos > 0)
    .sort((a, b) => rsPorVoto(a[eixo], a.votos) - rsPorVoto(b[eixo], b.votos));
  dinheiroVotos(el.querySelector("#cu-par"), destaque, eixo);
  cenarios(el.querySelector("#cu-cen"), D, foco, eixo, fitPR, fitChapa);
  ranking(el.querySelector("#cu-rank"), grupo, eixo, foco, rotuloGrupo);
  origem(el.querySelector("#cu-origem"), destaques);
  tabela(el.querySelector("#cu-tab"), {
    linhas: grupo, ordem: 2, classe: (c) => (c.n === foco.n ? "foco" : ""),
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
