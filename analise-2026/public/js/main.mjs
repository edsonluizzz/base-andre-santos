import { CARGOS, CARGO_PADRAO, MAX_COMPARADOS, UF } from "./config.mjs";
import { buscarCandidato, coresDe, garantirLocais, indexar, lerComparados, nomeCurto, rotuloCandidato, varCorDe } from "./dados.mjs";
import { esc, inteiro } from "./fmt.mjs";
import { escreverRota, lerRota } from "./rota.mjs";
import { esconderDica } from "./dica.mjs";
import { tabela } from "./tabela.mjs";
import { TELAS_LIVRES, estaLiberado, oferta } from "./oferta.mjs";
import { landing } from "./landing.mjs";
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
const GLOBAIS = ["cargo", "c", "vs"];

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
const cacheCargos = new Map();
function dadosDoCargo(id) {
  if (!cacheCargos.has(id)) cacheCargos.set(id, carregar(`dados/${id}.json`).then(indexar));
  return cacheCargos.get(id);
}

const globais = (params) => Object.fromEntries(GLOBAIS.filter((k) => params[k] != null).map((k) => [k, params[k]]));

// Barra fixa: cargo, candidato principal e quem entra na comparação.
function barraEscolha(el, { D, cargo, foco, comparados, cores, mudar }) {
  const opcoes = D.candidatos.map((c) => `<option value="${esc(rotuloCandidato(c))}">`).join("");
  el.innerHTML = `
    <span class="seg">${Object.entries(CARGOS).map(([id, c]) => `<button data-cargo="${id}" class="${id === cargo ? "on" : ""}">${c.curto}</button>`).join("")}</span>
    <label class="campo">Candidato <input id="es-c" list="es-lista" placeholder="Nome ou número" value="${foco ? esc(rotuloCandidato(foco)) : ""}"></label>
    ${foco ? `<span class="campo">Comparar com
      ${comparados.map((c) => `<span class="ficha"><span class="chip" style="background:${cores.get(c.n)}"></span>${esc(nomeCurto(c))}<button data-tirar="${c.n}" title="Tirar da comparação">✕</button></span>`).join("")}
      ${comparados.length < MAX_COMPARADOS ? `<input id="es-vs" list="es-lista" placeholder="+ adicionar">` : ""}
    </span>` : ""}
    <datalist id="es-lista">${opcoes}</datalist>`;
  el.querySelectorAll("[data-cargo]").forEach((b) => {
    b.onclick = () => { if (b.dataset.cargo !== cargo) mudar({ cargo: b.dataset.cargo, c: null, vs: null }); };
  });
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
function telaInicial(el, D, mudar, acesso) {
  const meus = (acesso?.liberados ?? []).filter((k) => k.startsWith(`${D.cargo.id}:`)).map((k) => D.porNumero.get(k.split(":")[1])).filter(Boolean);
  el.innerHTML = `
    ${meus.length ? `<div class="cartao"><h2>Seus diagnósticos</h2><div class="meus">${meus.map((c) =>
      `<a href="#relatorio?cargo=${D.cargo.id}&c=${c.n}">${esc(c.nm)} <small>${c.n} · ${esc(c.sg)}</small></a>`).join("")}</div></div>` : ""}
    ${landing({ D, venda: acesso?.venda, totalCandidatos: 995 })}
    <div class="cartao inicio espaco"><h2>${esc(D.cargo.nome)} · ${UF.nome} · ${inteiro(D.candidatos.length)} candidatos</h2>
    <div id="in-lista" class="rolagem" style="max-height:none"></div></div>`;
  // O # da URL é a rota das telas: âncora vira rolagem por script.
  el.querySelectorAll("[data-rolar]").forEach((b) => {
    b.onclick = () => document.getElementById(b.dataset.rolar)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  tabela(el.querySelector("#in-lista"), {
    linhas: D.candidatos, ordem: 3, busca: "Buscar candidato…", aoClicar: (c) => mudar({ c: c.n, vs: null }),
    colunas: [
      { rotulo: "Candidato", valor: (c) => c.nm },
      { rotulo: "Número", valor: (c) => c.n },
      { rotulo: "Partido", valor: (c) => c.sg },
      { rotulo: "Votos", valor: (c) => c.votos, formato: inteiro, num: true },
      { rotulo: "Situação", valor: (c) => c.st },
    ],
  });
}

async function iniciar() {
  aplicarTema(lerTema() ?? "escuro");
  const tela = document.getElementById("tela");
  const barra = document.getElementById("escolha");
  let geo, interno, acesso;
  try {
    // acesso.json só existe no sistema (online); rodando local, tudo liberado.
    [geo, interno, acesso] = await Promise.all([carregar("mapa.geo.json"), carregar("interno.json", true), carregar("acesso.json", true)]);
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
    let D;
    try {
      D = await dadosDoCargo(cargo);
    } catch (e) {
      tela.innerHTML = `<div class="aviso">Não consegui carregar os dados (${esc(e.message)}). Rode <code>node analise-2026/coletar/coletar.mjs</code> na raiz do repositório e recarregue.</div>`;
      return;
    }
    const foco = D.porNumero.get(params.c) ?? null;
    const comparados = foco ? lerComparados(D, foco, params.vs) : [];
    const cores = foco ? coresDe(foco, comparados) : new Map();
    // Troca de cargo/candidato: mantém a tela e o município, descarta escolhas que dependem do candidato.
    const mudar = (novos) => {
      const p = { ...globais(params), cargo, ...novos };
      if (params.mun && !("cargo" in novos && novos.cargo !== cargo)) p.mun = params.mun;
      location.hash = escreverRota(id, p);
    };
    const liberado = foco ? estaLiberado(acesso, cargo, foco.n) : false;
    // Votos por local só para quem comprou (a rota responde 403 aos demais).
    if (foco && liberado) await garantirLocais(D, [foco.n, ...comparados.map((c) => c.n), params.b ?? ""], (u) => carregar(u, true));
    if (minha !== vez) return; // outra navegação começou enquanto carregava

    document.title = foco ? `${nomeCurto(foco)} · Ovile Diagnóstico` : `Ovile Diagnóstico · Eleição 2026 ${UF.sigla}`;
    document.getElementById("cargo-titulo").textContent = `${CARGOS[cargo].curto.toUpperCase()} ${UF.sigla}`;
    const f = D.meta.fontes;
    document.getElementById("rodape").textContent =
      `Fontes: TSE — votação por seção (${f.secao}), locais de votação (${f.locais}), resultado oficial (${f.oficial}), prestação de contas (${f.contas}); IBGE — malha municipal. Gerado em ${new Date(D.meta.geradoEm).toLocaleString("pt-BR")}.`;
    barraEscolha(barra, { D, cargo, foco, comparados, cores, mudar });
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
    tela.replaceChildren();
    tela.style.animation = "none";
    tela.offsetWidth;
    tela.style.animation = "";
    document.body.dataset.tela = foco ? id : "inicio";
    if (!foco) {
      telaInicial(tela, D, mudar, acesso);
      document.body.dataset.pronta = "inicio";
      return;
    }
    const navegar = (novos) => { location.hash = escreverRota(id, { ...params, cargo, ...novos }); };
    const garantir = (nums) => garantirLocais(D, nums, (u) => carregar(u, true));
    if (!liberado && !TELAS_LIVRES.includes(id)) {
      tela.innerHTML = `<div class="cartao">${oferta(foco, D, acesso?.venda)}</div>`;
    } else if (!liberado && id === "candidato") {
      candidato.montarPrevia(tela, { D, geo, foco, venda: acesso?.venda });
    } else {
      TELAS.find((t) => t.id === id).mod.montar(tela, {
        D, geo, params, navegar, interno, foco, comparados, cores, varCor: varCorDe(foco, comparados), garantir,
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
