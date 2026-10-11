// Tela "Perfil do eleitor" (lugares parecidos): onde o candidato vai melhor, o que esses lugares têm em comum e
// quais lugares com o mesmo perfil deram poucos votos — por padrão só nas cidades onde ele já tem base.
import { PERFIL_UFS, UF } from "../config.mjs";
import { idxMunicipio, nomeCurto, unidade } from "../dados.mjs";
import { destaques, fracoes, lugaresParecidos } from "../perfil.mjs";
import { criarMapa } from "../mapa.mjs";
import { tabela } from "../tabela.mjs";
import { seletorMunicipio } from "../seletor.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Cidade "da base": pelo menos tantos votos do candidato.
const MIN_VOTOS_BASE = 50;
const MOSTRAR = 15;
// Como cada categoria aparece na frase "Mais … / Menos …".
const FRASE = {
  f: "mulheres", m: "homens", i16: "jovens de 16 a 24 anos", i25: "eleitores de 25 a 34 anos", i35: "eleitores de 35 a 44 anos",
  i45: "eleitores de 45 a 59 anos", i60: "idosos (60 anos ou mais)", e1: "eleitores com pouca escolaridade",
  e2: "eleitores com fundamental completo", e3: "eleitores com ensino médio completo", e4: "eleitores com nível superior",
};
const tituloNome = (s) => String(s ?? "").toLowerCase().replace(/(^|[\s/-])(\S)/g, (m, a, b) => a + b.toUpperCase());
const onde = (D, l) => `${l.bairro ? `${tituloNome(l.bairro)} · ` : ""}${tituloNome(D.municipios[l.mun].nm)}`;

// Motivo para a tela não se aplicar (ou null).
export function indisponivel(D, foco, perfil) {
  if (D.cargo?.escopo === "municipio") return "O perfil do eleitor está disponível para as eleições gerais (deputado, senador, governador). Para vereador e prefeito, em breve.";
  if (!PERFIL_UFS.includes(UF.sigla)) return `O perfil do eleitor está disponível, por enquanto, só para o Paraná. ${UF.nome} entra em breve.`;
  if (!perfil) return "O perfil do eleitorado deste ano ainda não foi carregado.";
  if (!foco.votos || !foco.loc?.length) return "Este candidato não teve votos para analisar.";
  return null;
}

export function montar(el, { D, geo, params, navegar, foco: a, perfil: PI }) {
  const motivo = indisponivel(D, a, PI);
  const r = motivo ? null : lugaresParecidos(D, a, PI, { parecidos: Infinity });
  if (motivo || !r) { el.innerHTML = `<div class="aviso">${esc(motivo ?? "Poucos locais com voto para comparar.")}</div>`; return; }
  const U = unidade(D);
  const nome = nomeCurto(a);
  const sel = idxMunicipio(D, params.mun);
  const estadoTodo = params.onde === "estado";
  const irPara = (i) => navegar({ mun: i == null ? null : D.municipios[i].cd });

  const votosMun = new Map(a.mun);
  const daBase = (i) => (votosMun.get(i) ?? 0) >= MIN_VOTOS_BASE;
  const lista = r.parecidos.filter((x) => (sel != null ? x.l.mun === sel : estadoTodo || daBase(x.l.mun))).slice(0, MOSTRAR);
  const frases = destaques(r.perfil, fracoes(PI.total));
  // onde ficam os melhores locais: bairros/cidades mais frequentes, na ordem
  const lugaresFortes = [...new Set(r.fortes.map((x) => onde(D, x.l)))].slice(0, 5);

  el.innerHTML = `
    <div class="grade g2">
      <div class="cartao">
        <h2>Onde ${esc(nome)} vai bem</h2>
        <p>Os ${r.fortes.length} melhores locais de votação ficam em <b>${lugaresFortes.map(esc).join("</b>, <b>")}</b>${r.fortes.length > lugaresFortes.length ? " e outros" : ""}.</p>
        <h3 class="pf-sub">O que esses lugares têm em comum</h3>
        ${frases.length ? `<ul class="pf-frases">${frases.map((f) => `<li><b class="${f.indice > 100 ? "mais" : "menos"}">${f.indice > 100 ? "Mais" : "Menos"} ${esc(FRASE[f.id])}</b>
          <small>${inteiro(Math.abs(f.indice - 100))}% ${f.indice > 100 ? "acima" : "abaixo"} da média ${esc(U.daArea)}</small></li>`).join("")}</ul>`
          : `<p>Perfil parecido com a média ${esc(U.daArea)}: o voto vem mais de rede e presença do que de um tipo de eleitor.</p>`}
      </div>
      <div class="cartao"><h2>No mapa</h2><div id="pf-mapa"></div>
        <div class="legenda"><span><span class="chip" style="background:var(--laranja)"></span>onde vai bem</span>
          <span><span class="chip" style="background:var(--azul)"></span>lugares parecidos com poucos votos</span>
          <span><span class="chip" style="background:var(--barra)"></span>cidades com ${MIN_VOTOS_BASE}+ votos</span></div></div>
    </div>
    <div class="cartao espaco">
      <h2>Lugares parecidos onde ${esc(nome)} foi fraco${sel != null ? ` · ${esc(tituloNome(D.municipios[sel].nm))}` : ""}</h2>
      <p class="pf-explica">Mesmo perfil de eleitor dos lugares onde ${esc(nome)} vai bem, mas com votação abaixo da média dele (${pct(r.media)} dos votos). São os primeiros lugares para levar campanha.</p>
      <div class="controles">
        ${sel == null ? `<span class="seg"><button data-onde="base" class="${estadoTodo ? "" : "on"}">Nas cidades onde já tem voto</button><button data-onde="estado" class="${estadoTodo ? "on" : ""}">${esc(U.todo)}</button></span>` : ""}
        <span id="pf-sel"></span>
      </div>
      <div id="pf-lista"></div>
    </div>
    <details class="cartao espaco pf-como"><summary>Como chegamos nisso</summary>
      <p>Pegamos os ${r.fortes.length} locais de votação onde ${esc(nome)} teve a maior fatia dos votos e olhamos o perfil do eleitorado de cada um
      (gênero, idade e escolaridade, cadastro do TSE). Depois procuramos, entre os locais onde ele ficou abaixo da própria média, os que têm o perfil mais
      parecido com esse. Só entram locais com pelo menos 100 votos. É o perfil do <b>lugar</b>, não de quem votou: o voto é secreto.</p></details>`;

  el.querySelectorAll("[data-onde]").forEach((b) => { b.onclick = () => navegar({ onde: b.dataset.onde === "estado" ? "estado" : null }); });
  seletorMunicipio(el.querySelector("#pf-sel"), D, sel, irPara);

  const mapa = criarMapa(el.querySelector("#pf-mapa"), { geo, D });
  mapa.aoClicar(irPara);
  mapa.colorir((i) => (daBase(i) ? "var(--barra)" : null));
  mapa.dicas((i) => `<b>${esc(tituloNome(D.municipios[i].nm))}</b><small>${inteiro(votosMun.get(i) ?? 0)} votos de ${esc(nome)} · clique para ver só esta cidade</small>`,
    (j) => { const l = D.locais[j], x = [...r.fortes, ...lista].find((y) => y.j === j);
      return `<b>${esc(l.nm)}</b><small>${esc(onde(D, l))}</small><br>${inteiro(x?.votos ?? 0)} votos (${pct(x?.pct ?? 0)})`; });
  const fortesMapa = sel == null ? r.fortes : r.fortes.filter((x) => x.l.mun === sel);
  mapa.pontos([...lista.map((x) => ({ j: x.j, raio: 5, cor: "var(--azul)" })), ...fortesMapa.map((x) => ({ j: x.j, raio: 6, cor: "var(--laranja)" }))], { semLimiar: true });
  if (sel != null) mapa.focar(sel);

  const el2 = el.querySelector("#pf-lista");
  if (!lista.length) { el2.innerHTML = `<p>Nenhum lugar parecido com votação fraca ${sel != null ? "nesta cidade" : "aqui"}.</p>`; return; }
  tabela(el2, {
    linhas: lista.map((x, k) => ({ ...x, k: k + 1 })), ordem: 0, desc: false,
    colunas: [
      { rotulo: "#", valor: (x) => x.k, num: true },
      { rotulo: "Local de votação", valor: (x) => x.l.nm, formato: (v, x) => `${esc(v)}<br><small>${esc(onde(D, x.l))}</small>` },
      { rotulo: "Eleitores", valor: (x) => x.l.aptos, formato: (v) => inteiro(v), num: true },
      { rotulo: `Votos de ${nome}`, valor: (x) => x.votos, formato: (v) => inteiro(v), num: true },
    ],
  });
}
