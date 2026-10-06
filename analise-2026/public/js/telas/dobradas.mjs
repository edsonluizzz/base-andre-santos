import { FOCO, PARTIDO } from "../config.mjs";
import { idxMunicipio, locaisDoMunicipio, percentuais, serie } from "../dados.mjs";
import { quantil } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { tabela } from "../tabela.mjs";
import { seletorMunicipio } from "../seletor.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { dicaLocal } from "./andre.mjs";

const CARGOS = { federal: "Deputado federal", senador: "Senador", governador: "Governador" };
const num = (v, casas = 2) => (v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const vezes = (v) => (v == null ? "—" : `${num(v, 1)}×`);

export function montar(el, { D, geo, params, navegar }) {
  const cargo = CARGOS[params.cargo] ? params.cargo : "federal";
  const lista = D.dobradas.cargos[cargo];
  const totais = D.dobradas.totais[cargo];
  const x = lista.find((c) => c.n === params.x && c.loc) ?? lista.find((c) => c.loc);
  const sel = idxMunicipio(D, params.mun);
  const nomeSel = sel == null ? null : D.municipios[sel].nm;
  const irPara = (i) => navegar({ mun: i == null ? null : D.municipios[i].cd });
  const a = D.porNumero.get(FOCO);
  const vA = serie(a, "loc"), pA = percentuais(D, a, "loc");
  const vX = new Map(x.loc), pX = new Map(x.loc.map(([j, v]) => [j, totais[j] ? v / totais[j] : 0]));
  const novos = lista.filter((c) => c.sg === PARTIDO).slice(0, 10);

  el.innerHTML = `
    <div class="controles">
      <span class="seg">${Object.entries(CARGOS).map(([k, v]) => `<button data-cargo="${k}" class="${k === cargo ? "on" : ""}">${v}</button>`).join("")}</span>
      <span id="db-sel"></span>
    </div>
    <div class="aviso"><b>Afinidade</b> = correlação entre o % do André e o % do candidato em cada um dos ${inteiro(D.locais.length)} locais de votação (1 = votos sempre juntos; 0 = sem relação).
      <b>Lift</b> = quanto o candidato rendeu nos locais onde o André teve voto, em relação à média dele no estado (2× = o dobro). Mostra quem dividiu eleitor com o André, não prova acordo de dobrada.</div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>André × ${esc(x.nm)} (${esc(x.sg)}) · % no local${nomeSel ? ` · ${esc(nomeSel)}` : ""}</h2>
        <div class="grade" style="grid-template-columns:1fr 1fr"><div><h3 class="destaque">André Santos</h3><div id="db-ma"></div></div><div><h3 style="color:var(--azul)">${esc(x.nm)}</h3><div id="db-mb"></div></div></div>
        <div id="db-leg"></div></div>
      <div class="grade" style="align-content:start">
        <div class="cartao"><h2>${esc(x.nm)}</h2><p>${inteiro(x.votos)} votos · ${esc(x.st)} · afinidade <b>${num(x.r)}</b> · lift <b>${vezes(x.lift)}</b></p></div>
        <div class="cartao"><h2>Maior afinidade · ${CARGOS[cargo]}</h2><div class="ranking-mun">${lista.slice(0, 8).map((c, k) =>
          `<div>${k + 1}º <a href="#" data-x="${c.n}">${esc(c.nm)}</a> <small>(${esc(c.sg)})</small> — ${num(c.r)} · ${vezes(c.lift)}</div>`).join("")}</div></div>
        ${novos.length && cargo === "federal" ? `<div class="cartao"><h2>Federais do NOVO · 10 de maior afinidade</h2><div class="ranking-mun">${novos.map((c) =>
          `<div>${lista.indexOf(c) + 1}º <a href="#" data-x="${c.n}">${esc(c.nm)}</a> — ${inteiro(c.votos)} votos · ${num(c.r)} · ${vezes(c.lift)}</div>`).join("")}</div></div>` : ""}
      </div>
    </div>
    ${sel == null ? "" : `<div class="cartao espaco"><h2>Locais de votação em ${esc(nomeSel)}</h2><div id="db-locais" class="rolagem"></div></div>`}
    <div class="cartao espaco"><h2>Todos os candidatos a ${CARGOS[cargo].toLowerCase()} · clique para ver no mapa (mapa disponível para os 15 de maior afinidade e os do NOVO)</h2><div id="db-tab" class="rolagem" style="max-height:520px"></div></div>`;

  el.querySelectorAll("[data-cargo]").forEach((b) => { b.onclick = () => navegar({ cargo: b.dataset.cargo, x: null }); });
  el.querySelectorAll("a[data-x]").forEach((l) => { l.onclick = (ev) => { ev.preventDefault(); navegar({ x: l.dataset.x }); }; });
  seletorMunicipio(el.querySelector("#db-sel"), D, sel, irPara);

  const linhasDica = [{ nm: "André Santos", v: vA, p: pA, destaque: true }, { nm: x.nm, v: vX, p: pX }];
  const pinta = (m, v, p, nomeVar) => {
    const max = Math.max(1e-9, quantil([...p.values()], 0.95));
    const s = escalaSeq(max, nomeVar, { linear: true });
    const maxV = Math.max(1, quantil([...v.values()], 0.98));
    m.colorir(() => null);
    m.pontos([...v].map(([j, q]) => ({ j, raio: 1.5 + 8 * Math.min(1, Math.sqrt(q / maxV)), cor: s(p.get(j)) })), { semLimiar: true });
    m.dicas((i) => `<b>${esc(D.municipios[i].nm)}</b><small>clique para ver só esta cidade</small>`, (j) => dicaLocal(D, j, linhasDica));
    m.aoClicar(irPara);
    return max;
  };
  const ma = criarMapa(el.querySelector("#db-ma"), { geo, D });
  const mb = criarMapa(el.querySelector("#db-mb"), { geo, D });
  const maxA = pinta(ma, vA, pA, "--laranja");
  const maxB = pinta(mb, vX, pX, "--azul");
  ma.aoZoom((t) => mb.aplicarZoom(t));
  mb.aoZoom((t) => ma.aplicarZoom(t));
  if (sel != null) { ma.focar(sel); mb.destacar(sel); }
  legenda(el.querySelector("#db-leg"), { cores: [cor("--mapa-vazio"), cor("--texto")], min: "0%", max: `André ${pct(maxA)} · ${x.nm.split(" ")[0]} ${pct(maxB)}`, titulo: "cada mapa na sua escala; tamanho = votos" });

  if (sel != null) {
    tabela(el.querySelector("#db-locais"), {
      linhas: locaisDoMunicipio(D, sel).map((j) => ({ j, a: vA.get(j) ?? 0, pa: pA.get(j) ?? 0, x: vX.get(j) ?? 0, px: pX.get(j) ?? 0 })), ordem: 1, busca: "Buscar local…",
      colunas: [
        { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")}</small>` },
        { rotulo: "Votos André", valor: (l) => l.a, formato: inteiro, num: true },
        { rotulo: "% André", valor: (l) => l.pa, formato: (v) => pct(v), num: true },
        { rotulo: `Votos ${x.nm.split(" ")[0]}`, valor: (l) => l.x, formato: inteiro, num: true },
        { rotulo: `% ${x.nm.split(" ")[0]}`, valor: (l) => l.px, formato: (v) => pct(v), num: true },
      ],
    });
  }

  tabela(el.querySelector("#db-tab"), {
    linhas: lista, ordem: 4, busca: "Buscar candidato…",
    aoClicar: (c) => { if (c.loc) navegar({ x: c.n }); },
    classe: (c) => (c.n === x.n ? "sel" : c.sg === PARTIDO ? "foco" : ""),
    colunas: [
      { rotulo: "Candidato", valor: (c) => c.nm, formato: (v, c) => `${esc(v)}${c.loc ? "" : " <small>(sem mapa)</small>"}` },
      { rotulo: "Partido", valor: (c) => c.sg },
      { rotulo: "Votos", valor: (c) => c.votos, formato: inteiro, num: true },
      { rotulo: "Situação", valor: (c) => c.st },
      { rotulo: "Afinidade", valor: (c) => c.r, formato: (v) => num(v), num: true },
      { rotulo: "Lift", valor: (c) => c.lift, formato: vezes, num: true },
    ],
  });
}
