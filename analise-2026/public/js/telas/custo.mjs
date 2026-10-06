import { CATEGORIAS_RECEITA, CORES_IGREJA, FOCO, PARTIDO, RIVAIS_IGREJA } from "../config.mjs";
import { projetar, quantil, regressaoLog, rsPorVoto } from "../calc.mjs";
import { tabela } from "../tabela.mjs";
import { barras, reduzido } from "../animar.mjs";
import { esc, inteiro, pct, reais, reaisCurto } from "../fmt.mjs";

const CORES_CATS = ["--laranja", "--laranja-2", "--ambar", "--azul", "--roxo", "--rosa", "--barra"];
const porVoto = (v, c) => (!c.votos ? "—" : reais(v));

const corDe = (c) => CORES_IGREJA[c.n] ?? (c.eleito ? "var(--verde)" : "var(--barra)");

// Cartões grandes: quanto cada um pagou por voto, mais a mediana da chapa do NOVO.
function cartoes(el, D, grupo, eixo) {
  const mediana = quantil(grupo.filter((c) => c.sg === PARTIDO && c[eixo] != null && c.votos > 0).map((c) => rsPorVoto(c[eixo], c.votos)), 0.5);
  el.innerHTML = [FOCO, ...RIVAIS_IGREJA].map((n) => {
    const c = D.porNumero.get(n);
    return `<div class="cartao kpi" style="border-top:3px solid ${CORES_IGREJA[n]}"><h2>${esc(c.nm)}</h2>
      <b style="color:${CORES_IGREJA[n]}">${porVoto(rsPorVoto(c[eixo], c.votos), c)}</b>
      <small>por voto · ${reaisCurto(c[eixo])} ÷ ${inteiro(c.votos)} votos</small></div>`;
  }).join("") + `<div class="cartao kpi"><h2>Mediana da chapa do NOVO</h2><b>${reais(mediana || null)}</b><small>por voto · metade da chapa pagou mais que isso</small></div>`;
}

// Para cada candidato, a barra cinza é o dinheiro e a colorida são os votos, um embaixo do outro.
function dinheiroVotos(el, cands, eixo) {
  const maxR = Math.max(1, ...cands.map((c) => c[eixo] ?? 0));
  const maxV = Math.max(1, ...cands.map((c) => c.votos));
  el.innerHTML = `<div class="legenda"><span><span class="chip" style="background:var(--barra)"></span>${eixo === "receita" ? "dinheiro recebido" : "despesa contratada"}</span>
      <span><span class="chip" style="background:var(--laranja)"></span>votos (na cor do candidato; verde = eleito)</span></div>` +
    cands.map((c) => `
      <div class="par-barras">
        <div class="par-nome"><b style="color:${CORES_IGREJA[c.n] ?? "var(--texto)"}">${esc(c.nm)}</b><small>${esc(c.sg)} · <b>${porVoto(rsPorVoto(c[eixo], c.votos), c)}</b> por voto</small></div>
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

const RECEITAS_CENARIO = [200e3, 300e3, 500e3, 800e3, 1e6];
const nf2 = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Quanto voto cada real trouxe (ajuste log-log entre candidatos) e o que isso sugere para o André.
// É correlação entre candidatos, não efeito causal: candidato popular também arrecada mais.
function cenarios(el, D, andre, eixo, fitPR, fitNovo) {
  const r0 = andre[eixo];
  if (!fitPR || !r0) { el.innerHTML = "<small>Sem dados suficientes para o ajuste.</small>"; return; }
  const previsto = (fit, r) => Math.exp(fit.a) * Math.pow(r, fit.b);
  const eficiencia = andre.votos / previsto(fitPR, r0);
  const b = (fitNovo ?? fitPR).b;
  const ag = D.agremiacoes.find((a) => a.siglas.includes(PARTIDO));
  const faltaNovo = (ag.vagas + 1) * D.cargo.qe - (ag.nominais + ag.legenda);
  const mais10 = (fit) => `${nf2((Math.pow(1.1, fit.b) - 1) * 100)}%`;
  const linhas = [r0, ...RECEITAS_CENARIO.filter((r) => r > r0)].map((r) => ({
    r, piso: previsto(fitPR, r), cons: projetar(andre.votos, r0, r, b / 2), otim: projetar(andre.votos, r0, r, b),
  }));
  el.innerHTML = `
    <div class="grade g2">
      <div>
        <p>Entre os ${inteiro(fitPR.n)} estaduais do PR com ${eixo} declarada, <b>cada 10% a mais de ${eixo} veio com ${mais10(fitPR)} a mais de votos</b>
          (elasticidade ${nf2(fitPR.b)}; a curva explica ${pct(fitPR.r2, 0)} da variação).${fitNovo ? ` Só no NOVO (${fitNovo.n} candidatos): ${mais10(fitNovo)} (elasticidade ${nf2(fitNovo.b)}).` : ""}</p>
        <p class="espaco">Com ${reais(r0, 0)}, um candidato médio do PR faria cerca de <b>${inteiro(previsto(fitPR, r0))}</b> votos.
          O André fez <b class="destaque">${inteiro(andre.votos)}</b> — <b class="destaque">${nf2(eficiencia)}× o esperado</b> para o dinheiro que teve.</p>
        <p class="espaco"><small>Os cenários ao lado partem dessa relação entre os candidatos — ela não prova que mais dinheiro causa mais voto
          (candidato com mais base também arrecada mais). Use o intervalo, não um número só.
          Para a ${ag.vagas + 1}ª cadeira o NOVO precisava de ${inteiro(faltaNovo)} votos a mais na legenda.</small></p>
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
  el.querySelector("#cu-cen-tab").insertAdjacentHTML("beforeend", `<small>Conservador: metade da elasticidade do ${fitNovo ? "NOVO" : "PR"}, mantendo a base do André. Otimista: elasticidade inteira, mantendo a eficiência atual dele. Piso: o que a curva do PR dá para essa receita.</small>`);
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
    <div id="cu-kpis" class="grade kpis"></div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Dinheiro × votos · André, rivais e eleitos do NOVO</h2><div id="cu-par"></div>
        <small>Ordem: do voto mais barato ao mais caro.${grupo.length - comValor.length ? ` ${grupo.length - comValor.length} do grupo sem ${eixo} declarada ficaram fora.` : ""}</small></div>
      <div class="cartao"><h2>R$ por voto · do mais barato ao mais caro</h2><div id="cu-rank" class="rolagem" style="max-height:560px"></div></div>
    </div>
    <div class="cartao espaco"><h2>Recurso × voto · cenários para o André</h2><div id="cu-cen"></div></div>
    <div class="cartao espaco"><h2>De onde veio o dinheiro</h2><div id="cu-origem"></div></div>
    <div class="cartao espaco"><h2>Chapa do NOVO + rivais da igreja · clique no cabeçalho para ordenar</h2><div id="cu-tab"></div></div>`;
  el.querySelectorAll("[data-eixo]").forEach((b) => { b.onclick = () => navegar({ eixo: b.dataset.eixo }); });
  const pontos = (f) => D.candidatos.filter(f).map((c) => ({ x: c[eixo], y: c.votos }));
  const fitPR = regressaoLog(pontos(() => true));
  const fitNovo = regressaoLog(pontos((c) => c.sg === PARTIDO));
  cartoes(el.querySelector("#cu-kpis"), D, grupo, eixo);
  const destaque = grupo.filter((c) => (c.n === FOCO || RIVAIS_IGREJA.includes(c.n) || (c.sg === PARTIDO && c.eleito)) && c[eixo] != null && c.votos > 0)
    .sort((a, b) => rsPorVoto(a[eixo], a.votos) - rsPorVoto(b[eixo], b.votos));
  dinheiroVotos(el.querySelector("#cu-par"), destaque, eixo);
  cenarios(el.querySelector("#cu-cen"), D, andre, eixo, fitPR, fitNovo);
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
