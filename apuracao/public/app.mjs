import { fmtInt, fmtPct, fmtHora, fmtDelta, fmtPos, semContato, selecionarChapa, pontosSparkline, areaSparkline } from "./util.mjs";

const ANDRE = "30777";
const $ = (id) => document.getElementById(id);
const CIRCUNFERENCIA = 2 * Math.PI * 19;
let estado = null;
let escala = 1;

function escalar() {
  escala = Math.min(innerWidth / 1920, innerHeight / 1080);
  const palco = $("palco");
  palco.style.transform = `scale(${escala})`;
  palco.style.left = `${(innerWidth - 1920 * escala) / 2}px`;
  palco.style.top = `${(innerHeight - 1080 * escala) / 2}px`;
}
addEventListener("resize", escalar);
escalar();

function piscar(el, classe = "piscou") {
  el.classList.remove(classe);
  void el.offsetWidth; // reinicia a animação CSS
  el.classList.add(classe);
}

// Conta do valor exibido até o novo. Devolve true se o valor mudou.
function animarNumero(el, alvo, fmt = fmtInt) {
  const de = el._valor;
  el._valor = alvo;
  if (de === undefined || de === alvo) {
    el.textContent = fmt(alvo);
    return false;
  }
  cancelAnimationFrame(el._raf);
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / 1200);
    el.textContent = fmt(de + (alvo - de) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) el._raf = requestAnimationFrame(passo);
  };
  el._raf = requestAnimationFrame(passo);
  piscar(el);
  return true;
}

function criarLinha(k) {
  const li = document.createElement("li");
  li.dataset.k = k;
  for (const classe of ["pos", "nome", "barra", "votos", "pct", "selo"]) {
    const s = document.createElement("span");
    s.className = classe;
    li.append(s);
  }
  li.querySelector(".barra").append(document.createElement("i"));
  li.classList.add("entrou");
  li.addEventListener("animationend", () => li.classList.remove("entrou"), { once: true });
  return li;
}

// Reconciliação por chave + FLIP: a linha desliza da posição antiga para a nova.
function renderLista(ul, itens, montar) {
  const antes = new Map();
  const existentes = new Map();
  for (const li of ul.children) {
    antes.set(li.dataset.k, li.getBoundingClientRect().top);
    existentes.set(li.dataset.k, li);
  }
  const usados = new Set();
  for (const [k, li] of existentes) if (!itens.some((i) => i.k === k)) li.remove();
  itens.forEach((item, i) => {
    const li = existentes.get(item.k) ?? criarLinha(item.k);
    usados.add(item.k);
    // Só mexe no DOM quando a linha mudou de lugar: reinserir reinicia animações
    // e impede a transição de largura das barras.
    if (ul.children[i] !== li) ul.insertBefore(li, ul.children[i] ?? null);
    montar(li, item);
  });
  for (const li of ul.children) {
    const topoAntes = antes.get(li.dataset.k);
    if (topoAntes === undefined) continue;
    const d = (topoAntes - li.getBoundingClientRect().top) / escala;
    if (Math.abs(d) < 1) continue;
    li.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], {
      duration: 900,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
  }
}

function montarLinha(li, d) {
  li.querySelector(".pos").textContent = fmtPos(d.pos, d.votos);
  const nome = li.querySelector(".nome");
  nome.textContent = d.nome;
  if (d.sub) {
    const s = document.createElement("small");
    s.textContent = d.sub;
    nome.append(s);
  }
  li.querySelector(".barra i").style.width = `${Math.max(0, Math.min(100, d.largura))}%`;
  animarNumero(li.querySelector(".votos"), d.votos);
  li.querySelector(".pct").textContent = d.pct == null ? "" : `${fmtPct(d.pct)}%`;
  li.querySelector(".selo").textContent = d.selo ?? "";
  li.classList.toggle("destaque", !!d.destaque);
  li.classList.toggle("vaga", !!d.vaga);
}

function renderAndre(a) {
  $("andre-situacao").classList.toggle("eleito", !!a?.eleito);
  if (!a) {
    $("andre-situacao").textContent = "aguardando dados do TSE";
    return;
  }
  $("andre-nome").textContent = a.nome;
  $("andre-numero").textContent = a.n;
  $("mun-rotulo").textContent = `${a.nome} · ${a.n}`;
  $("mun-titulo").textContent = `${a.nome} POR MUNICÍPIO · 15 MAIORES VOTAÇÕES`;
  animarNumero($("andre-votos"), a.votos);
  animarNumero($("mun-andre-votos"), a.votos);
  $("andre-delta").textContent = fmtDelta(a.delta);
  const chapa = $("andre-pos-chapa");
  if (chapa._pos !== undefined && a.posChapa < chapa._pos) piscar($("andre"), "subiu");
  chapa._pos = a.posChapa;
  chapa.textContent = fmtPos(a.posChapa, a.votos);
  $("andre-pos-geral").textContent = fmtPos(a.posGeral, a.votos);
  $("andre-pos-geral-txt").textContent = `no geral (${fmtInt(a.totalCandidatos)} candidatos)`;
  const pontos = pontosSparkline(a.historico, 400, 110);
  for (const g of document.querySelectorAll(".grafico")) {
    g.querySelector(".linha").setAttribute("points", pontos);
    g.querySelector(".area").setAttribute("points", areaSparkline(pontos, 110));
  }
  $("andre-situacao").textContent = a.eleito ? "ELEITO" : a.situacao || "em apuração";
}

function rodape(footer, c) {
  const item = (rotulo, valor, classe) => {
    const s = document.createElement("span");
    if (classe) s.className = classe;
    const r = document.createElement("small");
    r.textContent = rotulo;
    const b = document.createElement("b");
    b.textContent = valor;
    s.append(r, b);
    return s;
  };
  const partes = [
    item("Legenda", fmtInt(c.novo.legenda)),
    item("Total", fmtInt(c.novo.total)),
    item(c.quocienteOficial ? "Quociente oficial" : "Quociente parcial", fmtInt(c.quociente)),
    item("Vagas", String(c.novo.vagasDiretas), "vagas"),
  ];
  if (c.novo.faltamProxima != null) partes.push(item("Faltam p/ +1 vaga", fmtInt(c.novo.faltamProxima)));
  footer.replaceChildren(...partes);
}

function renderChapa(id, c, limite, fixo) {
  const sec = $(id);
  sec.classList.toggle("vazio", !c);
  if (!c) return;
  const linhas = selecionarChapa(c.candidatos, limite, fixo);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x) => ({
      k: x.n, pos: x.pos, nome: x.nome, sub: x.n, votos: x.votos, pct: null,
      largura: (100 * x.votos) / max, destaque: x.n === fixo,
      selo: x.eleito ? "✔" : "",
    })),
    montarLinha,
  );
  rodape(sec.querySelector("footer"), c);
}

function renderMajor(id, m, limite) {
  const sec = $(id);
  sec.classList.toggle("vazio", !m);
  if (!m) return;
  const linhas = m.candidatos.slice(0, limite);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x, i) => ({
      k: x.n, pos: i + 1, nome: x.nome, sub: x.partido, votos: x.votos, pct: x.pct,
      largura: (100 * x.votos) / max, vaga: i < m.vagas && x.votos > 0,
      selo: x.eleito ? "✔" : /turno/i.test(x.situacao) ? "2ºT" : "",
    })),
    montarLinha,
  );
}

function renderPresidente(p) {
  const sec = $("pres");
  sec.classList.toggle("vazio", !p?.br);
  if (!p?.br) return;
  const noPr = new Map((p.pr?.candidatos ?? []).map((c) => [c.n, c.pct]));
  const linhas = p.br.candidatos.slice(0, 5);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x, i) => ({
      k: x.n, pos: i + 1, nome: x.nome, sub: x.partido, votos: x.votos, pct: x.pct,
      largura: (100 * x.votos) / max, vaga: i === 0 && x.votos > 0,
      selo: noPr.has(x.n) ? `PR ${fmtPct(noPr.get(x.n))}%` : "",
    })),
    montarLinha,
  );
}

function renderMunicipios(m) {
  $("mun").classList.toggle("vazio", !m);
  if (!m) return;
  $("mun-com-votos").textContent = fmtInt(m.comVotos);
  $("mun-com-votos-txt").textContent = `de ${fmtInt(m.total)} municípios com voto`;
  $("mun-atualizado").textContent = `municípios atualizados às ${fmtHora(m.atualizadoEm)}` +
    (m.falhas ? ` · ${m.falhas} sem resposta` : "");
  const max = Math.max(1, m.lista[0]?.votos ?? 0);
  renderLista(
    $("mun").querySelector(".lista"),
    m.lista.map((x, i) => ({
      k: x.cd, pos: i + 1, nome: x.nome, votos: x.votos, pct: x.pctValidos,
      largura: (100 * x.votos) / max, vaga: true,
      selo: `${fmtPct(x.secoesPct, 0)}% apurado`,
    })),
    montarLinha,
  );
}

// Rotação: 40 s na tela principal, 20 s na de municípios. 1/2 fixam, R volta a alternar.
let modo = "auto";
let telaAtual = 1;
let trocaEm = Date.now() + 40000;

function mostrar(n) {
  telaAtual = n;
  $("tela-1").classList.toggle("ativa", n === 1);
  $("tela-2").classList.toggle("ativa", n === 2);
}

function girar() {
  if (modo !== "auto" || Date.now() < trocaEm) return;
  // Sem voto em nenhum município a segunda tela não tem o que mostrar.
  if (telaAtual === 1 && !(estado?.municipios?.comVotos > 0)) return;
  mostrar(telaAtual === 1 ? 2 : 1);
  trocaEm = Date.now() + (telaAtual === 1 ? 40000 : 20000);
}

// Dois avisos possíveis: a página perdeu o servidor local, ou o servidor perdeu o TSE.
function avisar() {
  const aviso = $("aviso");
  if (!estado) return;
  let texto = "";
  if (semContato(estado, Date.now())) {
    texto = `Painel sem contato com o servidor local desde ${fmtHora(estado.geradoEm)} — números parados`;
  } else if (!estado.fonte.ok) {
    texto = estado.fonte.ultimaLeituraOk
      ? `Sem atualização desde ${fmtHora(estado.fonte.ultimaLeituraOk)} — exibindo a última leitura`
      : "Sem resposta do TSE — tentando novamente";
  }
  aviso.hidden = !texto;
  if (aviso.textContent !== texto) aviso.textContent = texto;
}

function render(e) {
  estado = e;
  $("tarja-sim").hidden = !e.simulacao;
  if (typeof e.simulacao === "string") $("tarja-sim").textContent = e.simulacao;
  avisar();
  $("ultima").textContent = e.pr ? `TSE gerou em ${e.pr.tseGeradoEm}` : "aguardando primeira leitura";
  if (e.pr) {
    animarNumero($("secoes-pct"), e.pr.secoesPct, fmtPct);
    $("secoes-barra").style.width = `${e.pr.secoesPct}%`;
  }
  renderAndre(e.andre);
  renderChapa("est", e.estadual, 10, e.andre?.n ?? ANDRE);
  renderChapa("fed", e.federal, 8, null);
  renderMajor("gov", e.governador, 5);
  renderMajor("sen", e.senador, 6);
  if (e.senador) $("sen-titulo").textContent = `SENADOR · ${e.senador.vagas} ${e.senador.vagas === 1 ? "VAGA" : "VAGAS"}`;
  renderPresidente(e.presidente);
  renderMunicipios(e.municipios);
}

function tique() {
  $("hora").textContent = new Date().toLocaleTimeString("pt-BR");
  if (estado) {
    const total = Math.max(1, estado.proximaBuscaEm - estado.geradoEm);
    const resta = Math.max(0, estado.proximaBuscaEm - Date.now());
    $("contagem").textContent = Math.ceil(resta / 1000);
    $("anel-arco").style.strokeDashoffset = CIRCUNFERENCIA * (1 - resta / total);
    $("anel").classList.toggle("buscando", resta === 0);
    avisar();
  }
  girar();
  requestAnimationFrame(tique);
}

// Tema: escuro (padrão) ou claro. T alterna; a escolha fica guardada neste navegador.
function lerTemaSalvo() {
  try { return localStorage.getItem("tema"); } catch { return null; }
}
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema === "claro" ? "claro" : "escuro";
  try { localStorage.setItem("tema", document.documentElement.dataset.tema); } catch { /* navegação privada */ }
}
aplicarTema(new URLSearchParams(location.search).get("tema") ?? lerTemaSalvo() ?? "escuro");

addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k === "t") {
    aplicarTema(document.documentElement.dataset.tema === "claro" ? "escuro" : "claro");
  } else if (k === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } else if (k === "1" || k === "2") {
    modo = "fixo";
    mostrar(Number(k));
  } else if (k === "r") {
    modo = "auto";
    trocaEm = Date.now() + 5000;
  }
});

// EventSource reconecta sozinho; o servidor reenvia o estado atual a cada conexão.
new EventSource("/events").onmessage = (ev) => render(JSON.parse(ev.data));
tique();
