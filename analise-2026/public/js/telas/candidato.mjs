import { agremiacaoDe, idxMunicipio, nomeCurto, locaisDoMunicipio, percentuais, porBairro, porRegiao, rankingNoMunicipio, serie } from "../dados.mjs";
import { concentracao } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { seletorMunicipio } from "../seletor.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { oferta } from "../oferta.mjs";

// Dica de um local de votação com uma linha por candidato.
export function dicaLocal(D, j, linhas) {
  const l = D.locais[j];
  return `<b>${esc(l.nm)}</b><small>${esc(l.bairro ?? "sem bairro")} · ${esc(D.municipios[l.mun].nm)} · ${inteiro(l.aptos)} eleitores · ${inteiro(l.total)} votos nominais</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(j) ?? 0)} (${pct(x.p.get(j) ?? 0)})</span>`).join("<br>");
}

export function dicaMunicipio(D, i, linhas) {
  const m = D.municipios[i];
  return `<b>${esc(m.nm)}</b><small>${m.regiao} · ${inteiro(m.validos)} votos válidos · clique para ver os locais</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(i) ?? 0)} (${pct(x.p.get(i) ?? 0)})</span>`).join("<br>");
}

const nomeLocal = (D, j) => `${esc(D.locais[j].nm)}<br><small>${esc(D.locais[j].bairro ?? "")} · ${esc(D.municipios[D.locais[j].mun].nm)}</small>`;

// Cartão da cidade escolhida: votos, posição e os mais votados ali.
export function cartaoCidade(D, a, i, vMun, pMun) {
  const rk = rankingNoMunicipio(D, i);
  const ag = agremiacaoDe(D, a);
  const pos = rk.findIndex((x) => x.c.n === a.n) + 1;
  const posChapa = rk.filter((x) => ag?.siglas.includes(x.c.sg)).findIndex((x) => x.c.n === a.n) + 1;
  const locais = locaisDoMunicipio(D, i);
  const comVoto = locais.filter((j) => a.loc.some(([k]) => k === j)).length;
  const top = rk.slice(0, 8);
  if (pos > 8) top.push(rk[pos - 1]);
  return `<p><b class="destaque">${inteiro(vMun.get(i) ?? 0)}</b> votos · ${pct(pMun.get(i) ?? 0)} dos válidos ·
    ${pos ? `<b>${pos}º</b> de ${rk.length} candidatos na cidade · ${posChapa}º da chapa ${esc(ag?.rotulo ?? a.sg)}` : "nenhum voto aqui"} ·
    voto em ${comVoto} de ${locais.length} locais</p>
    <div class="ranking-mun espaco">${top.map((x) => `<div class="${x.c.n === a.n ? "destaque" : ""}">${rk.indexOf(x) + 1}º ${esc(x.c.nm)} <small>(${esc(x.c.sg)})</small> — ${inteiro(x.v)}</div>`).join("")}</div>`;
}

// Prévia sem compra: o mapa por município aparece borrado, sem números, sem dica e sem clique; a oferta fica por cima.
// Os votos por local nem são carregados (a rota responde 403 a quem não comprou).
export function montarPrevia(el, { D, geo, foco: a, venda }) {
  el.innerHTML = `
    <div class="cartao previa-mapa">
      <h2>${esc(nomeCurto(a))} · mapa dos votos por município e local de votação</h2>
      <div class="previa-borrado" aria-hidden="true"><div id="pv-mapa"></div></div>
      <div class="previa-sobre">${oferta(a, D, venda, { compacta: true })}</div>
    </div>`;
  const p = percentuais(D, a, "mun");
  const max = Math.max(1e-9, ...p.values());
  const escala = escalaSeq(max, "--laranja");
  criarMapa(el.querySelector("#pv-mapa"), { geo, D }).colorir((i) => (p.get(i) ? escala(p.get(i)) : null));
}

export function montar(el, { D, geo, params, navegar, foco: a }) {
  const modo = params.modo === "pct" ? "pct" : "abs";
  const sel = idxMunicipio(D, params.mun);
  const nomeSel = sel == null ? null : D.municipios[sel].nm;
  const irPara = (i) => navegar({ mun: i == null ? null : D.municipios[i].cd });
  const vMun = serie(a, "mun"), pMun = percentuais(D, a, "mun");
  const vLoc = serie(a, "loc"), pLoc = percentuais(D, a, "loc");
  const cMun = concentracao([...vMun.values()]);
  const cLoc = concentracao([...vLoc.values()]);
  const zeros = D.municipios.length - cMun.n;
  const locaisSel = sel == null ? null : locaisDoMunicipio(D, sel);
  // Bairros: da cidade escolhida, senão da cidade onde o candidato teve mais votos.
  const cidadeBairros = nomeSel ?? (a.mun[0] ? D.municipios[a.mun[0][0]].nm : "CURITIBA");
  el.innerHTML = `
    <div class="controles">
      <span class="seg"><button data-modo="abs" class="${modo === "abs" ? "on" : ""}">Votos</button><button data-modo="pct" class="${modo === "pct" ? "on" : ""}">% dos válidos</button></span>
      <span id="an-sel"></span>
      <small>Clique num município (no mapa ou na tabela) para ver os locais de votação dele.</small>
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>${esc(nomeCurto(a))} · ${inteiro(a.votos)} votos${nomeSel ? ` · ${esc(nomeSel)}` : " por município"}</h2><div id="an-mapa"></div><div id="an-leg"></div><small id="an-semcoord"></small></div>
      <div class="grade" style="align-content:start">
        ${sel == null ? "" : `<div class="cartao"><h2>${esc(nomeSel)}</h2>${cartaoCidade(D, a, sel, vMun, pMun)}</div>`}
        <div class="cartao"><h2>Por região</h2><div id="an-reg"></div></div>
        <div class="cartao"><h2>Concentração</h2><p>
          <b>${cMun.p50}</b> municípios fazem 50% dos votos e <b>${cMun.p80}</b> fazem 80% (de ${cMun.n} com voto).<br>
          <b>${cLoc.p50}</b> locais de votação fazem 50% e <b>${cLoc.p80}</b> fazem 80% (de ${cLoc.n} com voto).<br>
          <b>${zeros}</b> dos ${D.municipios.length} municípios não deram nenhum voto.</p></div>
      </div>
    </div>
    <div class="grade g3 espaco">
      <div class="cartao"><h2>Todos os ${D.municipios.length} municípios</h2><div id="an-tmun" class="rolagem"></div></div>
      <div class="cartao"><h2>${sel == null ? "Top 50 locais de votação" : `Locais de votação em ${esc(nomeSel)} (${locaisSel.length})`}</h2><div id="an-tloc" class="rolagem"></div></div>
      <div class="cartao"><h2>Bairros de ${esc(cidadeBairros)}</h2><div id="an-bairros" class="rolagem"></div></div>
    </div>`;
  el.querySelectorAll("[data-modo]").forEach((b) => { b.onclick = () => navegar({ modo: b.dataset.modo }); });
  seletorMunicipio(el.querySelector("#an-sel"), D, sel, irPara);

  const mapa = criarMapa(el.querySelector("#an-mapa"), { geo, D });
  const valores = modo === "pct" ? pMun : vMun;
  const max = Math.max(1e-9, ...valores.values());
  const escala = escalaSeq(max, "--laranja");
  mapa.colorir((i) => (valores.get(i) ? escala(valores.get(i)) : null));
  legenda(el.querySelector("#an-leg"), {
    cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0", max: modo === "pct" ? pct(max) : inteiro(max), titulo: modo === "pct" ? "% dos válidos" : "votos",
  });
  const maxL = Math.max(1, ...vLoc.values());
  const sem = mapa.pontos([...vLoc].map(([j, v]) => ({ j, raio: 2 + 14 * Math.sqrt(v / maxL), cor: "var(--laranja-2)" })));
  if (sem) el.querySelector("#an-semcoord").textContent = `${sem} locais sem coordenada ficaram fora do mapa.`;
  const linhas = (v, p) => [{ nm: a.nm, v, p, destaque: true }];
  mapa.dicas((i) => dicaMunicipio(D, i, linhas(vMun, pMun)), (j) => dicaLocal(D, j, linhas(vLoc, pLoc)));
  mapa.aoClicar(irPara);
  if (sel != null) mapa.focar(sel);

  barras(el.querySelector("#an-reg"), Object.entries(porRegiao(D, a)).map(([k, v]) => ({ rotulo: k, valor: v, classe: "foco" })),
    { formato: (v) => `${inteiro(v)} · ${a.votos ? pct(v / a.votos, 1) : "—"}` });

  tabela(el.querySelector("#an-tmun"), {
    linhas: D.municipios.map((m, i) => ({ i, v: vMun.get(i) ?? 0, p: pMun.get(i) ?? 0 })), ordem: 2,
    busca: "Buscar município…", aoClicar: (l) => irPara(l.i), classe: (l) => (l.i === sel ? "sel" : ""),
    colunas: [
      { rotulo: "Município", valor: (l) => D.municipios[l.i].nm },
      { rotulo: "Região", valor: (l) => D.municipios[l.i].regiao },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% válidos", valor: (l) => l.p, formato: (v) => pct(v), num: true },
    ],
  });
  const linhasLoc = sel == null
    ? [...vLoc].map(([j, v]) => ({ j, v, p: pLoc.get(j) }))
    : locaisSel.map((j) => ({ j, v: vLoc.get(j) ?? 0, p: pLoc.get(j) ?? 0 }));
  tabela(el.querySelector("#an-tloc"), {
    linhas: linhasLoc, ordem: 1, limite: sel == null ? 50 : Infinity, busca: sel == null ? null : "Buscar local…",
    colunas: [
      { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => nomeLocal(D, l.j) },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
      { rotulo: "Nominais", valor: (l) => D.locais[l.j].total, formato: inteiro, num: true },
    ],
  });
  tabela(el.querySelector("#an-bairros"), {
    linhas: porBairro(D, a, cidadeBairros), ordem: 1,
    colunas: [
      { rotulo: "Bairro", valor: (l) => l.bairro },
      { rotulo: "Votos", valor: (l) => l.votos, formato: inteiro, num: true },
      { rotulo: "% no bairro", valor: (l) => (l.total ? l.votos / l.total : null), formato: (v) => pct(v), num: true },
    ],
  });
}
