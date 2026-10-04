import { fmtInt, fmtPct, fmtHora, fmtDelta, fmtPos, semContato, selecionarLinhas, seloSituacao, pontosSparkline, areaSparkline } from "./util.mjs";

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
    const r = li.getBoundingClientRect();
    antes.set(li.dataset.k, { top: r.top, left: r.left });
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
    const pos = antes.get(li.dataset.k);
    if (pos === undefined) continue;
    const agora = li.getBoundingClientRect();
    const dy = (pos.top - agora.top) / escala;
    const dx = (pos.left - agora.left) / escala; // lista de municípios tem duas colunas
    if (Math.abs(dy) < 1 && Math.abs(dx) < 1) continue;
    li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
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
  const selo = li.querySelector(".selo");
  selo.textContent = d.selo ?? "";
  selo.dataset.tipo = /^ELEITO/.test(d.selo ?? "") ? "eleito" : d.selo === "SUPLENTE" ? "suplente" : d.selo === "2º TURNO" ? "turno" : "";
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
  $("mun-titulo").textContent = `${a.nome} POR MUNICÍPIO · 30 MAIORES VOTAÇÕES`;
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
  if (c.novo.eleitos > 0) partes.push(item("Eleitos NOVO", String(c.novo.eleitos), "eleitos"));
  footer.replaceChildren(...partes);
}

function renderChapa(id, c, limite, fixo) {
  const sec = $(id);
  sec.classList.toggle("vazio", !c);
  if (!c) return;
  const linhas = selecionarLinhas(c.candidatos, limite, fixo);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x) => ({
      k: x.n, pos: x.pos, nome: x.nome, sub: x.n, votos: x.votos, pct: null,
      largura: (100 * x.votos) / max, destaque: x.n === fixo,
      selo: seloSituacao(x.situacao, x.eleito),
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
      selo: seloSituacao(x.situacao, x.eleito),
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

// Tela 3: presidente inteiro, Brasil e Paraná lado a lado (atualiza a cada 30 s no modo real).
function renderPresidenteTela(e) {
  const hora = `atualizado às ${fmtHora(e.presidenteAtualizadoEm)}`;
  for (const k of ["br", "pr"]) {
    const sec = $(`pres-${k}`);
    const m = e.presidente?.[k];
    sec.classList.toggle("vazio", !m);
    if (!m) continue;
    sec.querySelector(".pres-hora").textContent = hora;
    animarNumero(sec.querySelector(".pres-pct"), m.secoesPct, fmtPct);
    sec.querySelector(".pres-barra").style.width = `${m.secoesPct}%`;
    const max = Math.max(1, m.candidatos[0]?.votos ?? 0);
    renderLista(
      sec.querySelector(".lista"),
      m.candidatos.map((x, i) => ({
        k: x.n, pos: i + 1, nome: x.nome, sub: x.partido, votos: x.votos, pct: x.pct,
        largura: (100 * x.votos) / max, vaga: i === 0 && x.votos > 0,
        destaque: x.partido === "NOVO",
        selo: seloSituacao(x.situacao, x.eleito),
      })),
      montarLinha,
    );
    const rodape = sec.querySelector(".pres-rodape");
    const bloco = (rotulo, valor) => {
      const s = document.createElement("span");
      const r = document.createElement("small");
      r.textContent = rotulo;
      const b = document.createElement("b");
      b.textContent = valor;
      s.append(r, b);
      return s;
    };
    rodape.replaceChildren(
      bloco("Comparecimento", `${fmtPct(m.comparecimentoPct)}%`),
      bloco("Votos válidos", fmtInt(m.validos)),
      bloco("Brancos", fmtInt(m.brancos)),
      bloco("Nulos", fmtInt(m.nulos)),
    );
  }
}

// Tela 4: todos os eleitos a deputado, de todos os partidos (só quando o TSE marcar).
// Até lá, explica por que está vazia em vez de mostrar uma grade em branco.
function renderEleitos(e) {
  const nenhum = !(e.eleitos?.estadual?.length || e.eleitos?.federal?.length);
  const espera = $("eleitos-espera");
  espera.hidden = !nenhum;
  if (nenhum) {
    espera.querySelector("b").textContent = e.pr ? `${fmtPct(e.pr.secoesPct)}%` : "—";
    espera.querySelector("small").textContent = e.pr ? `arquivo do TSE gerado em ${e.pr.tseGeradoEm}` : "";
  }
  for (const [id, lista, vagas] of [["eleitos-est", e.eleitos?.estadual ?? [], 54], ["eleitos-fed", e.eleitos?.federal ?? [], 30]]) {
    const sec = $(id);
    sec.querySelector(".eleitos-conta").textContent = `${lista.length} de ${vagas}`;
    const ol = sec.querySelector("ol");
    ol.replaceChildren(...lista.map((c, i) => {
      const li = document.createElement("li");
      li.classList.toggle("destaque", c.partido === "NOVO");
      const pos = document.createElement("span");
      pos.className = "pos";
      pos.textContent = `${i + 1}`;
      const nome = document.createElement("span");
      nome.className = "nome";
      nome.textContent = c.nome;
      const partido = document.createElement("small");
      partido.textContent = c.partido;
      nome.append(" ", partido);
      const votos = document.createElement("span");
      votos.className = "votos";
      votos.textContent = fmtInt(c.votos);
      li.append(pos, nome, votos);
      return li;
    }));
  }
}

// Rotação entre as telas que têm o que mostrar. 1–4 fixam uma tela, R volta a alternar.
const TELAS = [
  { n: 1, dur: 40000, ok: () => true },
  { n: 2, dur: 20000, ok: () => estado?.municipios?.comVotos > 0 },
  { n: 3, dur: 20000, ok: () => !!estado?.presidente?.br },
  { n: 4, dur: 25000, ok: () => (estado?.eleitos?.estadual?.length ?? 0) + (estado?.eleitos?.federal?.length ?? 0) > 0 },
];
let modo = "auto";
let telaAtual = 1;
let trocaEm = Date.now() + 40000;

function mostrar(n) {
  telaAtual = n;
  for (const t of TELAS) $(`tela-${t.n}`).classList.toggle("ativa", t.n === n);
}

function girar() {
  if (modo !== "auto" || Date.now() < trocaEm) return;
  const i = TELAS.findIndex((t) => t.n === telaAtual);
  for (let passo = 1; passo <= TELAS.length; passo++) {
    const t = TELAS[(i + passo) % TELAS.length];
    if (!t.ok()) continue;
    if (t.n !== telaAtual) mostrar(t.n);
    trocaEm = Date.now() + t.dur;
    return;
  }
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
  renderPresidenteTela(e);
  renderEleitos(e);
}

function tique() {
  $("hora").textContent = new Date().toLocaleTimeString("pt-BR");
  if (estado) {
    // Na tela de presidente o anel mostra o ciclo de 30 s dela.
    const presidente = telaAtual === 3 && estado.proximaPresEm;
    const inicio = presidente ? estado.presidenteAtualizadoEm : estado.geradoEm;
    const fim = presidente ? estado.proximaPresEm : estado.proximaBuscaEm;
    const total = Math.max(1, fim - inicio);
    const resta = Math.max(0, fim - Date.now());
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
  } else if (["1", "2", "3", "4"].includes(k)) {
    modo = "fixo";
    mostrar(Number(k));
  } else if (k === "p") {
    window.open("/municipios.pdf", "_blank");
  } else if (k === "r") {
    modo = "auto";
    trocaEm = Date.now() + 5000;
  }
});

// EventSource reconecta sozinho; o servidor reenvia o estado atual a cada conexão.
new EventSource("/events").onmessage = (ev) => render(JSON.parse(ev.data));
tique();
