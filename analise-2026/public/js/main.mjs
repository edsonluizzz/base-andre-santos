import { indexar } from "./dados.mjs";
import { esc } from "./fmt.mjs";
import { escreverRota, lerRota } from "./rota.mjs";
import { esconderDica } from "./dica.mjs";
import * as panorama from "./telas/panorama.mjs";
import * as andre from "./telas/andre.mjs";

const TELAS = [
  { id: "panorama", nome: "Panorama", mod: panorama },
  { id: "andre", nome: "Votos do André", mod: andre },
];

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

async function iniciar() {
  aplicarTema(lerTema() ?? "escuro");
  const tela = document.getElementById("tela");
  let base;
  try {
    const [dados, geo, interno] = await Promise.all([carregar("dados.json"), carregar("mapa.geo.json"), carregar("interno.json", true)]);
    base = { D: indexar(dados), geo, interno };
  } catch (e) {
    tela.innerHTML = `<div class="aviso">Não consegui carregar os dados (${esc(e.message)}). Rode <code>node analise-2026/coletar/coletar.mjs</code> na raiz do repositório e recarregue.</div>`;
    return;
  }
  const f = base.D.meta.fontes;
  document.getElementById("rodape").textContent =
    `Fontes: TSE — votação por seção (${f.secao}), locais de votação (${f.locais}), resultado oficial (${f.oficial}), prestação de contas (${f.contas}); IBGE — malha municipal. Gerado em ${new Date(base.D.meta.geradoEm).toLocaleString("pt-BR")}.`;
  const nav = document.getElementById("abas");
  nav.innerHTML = TELAS.map((t, k) => `<a href="#${t.id}" data-id="${t.id}"><kbd>${k + 1}</kbd>${t.nome}</a>`).join("");
  const ids = TELAS.map((t) => t.id);

  const render = () => {
    const { tela: id, params } = lerRota(location.hash, ids);
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("ativa", a.dataset.id === id));
    esconderDica();
    tela.replaceChildren();
    tela.style.animation = "none";
    tela.offsetWidth;
    tela.style.animation = "";
    const navegar = (novos) => { location.hash = escreverRota(id, { ...params, ...novos }); };
    TELAS.find((t) => t.id === id).mod.montar(tela, { ...base, params, navegar });
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
    if (n >= 1 && n <= TELAS.length) location.hash = `#${TELAS[n - 1].id}`;
    if (e.key === "t" || e.key === "T") trocarTema();
  });
  document.getElementById("tema").onclick = trocarTema;
  render();
}

iniciar();
