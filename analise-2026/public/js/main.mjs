import { ANOS_GERAIS, ANOS_MUNICIPAIS, CARGOS, CARGO_PADRAO, MAX_COMPARADOS, UF, idCargo } from "./config.mjs";
import { buscarCandidato, coresDe, garantirLocais, indexar, lerComparados, nomeCurto, rotuloCandidato, varCorDe } from "./dados.mjs";
import { esc } from "./fmt.mjs";
import { escreverRota, lerRota } from "./rota.mjs";
import { esconderDica } from "./dica.mjs";
import { TELAS_LIVRES, estaLiberado, oferta } from "./oferta.mjs";
import { tabela } from "./tabela.mjs";
import { animarLanding, landing, ligarBarra, ligarBusca } from "./landing.mjs";
import { aplicarDemo } from "./demo.mjs";

// ?demo na URL: nomes, números e partidos fictícios (telas de divulgação).
const DEMO = new URLSearchParams(location.search).has("demo");
import * as panorama from "./telas/panorama.mjs";
import * as candidato from "./telas/candidato.mjs";
import * as custo from "./telas/custo.mjs";
import * as comparador from "./telas/comparador.mjs";
import * as concorrentes from "./telas/concorrentes.mjs";
import * as relatorio from "./telas/relatorio.mjs";

const TELAS = [
  { id: "panorama", nome: "Panorama", mod: panorama },
  { id: "candidato", nome: "Votos do candidato", mod: candidato },
  { id: "custo", nome: "Custo do voto", mod: custo },
  { id: "comparador", nome: "Comparador", mod: comparador },
  { id: "concorrentes", nome: "Concorrentes", mod: concorrentes },
  { id: "relatorio", nome: "Relatório PDF", mod: relatorio },
];
// Escolhas que valem para todas as telas e acompanham a troca de aba.
const GLOBAIS = ["cargo", "m", "c", "vs"];

let erros = 0;
function registrarErro(msg) {
  erros++;
  document.body.dataset.erros = String(erros);
  const pre = document.getElementById("erros");
  pre.hidden = false;
  pre.textContent += `${msg}\n`;
}
addEventListener("error", (e) => registrarErro(e.message));
addEventListener("unhandledrejection", (e) => registrarErro(String(e.reason?.stack ?? e.reason)));

function lerTema() {
  try { return localStorage.getItem("analise-2026-tema"); } catch { return null; }
}
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem("analise-2026-tema", t); } catch { /* sem armazenamento: tudo bem */ }
}

async function carregar(url, opcional = false) {
  const r = await fetch(url).catch((e) => { if (opcional) return null; throw e; });
  if (!r?.ok) {
    if (opcional) return null;
    throw new Error(`${url}: HTTP ${r.status}`);
  }
  return r.json();
}

// Cada cargo é carregado uma vez e guardado (os votos por local vão sendo acrescentados nele).
// Municipais: um arquivo por cidade (dados/<ano>/<cargo>/<cd>.json); `m` é o código TSE da cidade.
const cacheCargos = new Map();
function dadosDoCargo(id, m = null) {
  const cfg = CARGOS[id], chave = cfg?.municipal ? `${id}:${m}` : id;
  const url = cfg?.municipal ? `dados/${cfg.arquivo}/${m}.json` : `dados/${cfg?.arquivo ?? id}.json`;
  if (!cacheCargos.has(chave)) cacheCargos.set(chave, carregar(url).then(indexar).then((D) => (DEMO ? aplicarDemo(D) : D)));
  return cacheCargos.get(chave);
}
const cacheCidades = new Map();
const cidadesDoAno = (ano) => {
  if (!cacheCidades.has(ano)) cacheCidades.set(ano, carregar(`dados/${ano}/municipios.json`));
  return cacheCidades.get(ano);
};

const globais = (params) => Object.fromEntries(GLOBAIS.filter((k) => params[k] != null).map((k) => [k, params[k]]));

// Barra fixa: cargo, candidato principal e quem entra na comparação.
function barraEscolha(el, { D, cargo, foco, comparados, cores, mudar, cidades }) {
  const opcoes = (D?.candidatos ?? []).map((c) => `<option value="${esc(rotuloCandidato(c))}">`).join("");
  const municipal = CARGOS[cargo].municipal;
  // Um botão por cargo (no ano em uso daquele tipo de eleição) + seletor de ano.
  const ano = CARGOS[cargo].ano, base = cargo.split("-")[0];
  const anoG = municipal ? ANOS_GERAIS[0] : ano, anoM = municipal ? ano : ANOS_MUNICIPAIS[0];
  const botoesCargo = [[idCargo("estadual", anoG), "Estadual"], [idCargo("federal", anoG), "Federal"], [idCargo("vereador", anoM), "Vereador"], [idCargo("prefeito", anoM), "Prefeito"]];
  const anos = municipal ? ANOS_MUNICIPAIS : ANOS_GERAIS;
  el.innerHTML = `
    <span class="seg">${botoesCargo.map(([id, rot]) => `<button data-cargo="${id}" class="${id.split("-")[0] === base ? "on" : ""}">${rot}</button>`).join("")}</span>
    <span class="seg">${anos.map((a) => `<button data-ano="${a}" class="${ano === a ? "on" : ""}">${a}</button>`).join("")}</span>
    ${municipal ? `<label class="campo">Cidade <input id="es-m" list="es-cidades" placeholder="Digite a cidade" value="${D ? esc(D.cargo.municipio.nm) : ""}"></label>
      <datalist id="es-cidades">${(cidades ?? []).map((x) => `<option value="${esc(x.nm)}">`).join("")}</datalist>` : ""}
    ${D ? `<label class="campo">Candidato <input id="es-c" list="es-lista" placeholder="Nome ou número" value="${foco ? esc(rotuloCandidato(foco)) : ""}"></label>
    ${foco ? `<span class="campo">Comparar com
      ${comparados.map((c) => `<span class="ficha"><span class="chip" style="background:${cores.get(c.n)}"></span>${esc(nomeCurto(c))}<button data-tirar="${c.n}" title="Tirar da comparação">✕</button></span>`).join("")}
      ${comparados.length < MAX_COMPARADOS ? `<input id="es-vs" list="es-lista" placeholder="+ adicionar">` : ""}
    </span>` : ""}
    <datalist id="es-lista">${opcoes}</datalist>` : ""}`;
  el.querySelectorAll("[data-cargo]").forEach((b) => {
    // troca de cargo: mantém a cidade entre vereador e prefeito do mesmo ano
    b.onclick = () => { if (b.dataset.cargo !== cargo) mudar({ cargo: b.dataset.cargo, m: CARGOS[b.dataset.cargo].municipal && municipal ? D?.cargo.municipio.cd : null, c: null, vs: null }); };
  });
  // troca de ano: mesmo cargo e mesma cidade, candidato de novo (os números mudam entre eleições)
  el.querySelectorAll("[data-ano]").forEach((b) => {
    b.onclick = () => { if (Number(b.dataset.ano) !== ano) mudar({ cargo: idCargo(base, Number(b.dataset.ano)), m: municipal ? D?.cargo.municipio?.cd ?? null : null, c: null, vs: null }); };
  });
  const cidade = el.querySelector("#es-m");
  cidade?.addEventListener("change", () => {
    const t = normalTexto(cidade.value), x = (cidades ?? []).find((k) => normalTexto(k.nm) === t);
    if (x) mudar({ m: x.cd, c: null, vs: null });
  });
  if (!D) return;
  const campo = el.querySelector("#es-c");
  campo.addEventListener("change", () => {
    const c = buscarCandidato(D, campo.value);
    if (c && c.n !== foco?.n) mudar({ c: c.n, vs: null });
  });
  const lista = (cs) => (cs.length ? cs.map((c) => c.n).join(",") : "-");
  el.querySelectorAll("[data-tirar]").forEach((b) => {
    b.onclick = () => mudar({ vs: lista(comparados.filter((c) => c.n !== b.dataset.tirar)) });
  });
  const add = el.querySelector("#es-vs");
  add?.addEventListener("change", () => {
    const c = buscarCandidato(D, add.value);
    if (c && c.n !== foco.n && !comparados.some((x) => x.n === c.n)) mudar({ vs: lista([...comparados, c]) });
  });
}

// Sem candidato escolhido: lista de todos para escolher.
// Raiz do site: landing de venda. Busca troca de cargo sem recarregar; o clique abre a prévia do candidato.
const normalTexto = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

// Municipais sem cidade: escolha da cidade. Com cidade e sem candidato: lista dos candidatos dela.
function telaCidades(el, { cargo, cidades, mudar }) {
  const cfg = CARGOS[cargo];
  el.innerHTML = `<div class="cartao"><h2>${esc(cfg.nome)} ${cfg.ano} · ${UF.nome} · escolha a cidade</h2><div id="in-cidades"></div></div>`;
  tabela(el.querySelector("#in-cidades"), {
    linhas: cidades, ordem: 1, busca: "Buscar cidade…", aoClicar: (x) => mudar({ m: x.cd, c: null, vs: null }),
    colunas: [{ rotulo: "Cidade", valor: (x) => x.nm }, { rotulo: "Candidatos", valor: (x) => x[cargo.split("-")[0]] ?? 0, formato: (v) => String(v), num: true }],
  });
}
function telaCandidatosCidade(el, { D, mudar }) {
  el.innerHTML = `<div class="cartao"><h2>${esc(D.cargo.nome)} ${D.cargo.ano} · ${esc(D.cargo.municipio.nm)} · ${D.candidatos.length} candidatos</h2><div id="in-cands"></div></div>`;
  tabela(el.querySelector("#in-cands"), {
    linhas: D.candidatos, ordem: 3, busca: "Buscar candidato…", aoClicar: (c) => mudar({ c: c.n, vs: null }),
    colunas: [
      { rotulo: "Candidato", valor: (c) => c.nm }, { rotulo: "Número", valor: (c) => c.n }, { rotulo: "Partido", valor: (c) => c.sg },
      { rotulo: "Votos", valor: (c) => c.votos, formato: (v) => v.toLocaleString("pt-BR"), num: true }, { rotulo: "Situação", valor: (c) => c.st },
    ],
  });
}

let desfazerLanding = () => {};
function telaInicial(el, { D, geo, acesso }) {
  el.innerHTML = landing({ venda: acesso?.venda });
  const meus = (acesso?.liberados ?? []).map((k) => k.split(":"));
  if (meus.length) {
    el.querySelector(".lp-busca-caixa").insertAdjacentHTML("beforebegin", `<div class="lp-meus"><span>Seus diagnósticos</span>${meus.map(([cargo, n]) =>
      `<a href="#relatorio?cargo=${cargo}&${n.includes("-") ? `m=${n.split("-")[0]}&c=${n.split("-")[1]}` : `c=${n}`}">${esc(CARGOS[cargo]?.curto ?? cargo)} ${esc(n.split("-").pop())}</a>`).join("")}</div>`);
  }
  // O # da URL é a rota das telas: âncora vira rolagem por script.
  el.querySelectorAll("[data-rolar]").forEach((b) => {
    b.onclick = () => document.getElementById(b.dataset.rolar)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  ligarBusca(el, {
    cargoInicial: D.cargo.id,
    carregarCargo: dadosDoCargo,
    carregarCidades: cidadesDoAno,
    abrir: (cargo, n, m) => { location.hash = escreverRota("panorama", { cargo, m, c: n }); },
    venda: acesso?.venda,
  });
  const desfazerAnim = animarLanding(el, { geo, D }), desfazerBarra = ligarBarra(el);
  desfazerLanding = () => { desfazerAnim(); desfazerBarra(); };
}

async function iniciar() {
  aplicarTema(lerTema() ?? "escuro");
  const tela = document.getElementById("tela");
  const barra = document.getElementById("escolha");
  let geo, interno, acesso;
  try {
    // acesso.json só existe no sistema (online); rodando local, tudo liberado.
    [geo, interno, acesso] = await Promise.all([carregar("mapa.geo.json"), (location.hostname.startsWith("diagnostico.") ? null : carregar("interno.json", true)), carregar("acesso.json", true)]);
  } catch (e) {
    tela.innerHTML = `<div class="aviso">Não consegui carregar o mapa (${esc(e.message)}).</div>`;
    return;
  }
  const nav = document.getElementById("abas");
  const ids = TELAS.map((t) => t.id);
  let vez = 0;

  const render = async () => {
    const minha = ++vez;
    const { tela: id, params } = lerRota(location.hash, ids);
    const cargo = CARGOS[params.cargo] ? params.cargo : CARGO_PADRAO;
    const municipal = !!CARGOS[cargo].municipal;
    let D = null, cidades = null;
    try {
      if (municipal) {
        cidades = await cidadesDoAno(CARGOS[cargo].ano);
        if (params.m) D = await dadosDoCargo(cargo, params.m);
      } else D = await dadosDoCargo(cargo);
    } catch (e) {
      tela.innerHTML = `<div class="aviso">Não consegui carregar os dados (${esc(e.message)}). Rode <code>node analise-2026/coletar/coletar.mjs</code> na raiz do repositório e recarregue.</div>`;
      return;
    }
    const foco = D?.porNumero.get(params.c) ?? null;
    const comparados = foco ? lerComparados(D, foco, params.vs) : [];
    const cores = foco ? coresDe(foco, comparados) : new Map();
    // Troca de cargo/candidato: mantém a tela e o município, descarta escolhas que dependem do candidato.
    const mudar = (novos) => {
      const p = { ...globais(params), cargo, ...novos };
      if (params.mun && !("cargo" in novos && novos.cargo !== cargo)) p.mun = params.mun;
      location.hash = escreverRota(id, p);
    };
    // chave do candidato: número (gerais) ou cidade-número (municipais, o número se repete entre cidades)
    const liberado = foco ? estaLiberado(acesso, cargo, municipal ? `${params.m}-${foco.n}` : foco.n) : false;
    // Votos por local só para quem comprou (a rota responde 403 aos demais).
    if (foco && liberado) await garantirLocais(D, [foco.n, ...comparados.map((c) => c.n), params.b ?? ""], (u) => carregar(u, true));
    if (minha !== vez) return; // outra navegação começou enquanto carregava

    document.title = foco ? `${nomeCurto(foco)} · Ovile Diagnóstico` : `Ovile Diagnóstico · Eleição ${CARGOS[cargo].ano} ${UF.sigla}`;
    document.getElementById("cargo-titulo").textContent = `${CARGOS[cargo].curto.toUpperCase()} ${D?.cargo.municipio?.nm ?? UF.sigla}`;
    const f = D?.meta.fontes;
    document.getElementById("rodape").textContent = !f ? "" :
      `Fontes: TSE, votação por seção (${f.secao}), locais de votação (${f.locais}), resultado oficial (${f.oficial}), prestação de contas (${f.contas ?? "sem dado"}); IBGE, malha municipal. Gerado em ${new Date(D.meta.geradoEm).toLocaleString("pt-BR")}.`;
    barraEscolha(barra, { D, cargo, foco, comparados, cores, mudar, cidades });
    // municipais: o mapa é só a cidade (os locais de votação aparecem por cima)
    const geoTela = municipal && D ? { ...geo, features: geo.features.filter((ft) => ft.properties.codarea === D.cargo.municipio.ibge) } : geo;
    const g = escreverRota("x", { ...globais(params), cargo }).slice(2);
    nav.innerHTML = foco ? TELAS.map((t, k) => `<a href="#${t.id}${g}" data-id="${t.id}"><kbd>${k + 1}</kbd>${t.nome}${liberado || TELAS_LIVRES.includes(t.id) ? "" : " 🔒"}</a>`).join("") : "";
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("ativa", a.dataset.id === id));
    // No celular o menu rola para o lado: traz a aba ativa para a vista.
    const ativa = nav.querySelector(".ativa");
    if (ativa) nav.scrollLeft = ativa.offsetLeft - (nav.clientWidth - ativa.offsetWidth) / 2;
    esconderDica();
    // Mapa em tela cheia ou ampliado continua assim depois de redesenhar (ex.: ao escolher um município).
    const cheio = document.fullscreenElement?.querySelector(".mapa[id]")?.id;
    const ampliados = [...tela.querySelectorAll(".cartao.ampliado .mapa[id]")].map((m) => m.id);
    document.documentElement.dataset.tema = lerTema() ?? "escuro"; // o relatório força o claro só enquanto aberto
    desfazerLanding(); // tira os gatilhos de rolagem da landing antes de trocar de tela
    desfazerLanding = () => {};
    tela.replaceChildren();
    tela.style.animation = "none";
    tela.offsetWidth;
    tela.style.animation = "";
    document.body.dataset.tela = foco ? id : "inicio";
    if (!foco) {
      if (municipal) {
        document.body.dataset.tela = "lista";
        if (D) telaCandidatosCidade(tela, { D, mudar }); else telaCidades(tela, { cargo, cidades, mudar });
        document.body.dataset.pronta = "lista";
        return;
      }
      telaInicial(tela, { D, geo, acesso });
      document.body.dataset.pronta = "inicio";
      return;
    }
    const navegar = (novos) => { location.hash = escreverRota(id, { ...params, cargo, ...novos }); };
    const garantir = (nums) => garantirLocais(D, nums, (u) => carregar(u, true));
    if (!liberado && !TELAS_LIVRES.includes(id)) {
      tela.innerHTML = `<div class="cartao">${oferta(foco, D, acesso?.venda)}</div>`;
    } else if (!liberado && id === "candidato") {
      candidato.montarPrevia(tela, { D, geo: geoTela, foco, venda: acesso?.venda });
    } else {
      TELAS.find((t) => t.id === id).mod.montar(tela, {
        D, geo: geoTela, params, navegar, interno, foco, comparados, cores, varCor: varCorDe(foco, comparados), garantir,
      });
    }
    for (const m of ampliados) document.getElementById(m)?.closest(".cartao")?.classList.add("ampliado");
    if (cheio) document.getElementById(cheio)?.closest(".cartao")?.requestFullscreen?.().catch(() => {});
    document.body.dataset.pronta = id;
  };
  const trocarTema = () => {
    aplicarTema(document.documentElement.dataset.tema === "claro" ? "escuro" : "claro");
    render();
  };
  addEventListener("hashchange", render);
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("select, input") || e.metaKey || e.ctrlKey) return;
    const n = Number(e.key);
    const a = nav.querySelectorAll("a")[n - 1];
    if (n >= 1 && a) location.hash = a.getAttribute("href");
    if (e.key === "t" || e.key === "T") trocarTema();
  });
  document.getElementById("tema").onclick = trocarTema;
  render();
}

iniciar();
