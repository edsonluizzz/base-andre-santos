import { FOCO } from "../config.mjs";
import { percentuais, porBairro, porRegiao, serie } from "../dados.mjs";
import { concentracao } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Dica de um local de votação com uma linha por candidato.
export function dicaLocal(D, j, linhas) {
  const l = D.locais[j];
  return `<b>${esc(l.nm)}</b><small>${esc(l.bairro ?? "sem bairro")} · ${esc(D.municipios[l.mun].nm)} · ${inteiro(l.aptos)} eleitores · ${inteiro(l.total)} votos nominais</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(j) ?? 0)} (${pct(x.p.get(j) ?? 0)})</span>`).join("<br>");
}

export function dicaMunicipio(D, i, linhas) {
  const m = D.municipios[i];
  return `<b>${esc(m.nm)}</b><small>${m.regiao} · ${inteiro(m.validos)} votos válidos</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(i) ?? 0)} (${pct(x.p.get(i) ?? 0)})</span>`).join("<br>");
}

export function montar(el, { D, geo, params, navegar }) {
  const a = D.porNumero.get(FOCO);
  const modo = params.modo === "pct" ? "pct" : "abs";
  const vMun = serie(a, "mun"), pMun = percentuais(D, a, "mun");
  const vLoc = serie(a, "loc"), pLoc = percentuais(D, a, "loc");
  const cMun = concentracao([...vMun.values()]);
  const cLoc = concentracao([...vLoc.values()]);
  const zeros = D.municipios.length - cMun.n;
  el.innerHTML = `
    <div class="controles">
      <span class="seg"><button data-modo="abs" class="${modo === "abs" ? "on" : ""}">Votos</button><button data-modo="pct" class="${modo === "pct" ? "on" : ""}">% dos válidos</button></span>
      <small>Role o mouse sobre o mapa ou dê zoom: os locais de votação aparecem como círculos.</small>
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>André Santos · ${inteiro(a.votos)} votos por município</h2><div id="an-mapa"></div><div id="an-leg"></div><small id="an-semcoord"></small></div>
      <div class="grade" style="align-content:start">
        <div class="cartao"><h2>Por região</h2><div id="an-reg"></div></div>
        <div class="cartao"><h2>Concentração</h2><p>
          <b>${cMun.p50}</b> municípios fazem 50% dos votos e <b>${cMun.p80}</b> fazem 80% (de ${cMun.n} com voto).<br>
          <b>${cLoc.p50}</b> locais de votação fazem 50% e <b>${cLoc.p80}</b> fazem 80% (de ${cLoc.n} com voto).<br>
          <b>${zeros}</b> dos ${D.municipios.length} municípios não deram nenhum voto.</p></div>
      </div>
    </div>
    <div class="grade g3 espaco">
      <div class="cartao"><h2>Top 20 municípios</h2><div id="an-tmun" class="rolagem"></div></div>
      <div class="cartao"><h2>Top 20 locais de votação</h2><div id="an-tloc" class="rolagem"></div></div>
      <div class="cartao"><h2>Bairros de Curitiba</h2><div id="an-bairros" class="rolagem"></div></div>
    </div>`;
  el.querySelectorAll("[data-modo]").forEach((b) => { b.onclick = () => navegar({ modo: b.dataset.modo }); });

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

  barras(el.querySelector("#an-reg"), Object.entries(porRegiao(D, a)).map(([k, v]) => ({ rotulo: k, valor: v, classe: "foco" })),
    { formato: (v) => `${inteiro(v)} · ${pct(v / a.votos, 1)}` });

  tabela(el.querySelector("#an-tmun"), {
    linhas: [...vMun].map(([i, v]) => ({ i, v, p: pMun.get(i) })), ordem: 1, limite: 20,
    colunas: [
      { rotulo: "Município", valor: (l) => D.municipios[l.i].nm },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% válidos", valor: (l) => l.p, formato: (v) => pct(v), num: true },
    ],
  });
  tabela(el.querySelector("#an-tloc"), {
    linhas: [...vLoc].map(([j, v]) => ({ j, v, p: pLoc.get(j) })), ordem: 1, limite: 20,
    colunas: [
      { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")} · ${esc(D.municipios[D.locais[l.j].mun].nm)}</small>` },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
    ],
  });
  tabela(el.querySelector("#an-bairros"), {
    linhas: porBairro(D, a), ordem: 1,
    colunas: [
      { rotulo: "Bairro", valor: (l) => l.bairro },
      { rotulo: "Votos", valor: (l) => l.votos, formato: inteiro, num: true },
      { rotulo: "% no bairro", valor: (l) => (l.total ? l.votos / l.total : null), formato: (v) => pct(v), num: true },
    ],
  });
}
