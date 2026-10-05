import { FOCO } from "../config.mjs";
import { comparaveis, escolherB, percentuais, serie } from "../dados.mjs";
import { concentracao, diferenca, pearson, rsPorVoto, sobreposicao } from "../calc.mjs";
import { cor, criarMapa, escalaDiv, escalaSeq, legenda } from "../mapa.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct, reais } from "../fmt.mjs";
import { dicaLocal, dicaMunicipio } from "./andre.mjs";

export function montar(el, { D, geo, params, navegar }) {
  const a = D.porNumero.get(FOCO);
  const b = escolherB(D, params.b);
  const nivel = params.nivel === "loc" ? "loc" : "mun";
  const modo = params.modo === "dif" ? "dif" : "lado";
  const un = nivel === "loc" ? "locais" : "municípios";
  const va = serie(a, nivel), vb = serie(b, nivel);
  const pa = percentuais(D, a, nivel), pb = percentuais(D, b, nivel);
  const sob = sobreposicao(va, vb);
  const r = pearson(pa, pb);
  const ca = concentracao([...va.values()]), cb = concentracao([...vb.values()]);
  const linha = (rot, x, y) => `<tr><td>${rot}</td><td class="n destaque">${x}</td><td class="n">${y}</td></tr>`;
  const rpv = (c) => (!c.votos ? "—" : reais(rsPorVoto(c.receita, c.votos)));

  el.innerHTML = `
    <div class="controles">
      <label>Comparar André com <select id="cp-b">${comparaveis(D).map((c) =>
        `<option value="${c.n}" ${c.n === b.n ? "selected" : ""}>${esc(c.nm)} (${esc(c.sg)}) — ${inteiro(c.votos)}</option>`).join("")}</select></label>
      <span class="seg"><button data-nivel="mun" class="${nivel === "mun" ? "on" : ""}">Municípios</button><button data-nivel="loc" class="${nivel === "loc" ? "on" : ""}">Locais de votação</button></span>
      <span class="seg"><button data-modo="lado" class="${modo === "lado" ? "on" : ""}">Lado a lado</button><button data-modo="dif" class="${modo === "dif" ? "on" : ""}">Diferença</button></span>
    </div>
    <div class="grade g2">
      <div class="cartao">${modo === "lado"
        ? `<div class="grade" style="grid-template-columns:1fr 1fr"><div><h2 class="destaque">${esc(a.nm)}</h2><div id="cp-ma"></div></div><div><h2>${esc(b.nm)}</h2><div id="cp-mb"></div></div></div>`
        : `<h2>Diferença de % · laranja = André mais forte · azul = ${esc(b.nm)} mais forte</h2><div id="cp-md"></div>`}
        <div id="cp-leg"></div></div>
      <div class="cartao"><h2>Números</h2>
        <table><thead><tr><th></th><th class="n">${esc(a.nm)}</th><th class="n">${esc(b.nm)}</th></tr></thead><tbody>
          ${linha("Votos", inteiro(a.votos), inteiro(b.votos))}
          ${linha("Partido", esc(a.sg), esc(b.sg))}
          ${linha("Situação", esc(a.st), esc(b.st))}
          ${linha("Receita declarada", reais(a.receita, 0), reais(b.receita, 0))}
          ${linha("R$ por voto (receita)", rpv(a), rpv(b))}
          ${linha(`${un} com voto`, inteiro(va.size), inteiro(vb.size))}
          ${linha(`${un} que fazem 80% dos votos`, inteiro(ca.p80), inteiro(cb.p80))}
          ${linha(`% dos votos em ${un} onde o outro também teve voto`, pct(sob.fracA, 1), pct(sob.fracB, 1))}
        </tbody></table>
        <p class="espaco">${inteiro(sob.areas)} ${un} com voto dos dois. Correlação geográfica do % por ${nivel === "loc" ? "local" : "município"}:
          <b>${r == null ? "—" : r.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</b> <small>(1 = mesma base; 0 = sem relação; negativo = bases opostas)</small></p>
      </div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Onde ${esc(b.nm)} foi forte e André fraco</h2><div id="cp-tb" class="rolagem"></div></div>
      <div class="cartao"><h2>Onde André foi forte e ${esc(b.nm)} fraco</h2><div id="cp-ta" class="rolagem"></div></div>
    </div>`;
  el.querySelector("#cp-b").onchange = (e) => navegar({ b: e.target.value });
  el.querySelectorAll("[data-nivel]").forEach((x) => { x.onclick = () => navegar({ nivel: x.dataset.nivel }); });
  el.querySelectorAll("[data-modo]").forEach((x) => { x.onclick = () => navegar({ modo: x.dataset.modo }); });

  const linhasDica = [{ nm: a.nm, v: va, p: pa, destaque: true }, { nm: b.nm, v: vb, p: pb }];
  const dicaMunSimples = (i) => `<b>${esc(D.municipios[i].nm)}</b><small>dê zoom para ver os locais</small>`;
  const ligarDicas = (m) => (nivel === "mun"
    ? m.dicas((i) => dicaMunicipio(D, i, linhasDica), null)
    : m.dicas(dicaMunSimples, (j) => dicaLocal(D, j, linhasDica)));

  if (modo === "lado") {
    const max = Math.max(1e-9, ...pa.values(), ...pb.values());
    const s = escalaSeq(max, "--laranja");
    const pintar = (m, v, p) => {
      if (nivel === "mun") m.colorir((i) => (p.get(i) ? s(p.get(i)) : null));
      else {
        m.colorir(() => null);
        const maxV = Math.max(1, ...va.values(), ...vb.values());
        m.pontos([...v].map(([j, x]) => ({ j, raio: 1.5 + 9 * Math.sqrt(x / maxV), cor: s(p.get(j)) })), { semLimiar: true });
      }
      ligarDicas(m);
    };
    const ma = criarMapa(el.querySelector("#cp-ma"), { geo, D });
    const mb = criarMapa(el.querySelector("#cp-mb"), { geo, D });
    pintar(ma, va, pa);
    pintar(mb, vb, pb);
    ma.aoZoom((t) => mb.aplicarZoom(t));
    mb.aoZoom((t) => ma.aplicarZoom(t));
    legenda(el.querySelector("#cp-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0%", max: pct(max), titulo: `% ${nivel === "loc" ? "no local" : "dos válidos"} (mesma escala nos dois mapas)` });
  } else {
    const dd = new Map(diferenca(pa, pb).map((l) => [l.k, l.d]));
    const lim = Math.max(1e-9, ...[...dd.values()].map(Math.abs));
    const s = escalaDiv(lim);
    const m = criarMapa(el.querySelector("#cp-md"), { geo, D });
    if (nivel === "mun") m.colorir((i) => (dd.has(i) ? s(dd.get(i)) : null));
    else {
      m.colorir(() => null);
      m.pontos([...dd].map(([j, d]) => ({ j, raio: 1.5 + 9 * Math.sqrt(Math.abs(d) / lim), cor: s(d) })), { semLimiar: true });
    }
    ligarDicas(m);
    legenda(el.querySelector("#cp-leg"), { cores: [cor("--azul"), cor("--mapa-vazio"), cor("--laranja")], min: `${b.nm} +${pct(lim, 1)}`, max: `André +${pct(lim, 1)}`, titulo: "diferença de %" });
  }

  const nomeArea = (k) => (nivel === "loc" ? D.locais[k].nm : D.municipios[k].nm);
  const htmlArea = (v, l) => (nivel === "loc"
    ? `${esc(v)}<br><small>${esc(D.locais[l.k].bairro ?? "")} · ${esc(D.municipios[D.locais[l.k].mun].nm)}</small>`
    : esc(v));
  const tabelaDif = (alvo, x, y, vx, vy, nx, ny) => tabela(alvo, {
    linhas: diferenca(x, y).filter((l) => l.d > 0), ordem: 1, limite: 30,
    colunas: [
      { rotulo: nivel === "loc" ? "Local" : "Município", valor: (l) => nomeArea(l.k), formato: htmlArea },
      { rotulo: "Diferença", valor: (l) => l.d, formato: (v) => `${pct(v)}`, num: true },
      { rotulo: `% ${nx}`, valor: (l) => l.x, formato: (v) => pct(v), num: true },
      { rotulo: `% ${ny}`, valor: (l) => l.y, formato: (v) => pct(v), num: true },
      { rotulo: `Votos ${nx}`, valor: (l) => vx.get(l.k) ?? 0, formato: inteiro, num: true },
      { rotulo: `Votos ${ny}`, valor: (l) => vy.get(l.k) ?? 0, formato: inteiro, num: true },
    ],
  });
  const curto = (c) => c.nm.split(" ")[0];
  tabelaDif(el.querySelector("#cp-tb"), pb, pa, vb, va, curto(b), "André");
  tabelaDif(el.querySelector("#cp-ta"), pa, pb, va, vb, "André", curto(b));
}
