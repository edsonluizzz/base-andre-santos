import { idxMunicipio, lerSelecao, nomeCurto, locaisDoMunicipio, percentuais, porRegiao, rankingNoMunicipio, restringir, serie } from "../dados.mjs";
import { quantil, sobreposicao, vencedor } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { seletorMunicipio } from "../seletor.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { dicaLocal, dicaMunicipio } from "./candidato.mjs";

export function montar(el, { D, geo, params, navegar, foco, comparados, cores: CORES, varCor }) {
  const FOCO = foco.n;
  const TODOS = [foco, ...comparados].map((c) => c.n);
  const curto = nomeCurto;
  if (!comparados.length) {
    el.innerHTML = `<div class="aviso">Escolha pelo menos um candidato em “Comparar com”, na barra acima.</div>`;
    return;
  }
  const nivel = params.nivel === "loc" ? "loc" : "mun";
  const vista = params.vista === "calor" ? "calor" : "lider";
  const escalaComum = params.escala === "comum";
  const ver = lerSelecao(params.ver, TODOS);
  const sel = idxMunicipio(D, params.mun);
  const nomeSel = sel == null ? null : D.municipios[sel].nm;
  const irPara = (i) => navegar({ mun: i == null ? null : D.municipios[i].cd });
  const un = nivel === "loc" ? "locais" : "municípios";
  const cands = ver.map((n) => D.porNumero.get(n));
  const series = cands.map((c) => ({ n: c.n, mapa: serie(c, nivel) }));
  const venc = vencedor(series);
  const vitorias = (n) => [...venc.values()].filter((w) => w.n === n).length;
  const daCidade = sel == null ? null : new Set(locaisDoMunicipio(D, sel));

  el.innerHTML = `
    <div class="controles">
      <span class="marcas">${TODOS.map((n) => { const c = D.porNumero.get(n); return `<label><input type="checkbox" value="${n}" ${ver.includes(n) ? "checked" : ""}><span class="chip" style="background:${CORES[n]}"></span>${esc(c.nm)} <small>(${esc(c.sg)})</small></label>`; }).join("")}</span>
    </div>
    <div class="controles">
      <span class="seg"><button data-vista="lider" class="${vista === "lider" ? "on" : ""}">Quem lidera</button><button data-vista="calor" class="${vista === "calor" ? "on" : ""}">Mapa de calor</button></span>
      <span class="seg"><button data-nivel="mun" class="${nivel === "mun" ? "on" : ""}">Municípios</button><button data-nivel="loc" class="${nivel === "loc" ? "on" : ""}">Locais de votação</button></span>
      ${vista === "calor" ? `<span class="seg"><button data-escala="propria" class="${escalaComum ? "" : "on"}">Escala de cada um</button><button data-escala="comum" class="${escalaComum ? "on" : ""}">Mesma escala</button></span>` : ""}
      <span id="ig-sel"></span>
    </div>
    <div class="grade g2">
      <div class="cartao">
        <h2>${vista === "lider" ? `Quem teve mais votos em cada ${nivel === "loc" ? "local" : "município"}` : `Mapa de calor · % ${nivel === "loc" ? "no local" : "dos válidos"} de cada um`}${nomeSel ? ` · ${esc(nomeSel)}` : ""}</h2>
        ${vista === "lider" ? `<div id="ig-mapa"></div><small>${cands.map((c) => `<span class="chip" style="background:${CORES[c.n]}"></span>${esc(curto(c))} lidera em ${inteiro(vitorias(c.n))} ${un}`).join(" · ")}. Sem cor: nenhum dos escolhidos teve voto. Cinza: empate.</small>`
          : `<div class="mapas-grade">${cands.map((c) => `<div><h3 style="color:${CORES[c.n]}">${esc(c.nm)} · ${inteiro(c.votos)}</h3><div id="ig-m-${c.n}"></div></div>`).join("")}</div><div id="ig-leg"></div>`}
      </div>
      <div class="grade" style="align-content:start">
        ${sel == null ? "" : `<div class="cartao"><h2>${esc(nomeSel)}</h2><div id="ig-cidade" class="ranking-mun"></div></div>`}
        <div class="cartao"><h2>Votos por região</h2><div id="ig-reg"></div></div>
        <div class="cartao"><h2>Sobreposição de bases (locais de votação)</h2><div id="ig-sob"></div>
          <small>Cada linha: % dos votos daquele candidato que estão em locais onde o da coluna também teve voto.</small></div>
      </div>
    </div>
    <div class="grade g3 espaco">${cands.filter((c) => c.n !== FOCO).map((c) =>
      `<div class="cartao"><h2>Onde ${esc(c.nm)} foi mais forte${nomeSel ? ` em ${esc(nomeSel)}` : ""}</h2><div id="ig-top-${c.n}" class="rolagem"></div></div>`).join("")}</div>`;

  el.querySelectorAll(".marcas input").forEach((x) => {
    x.onchange = () => {
      const marcados = [...el.querySelectorAll(".marcas input:checked")].map((i) => i.value);
      navegar({ ver: marcados.length ? marcados.join(",") : null });
    };
  });
  el.querySelectorAll("[data-nivel]").forEach((x) => { x.onclick = () => navegar({ nivel: x.dataset.nivel }); });
  el.querySelectorAll("[data-vista]").forEach((x) => { x.onclick = () => navegar({ vista: x.dataset.vista }); });
  el.querySelectorAll("[data-escala]").forEach((x) => { x.onclick = () => navegar({ escala: x.dataset.escala === "comum" ? "comum" : null }); });
  seletorMunicipio(el.querySelector("#ig-sel"), D, sel, irPara);

  const linhasDica = cands.map((c) => ({ nm: c.nm, v: serie(c, nivel), p: percentuais(D, c, nivel), destaque: c.n === FOCO }));
  const dicaMun = (i) => (nivel === "mun" ? dicaMunicipio(D, i, linhasDica) : `<b>${esc(D.municipios[i].nm)}</b><small>clique para ver só esta cidade</small>`);
  const dicaLoc = (j) => dicaLocal(D, j, linhasDica);
  const ligar = (m) => { m.dicas(dicaMun, nivel === "loc" ? dicaLoc : null); m.aoClicar(irPara); };

  if (vista === "lider") {
    const corVenc = (w) => (!w ? null : w.n ? CORES[w.n] : "var(--barra)");
    const mapa = criarMapa(el.querySelector("#ig-mapa"), { geo, D });
    if (nivel === "mun") mapa.colorir((i) => corVenc(venc.get(i)));
    else {
      mapa.colorir(() => null);
      const soma = (j) => series.reduce((s, x) => s + (x.mapa.get(j) ?? 0), 0);
      const maxS = Math.max(1, quantil([...venc.keys()].map(soma), 0.98));
      mapa.pontos([...venc].map(([j, w]) => ({ j, raio: 1.5 + 9 * Math.min(1, Math.sqrt(soma(j) / maxS)), cor: corVenc(w) })), { semLimiar: true });
    }
    ligar(mapa);
    if (sel != null) mapa.focar(sel);
  } else {
    // Um mapa por candidato, mesma escala, zoom sincronizado.
    // Escala de cada um (linear, corte no percentil 95) mostra onde cada um é forte; a comum compara a força entre eles.
    const ps = cands.map((c) => percentuais(D, c, nivel));
    const comum = Math.max(1e-9, quantil(ps.flatMap((p) => [...p.values()]), 0.95));
    const maxDe = (p) => (escalaComum ? comum : Math.max(1e-9, quantil([...p.values()], 0.95)));
    const mapas = cands.map((c, k) => {
      const m = criarMapa(el.querySelector(`#ig-m-${c.n}`), { geo, D });
      const p = ps[k];
      const s = escalaSeq(maxDe(p), varCor.get(c.n), { linear: true });
      el.querySelector(`#ig-m-${c.n}`).previousElementSibling.insertAdjacentHTML("beforeend", ` <small>· cor máxima ≥ ${pct(maxDe(p))}</small>`);
      if (nivel === "mun") m.colorir((i) => (p.get(i) ? s(p.get(i)) : null));
      else {
        m.colorir(() => null);
        const v = serie(c, "loc");
        const maxV = Math.max(1, quantil([...v.values()], 0.98));
        m.pontos([...v].map(([j, x]) => ({ j, raio: 1.5 + 8 * Math.min(1, Math.sqrt(x / maxV)), cor: s(p.get(j)) })), { semLimiar: true });
      }
      ligar(m);
      return m;
    });
    for (const m of mapas) m.aoZoom((t) => mapas.forEach((o) => { if (o !== m) o.aplicarZoom(t); }));
    if (sel != null) { mapas[0].focar(sel); mapas.slice(1).forEach((m) => m.destacar(sel)); }
    legenda(el.querySelector("#ig-leg"), { cores: [cor("--mapa-vazio"), cor("--texto")], min: "0%", max: escalaComum ? pct(comum) : "máximo de cada um", titulo: escalaComum ? `mesma escala nos ${cands.length} mapas` : "cada mapa na sua escala (ver o máximo no título)" });
  }

  if (sel != null) {
    const rk = rankingNoMunicipio(D, sel);
    const val = D.municipios[sel].validos;
    el.querySelector("#ig-cidade").innerHTML = cands.map((c) => {
      const v = c.mun.find(([k]) => k === sel)?.[1] ?? 0;
      const pos = rk.findIndex((x) => x.c.n === c.n) + 1;
      return `<div><span class="chip" style="background:${CORES[c.n]}"></span>${esc(c.nm)} — <b>${inteiro(v)}</b> (${pct(val ? v / val : 0)}) · ${pos ? `${pos}º na cidade` : "sem voto"}</div>`;
    }).join("") + `<small>${inteiro(daCidade.size)} locais de votação · ${inteiro(rk.length)} candidatos com voto</small>`;
  }

  const regioes = cands.map((c) => porRegiao(D, c));
  const maxReg = Math.max(1, ...regioes.flatMap((r) => Object.values(r)));
  barras(el.querySelector("#ig-reg"), Object.keys(regioes[0] ?? {}).flatMap((reg) => cands.map((c, k) => ({
    rotulo: `${reg} · ${curto(c)}`, valor: regioes[k][reg], cor: CORES[c.n], titulo: `${c.nm} em ${reg}`,
  }))), { formato: inteiro, max: maxReg });

  const sl = cands.map((c) => restringir(serie(c, "loc"), daCidade));
  el.querySelector("#ig-sob").innerHTML = cands.length < 2 ? "<small>Escolha pelo menos dois candidatos.</small>"
    : `<table><thead><tr><th></th>${cands.map((c) => `<th class="n">${esc(curto(c))}</th>`).join("")}</tr></thead><tbody>${
      cands.map((c, i) => `<tr><td><span class="chip" style="background:${CORES[c.n]}"></span>${esc(curto(c))}</td>${
        cands.map((_, j) => `<td class="n">${i === j ? "—" : pct(sobreposicao(sl[i], sl[j]).fracA, 0)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const vFoco = serie(foco, "loc");
  for (const c of cands.filter((x) => x.n !== FOCO)) {
    const p = percentuais(D, c, "loc");
    tabela(el.querySelector(`#ig-top-${c.n}`), {
      linhas: [...restringir(serie(c, "loc"), daCidade)].map(([j, v]) => ({ j, v, p: p.get(j), a: vFoco.get(j) ?? 0 })), ordem: 1, limite: sel == null ? 15 : Infinity,
      colunas: [
        { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")} · ${esc(D.municipios[D.locais[l.j].mun].nm)}</small>` },
        { rotulo: `Votos ${curto(c)}`, valor: (l) => l.v, formato: inteiro, num: true },
        { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
        { rotulo: `Votos ${curto(foco)}`, valor: (l) => l.a, formato: inteiro, num: true },
      ],
    });
  }
}
