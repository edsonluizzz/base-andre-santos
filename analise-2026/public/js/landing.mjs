// Página de venda do Ovile Diagnóstico (raiz do site, sem candidato escolhido).
// O exemplo é fictício: telas geradas com ?demo (nomes, números e partidos inventados; ver demo.mjs).
// Números do exemplo abaixo saem do relatório da candidata fictícia "Simone Gonçalves" (demo de 09/10/2026).
// Animações: GSAP + ScrollTrigger auto-hospedados (vendor/); tudo desliga com prefers-reduced-motion.
import { UF } from "./config.mjs";
import { esc, inteiro } from "./fmt.mjs";
import { percentuais } from "./dados.mjs";
import { linkCompra } from "./oferta.mjs";

const EXEMPLO = {
  nome: "Simone Gonçalves", partido: "FAROL", votos: 12672, rpv: "R$ 6,01", mediana: "R$ 33,88",
  eficiencia: "5,25", sobreposicao: 99, rival: "Silvana Teixeira", crescer: 2029,
};
// Mapa do hero: geografia de um candidato estadual real, sem nome nem número na tela.
const MAPA_HERO = "30777";

export function linkContato(venda) {
  if (!venda?.whatsapp) return null;
  const texto = "Olá! Quero comprar o Ovile Diagnóstico da eleição 2026. Meu candidato é: ";
  return `https://wa.me/${String(venda.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

const img = (arq, alt, extra = "") => `<img src="img/${arq}" alt="${esc(alt)}" decoding="async" ${extra}>`;
const PASSOS = [
  { img: "mapa-estado.jpg", titulo: "O mapa dos seus votos", texto: "Os 399 municípios coloridos pelo seu desempenho. Toque numa cidade e desça até cada escola onde você teve voto, com bairro e percentual." },
  { img: "custo-barras.jpg", titulo: "Quanto custou cada voto", texto: "Receita declarada ao TSE dividida pelos votos, ao lado da chapa e dos adversários. E quanto você rendeu acima ou abaixo do esperado para o dinheiro." },
  { img: "concorrentes-calor.jpg", titulo: "Quem disputa o seu eleitor", texto: "O sistema encontra os concorrentes com votação parecida com a sua, de qualquer partido. Você compara mapa a mapa e troca quando quiser." },
  { img: "relatorio-5.jpg", titulo: "Onde dá para crescer", texto: "As maiores cidades onde você ficou abaixo do seu próprio desempenho no estado, e quantos votos elas valem na sua média." },
];
const FAQ = [
  ["Serve para quem não foi eleito?", "Principalmente. Suplentes e não eleitos são quem mais precisa saber de onde veio a votação, quanto custou e onde dá para crescer até a próxima eleição."],
  ["De onde vêm os dados?", "Dos dados abertos do TSE: votação por seção eleitoral, locais de votação, resultado oficial e prestação de contas. A soma por seção de cada candidato é conferida com o resultado oficial, e todas batem."],
  ["Posso escolher com quem comparar?", "Sim. O sistema sugere os 3 concorrentes mais parecidos com você em tamanho e geografia, e você troca por qualquer candidato do mesmo cargo, quantas vezes quiser."],
  ["E a prestação de contas, que ainda não é a final?", "O custo do voto usa a prestação parcial publicada pelo TSE. Quando a final sair, em novembro, os números são atualizados no seu link sem custo."],
  ["Quais cargos estão disponíveis?", "No Paraná: deputado estadual e federal (eleição de 2026) e vereador e prefeito (eleição de 2024) nas 399 cidades. Outros estados e eleições estão a caminho."],
  ["Usa dados pessoais de eleitores?", "Não. Só resultados públicos agregados por seção e local de votação, os mesmos que o TSE publica para qualquer pessoa."],
];

export function landing({ venda }) {
  const preco = Number(venda?.preco ?? 297);
  const contato = linkContato(venda);
  // Compra: sempre direto para o WhatsApp. O preço só aparece no fechamento da página (seção final),
  // depois de mostrar o que o diagnóstico entrega; nenhum botão antes disso leva o valor.
  const COMPRAR = "Comprar meu diagnóstico";
  const whats = (rotulo, classe = "lp-btn lp-btn-whats") => (contato ? `<a class="${classe}" href="${esc(contato)}" target="_blank" rel="noopener">${rotulo}</a>` : "");
  const ex = EXEMPLO;

  return `
  <div class="lp">
    <nav class="lp-nav">
      <span class="lp-marca">OVILE <b>DIAGNÓSTICO</b></span>
      <span class="lp-nav-links">
        <button type="button" data-rolar="lp-produto">O que vem</button>
        <button type="button" data-rolar="lp-exemplo">Exemplo</button>
        <button type="button" data-rolar="escolher">Prévia grátis</button>
      </span>
      ${whats("Comprar", "lp-btn lp-btn-whats lp-btn-mini")}
    </nav>

    <section class="lp-hero">
      <div class="lp-hero-txt">
        <p class="lp-eyebrow">Eleições no ${UF.nome}</p>
        <h1 class="lp-h1" data-palavras>Você sabe onde ganhou <em>cada voto?</em></h1>
        <p class="lp-hero-sub">O diagnóstico da sua eleição: mapa até o local de votação, custo de cada voto e quem disputa a sua base.</p>
        <div class="lp-ctas">
          ${whats(COMPRAR, "lp-btn lp-btn-whats lp-btn-grande")}
          <button type="button" class="lp-btn lp-btn-vidro" data-rolar="escolher">Ver prévia grátis</button>
        </div>
      </div>
      <div class="lp-hero-vis">
        <svg class="lp-mapa" id="lp-mapa" viewBox="0 0 800 600" aria-hidden="true"></svg>
        <div class="lp-flutua" style="--x:2%;--y:6%"><small>votos</small><b data-conta="${ex.votos}">0</b></div>
        <div class="lp-flutua" style="--x:64%;--y:0%"><small>por voto</small><b>${ex.rpv}</b></div>
        <div class="lp-flutua" style="--x:58%;--y:78%"><small>acima do esperado</small><b><span data-conta="${ex.eficiencia.replace(",", ".")}" data-casas="2">0</span>×</b></div>
      </div>
    </section>

    <div class="lp-faixa" aria-hidden="true"><div class="lp-faixa-trilho">${
      Array(2).fill(["32.725 candidatos conferidos voto a voto", "399 cidades", "Deputados 2026", "Vereadores e prefeitos 2024", "Dados oficiais do TSE", "Relatório em PDF"]
        .map((t) => `<span>${t}</span>`).join("")).join("")}</div></div>

    <section class="lp-perguntas">
      <h2 class="lp-h2">A eleição acabou.<br><span class="lp-apagado">As perguntas, não.</span></h2>
      <ol class="lp-lista-perguntas">
        <li><b>Onde estão os meus votos de verdade?</b><span>Não só a cidade: o bairro e a escola.</span></li>
        <li><b>O dinheiro rendeu?</b><span>Cada voto custou quanto, perto dos adversários?</span></li>
        <li><b>Quem está atrás do mesmo eleitor?</b><span>E em que cidades cada um levou a melhor.</span></li>
      </ol>
    </section>

    <section class="lp-produto" id="lp-produto">
      <div class="lp-produto-fone">
        <div class="lp-fone">
          <div class="lp-janela-barra"><i></i><i></i><i></i><span>diagnostico.ovile.com.br</span></div>
          <div class="lp-fone-tela">${PASSOS.map((p, i) => img(p.img, p.titulo, `class="${i ? "" : "ativa"}${p.img.startsWith("relatorio") ? " retrato" : ""}" data-tela="${i}"`)).join("")}</div>
        </div>
        <div class="lp-progresso">${PASSOS.map((_, i) => `<i class="${i ? "" : "ativa"}"></i>`).join("")}</div>
      </div>
      <div class="lp-produto-passos">
        ${PASSOS.map((p, i) => `<article class="lp-passo" data-passo="${i}">
          <div class="lp-passo-img">${img(p.img, p.titulo, 'loading="lazy"')}</div>
          <h3>${p.titulo}</h3><p>${p.texto}</p></article>`).join("")}
      </div>
    </section>

    <section class="lp-pdf">
      <h2 class="lp-h2">Tudo num relatório de 5 páginas.</h2>
      <p class="lp-texto">Conclusões em português claro, mapas e tabelas, prontos para levar ao partido, à equipe ou aos apoiadores.</p>
      <div class="lp-leque">${[1, 2, 3, 4, 5].map((n) => `<div class="lp-folha" data-folha="${n}">${img(`relatorio-${n}.jpg`, `Página ${n} do relatório`, 'loading="lazy"')}</div>`).join("")}</div>
    </section>

    <section class="lp-exemplo" id="lp-exemplo">
      <h2 class="lp-h2">O que um diagnóstico revela.</h2>
      <div class="lp-bento">
        <div class="lp-cel lp-cel-grande">
          <small>custo de cada voto de ${esc(ex.nome)}</small>
          <b class="lp-num">${ex.rpv}</b>
          <span>A mediana da chapa ${esc(ex.partido)} foi ${ex.mediana}.</span>
          ${img("custo-barras.jpg", "Dinheiro recebido e votos da candidata e dos concorrentes", 'loading="lazy" class="lp-cel-img"')}
        </div>
        <div class="lp-cel"><small>mais votos que o esperado</small><b class="lp-num"><span data-conta="${ex.eficiencia.replace(",", ".")}" data-casas="2">0</span>×</b><span>para a receita que ela teve</span></div>
        <div class="lp-cel"><small>base dividida</small><b class="lp-num"><span data-conta="${ex.sobreposicao}">0</span>%</b><span>dos votos em locais onde ${esc(ex.rival)} também teve voto</span></div>
        <div class="lp-cel lp-cel-larga"><small>espaço para crescer</small><b class="lp-num">+<span data-conta="${ex.crescer}">0</span></b><span>votos possíveis nas 10 maiores cidades onde ela ficou abaixo da própria média</span></div>
      </div>
    </section>

    <section class="lp-como">
      <h2 class="lp-h2">Três passos, nenhum cadastro.</h2>
      <div class="lp-trilha">
        <svg class="lp-trilha-linha" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="2" x2="1000" y2="2" pathLength="1"/></svg>
        <div class="lp-etapa"><span class="lp-etapa-n">1</span><h3>Veja a prévia grátis</h3><p>Busque seu nome e veja o panorama da eleição e o mapa dos seus votos.</p></div>
        <div class="lp-etapa"><span class="lp-etapa-n">2</span><h3>Peça pelo WhatsApp</h3><p>Pagamento único por Pix. Sem assinatura.</p></div>
        <div class="lp-etapa"><span class="lp-etapa-n">3</span><h3>Receba o seu link</h3><p>Painel completo e relatório em PDF do seu candidato.</p></div>
      </div>
    </section>

    <section class="lp-busca" id="escolher">
      <h2 class="lp-h2">Veja a prévia grátis do seu resultado</h2>
      <div class="lp-busca-caixa">
        <div class="lp-busca-cargos" role="tablist">
          <button type="button" data-cargo-busca="estadual" class="on">Dep. estadual 2026</button>
          <button type="button" data-cargo-busca="federal">Dep. federal 2026</button>
          <button type="button" data-cargo-busca="vereador-2024">Vereador 2024</button>
          <button type="button" data-cargo-busca="prefeito-2024">Prefeito 2024</button>
        </div>
        <div class="lp-busca-cidade" hidden>
          <label class="lp-busca-rotulo" for="lp-cidade">Cidade</label>
          <input id="lp-cidade" class="lp-busca-campo" list="lp-cidades" autocomplete="off" placeholder="Digite a cidade">
          <datalist id="lp-cidades"></datalist>
        </div>
        <label class="lp-busca-rotulo" for="lp-q">Nome de urna ou número</label>
        <input id="lp-q" class="lp-busca-campo" type="search" autocomplete="off" placeholder="Ex.: 30123 ou Maria Souza">
        <ul class="lp-sugestoes" id="lp-sugestoes"></ul>
      </div>
    </section>

    <section class="lp-faq">
      <h2 class="lp-h2">Perguntas frequentes</h2>
      <div class="lp-faq-lista">${FAQ.map(([q, r]) => `<details><summary>${q}</summary><div class="lp-faq-resp"><p>${r}</p></div></details>`).join("")}</div>
    </section>

    <section class="lp-preco" id="lp-preco">
      <div class="lp-preco-card">
        <h2 class="lp-h2">Tudo isso sobre o seu candidato.</h2>
        <ul class="lp-preco-lista">
          <li>Mapa dos votos até o local de votação e o bairro</li>
          <li>Custo de cada voto, contra a chapa e os adversários</li>
          <li>Até 3 concorrentes comparados, trocando quando quiser</li>
          <li>Cidades com espaço para crescer</li>
          <li>Relatório PDF de 5 páginas, pronto para o partido</li>
          <li>Atualização com a prestação de contas final</li>
        </ul>
        <div class="lp-preco-revela">
          <p class="lp-preco-por">Por</p>
          <p class="lp-preco-valor"><span>R$</span>${inteiro(preco)}</p>
          <p class="lp-texto">pagamento único por Pix, sem assinatura</p>
        </div>
        ${whats(COMPRAR, "lp-btn lp-btn-whats lp-btn-largo lp-btn-grande")}
        <p class="lp-preco-como">Você chama no WhatsApp, paga e recebe o link do seu candidato.</p>
      </div>
    </section>

    ${contato ? `<div class="lp-barra-compra" id="lp-barra" aria-hidden="true">
      <span><b>Diagnóstico completo</b> do seu candidato</span>
      ${whats("Comprar pelo WhatsApp", "lp-btn lp-btn-whats")}
    </div>` : ""}

    <footer class="lp-rodape">
      <span class="lp-marca">OVILE <b>DIAGNÓSTICO</b></span>
      <span>Dados públicos do TSE e do IBGE. Sem dados pessoais de eleitores.</span>
    </footer>
  </div>`;
}

// Barra de compra: visível depois do topo; some quando o topo, o preço ou a busca estão na tela.
export function ligarBarra(el) {
  const barra = el.querySelector("#lp-barra");
  if (!barra || !("IntersectionObserver" in window)) return () => {};
  const vistos = new Set();
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target);
    const mostrar = vistos.size === 0;
    barra.classList.toggle("visivel", mostrar);
    barra.setAttribute("aria-hidden", String(!mostrar));
  }, { threshold: 0.15 });
  for (const sel of [".lp-hero", "#lp-preco", "#escolher"]) { const alvo = el.querySelector(sel); if (alvo) io.observe(alvo); }
  return () => io.disconnect();
}

const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

// Busca do candidato: sugestões na hora, troca de cargo sem sair da página.
// Municipais (vereador/prefeito): primeiro a cidade, depois o candidato daquela cidade.
export function ligarBusca(el, { cargoInicial, carregarCargo, carregarCidades, abrir, venda }) {
  const campo = el.querySelector("#lp-q");
  const lista = el.querySelector("#lp-sugestoes");
  const caixaCidade = el.querySelector(".lp-busca-cidade"), campoCidade = el.querySelector("#lp-cidade");
  let cargo = cargoInicial, D = null, cidades = [], cidade = null;
  const municipal = () => /-\d{4}$/.test(cargo);
  const mostrar = () => {
    if (municipal() && !cidade) { lista.innerHTML = `<li class="lp-sug-vazio">Escolha a cidade para ver os candidatos.</li>`; return; }
    if (!D) return;
    const t = normal(campo.value);
    const res = !t ? D.candidatos.slice(0, 6)
      : D.candidatos.filter((c) => c.n.startsWith(t) || normal(c.nm).includes(t)).slice(0, 8);
    // Cada candidato: ver a prévia grátis ou comprar direto (a mensagem já leva nome, número e cargo).
    lista.innerHTML = res.length ? res.map((c) => {
      const compra = linkCompra(venda, c, municipal() ? `${D.cargo.nome} ${D.cargo.ano}, ${D.cargo.municipio.nm}` : D.cargo.nome);
      return `<li class="lp-sug">
        <button type="button" class="lp-sug-ver" data-n="${c.n}">
          <span class="lp-sug-nome">${esc(c.nm)}</span><span class="lp-sug-meta">${c.n} · ${esc(c.sg)} · ${inteiro(c.votos)} votos</span></button>
        <button type="button" class="lp-sug-acao" data-n="${c.n}">Ver prévia</button>
        ${compra ? `<a class="lp-sug-acao lp-sug-comprar" href="${esc(compra)}" target="_blank" rel="noopener">Comprar</a>` : ""}
      </li>`;
    }).join("")
      : `<li class="lp-sug-vazio">Nenhum candidato com esse nome ou número em ${esc(D.cargo.nome.toLowerCase())}.</li>`;
    lista.querySelectorAll("button[data-n]").forEach((b) => { b.onclick = () => abrir(cargo, b.dataset.n, cidade); });
  };
  const trocar = async (id) => {
    cargo = id;
    el.querySelectorAll("[data-cargo-busca]").forEach((b) => b.classList.toggle("on", b.dataset.cargoBusca === id));
    caixaCidade.hidden = !municipal();
    D = null;
    if (municipal()) {
      if (!cidades.length) {
        cidades = await carregarCidades(id.split("-")[1]);
        el.querySelector("#lp-cidades").innerHTML = cidades.map((x) => `<option value="${esc(x.nm)}">`).join("");
      }
      if (cidade) D = await carregarCargo(id, cidade);
    } else {
      lista.innerHTML = `<li class="lp-sug-vazio">Carregando…</li>`;
      D = await carregarCargo(id);
    }
    mostrar();
  };
  campoCidade.addEventListener("change", async () => {
    const x = cidades.find((k) => normal(k.nm) === normal(campoCidade.value));
    cidade = x?.cd ?? null;
    D = cidade ? await carregarCargo(cargo, cidade) : null;
    mostrar();
    if (cidade) campo.focus();
  });
  el.querySelectorAll("[data-cargo-busca]").forEach((b) => { b.onclick = () => trocar(b.dataset.cargoBusca); });
  campo.addEventListener("input", mostrar);
  trocar(cargo);
}

// Mapa do hero: municípios desenhados a traço e depois acesos pela votação de um candidato.
function desenharMapa(svg, { geo, D }) {
  const d3 = globalThis.d3;
  const proj = d3.geoMercator().fitSize([800, 600], geo);
  const caminho = d3.geoPath(proj);
  const c = D.porNumero.get(MAPA_HERO) ?? D.candidatos[150];
  const p = percentuais(D, c, "mun");
  const max = Math.max(1e-9, ...p.values());
  const g = d3.select(svg).append("g");
  g.selectAll("path").data(geo.features).join("path")
    .attr("d", caminho).attr("pathLength", 1)
    .attr("data-forca", (f) => {
      const i = D.munPorIbge.get(f.properties.codarea);
      return i == null ? 0 : Math.sqrt((p.get(i) ?? 0) / max).toFixed(3);
    });
  return g.selectAll("path").nodes();
}

function contar(el, gsap) {
  const alvo = Number(el.dataset.conta), casas = Number(el.dataset.casas ?? 0);
  const fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const o = { v: 0 };
  return gsap.to(o, { v: alvo, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = fmt(o.v); } });
}

export function animarLanding(el, { geo, D }) {
  const gsap = globalThis.gsap, ST = globalThis.ScrollTrigger;
  const paths = desenharMapa(el.querySelector("#lp-mapa"), { geo, D });
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pintar = (path, k = 1) => { path.style.fill = `color-mix(in srgb, var(--laranja) ${Math.round(100 * k * Number(path.dataset.forca))}%, var(--lp-mapa-base))`; };
  if (!gsap || !ST || reduzido) {
    paths.forEach((pth) => pintar(pth));
    el.querySelectorAll("[data-conta]").forEach((n) => {
      const c = Number(n.dataset.casas ?? 0);
      n.textContent = Number(n.dataset.conta).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
    });
    el.classList.add("lp-estatica");
    return () => {};
  }
  gsap.registerPlugin(ST);
  const ctx = gsap.context(() => {
    // Hero: título palavra a palavra, mapa se desenha e acende pela votação, cartões flutuam.
    const h1 = el.querySelector("[data-palavras]");
    h1.innerHTML = h1.innerHTML.replace(/(<em>.*?<\/em>|[^\s<]+)/g, (m) => `<span class="lp-pal"><span>${m}</span></span>`);
    paths.forEach((pth) => { pth.style.fill = "var(--lp-mapa-base)"; });
    const brilho = { k: 0 };
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".lp-pal > span", { yPercent: 110, duration: 0.9, stagger: 0.07 })
      .from(".lp-eyebrow, .lp-hero-sub", { opacity: 0, y: 18, duration: 0.7 }, 0.35)
      .from(".lp-ctas > *", { opacity: 0, y: 18, duration: 0.6, stagger: 0.08 }, 0.5)
      .fromTo(paths, { strokeDashoffset: 1, strokeDasharray: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", stagger: { amount: 0.8, from: "random" } }, 0.2)
      .to(brilho, { k: 1, duration: 1.4, ease: "power2.out", onUpdate: () => paths.forEach((pth) => pintar(pth, brilho.k)) }, 1.5)
      .from(".lp-flutua", { opacity: 0, y: 40, scale: 0.9, duration: 0.7, stagger: 0.15, ease: "back.out(1.7)" }, 1.7)
      .add(() => el.querySelectorAll(".lp-hero [data-conta]").forEach((n) => contar(n, gsap)), 1.8);
    gsap.to(".lp-flutua", { y: "-=10", duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.5, delay: 2.6 });
    // Inclinação leve do mapa seguindo o ponteiro (só com mouse).
    const vis = el.querySelector(".lp-hero-vis");
    if (matchMedia("(pointer: fine)").matches) {
      const rx = gsap.quickTo(vis, "rotationX", { duration: 0.6 }), ry = gsap.quickTo(vis, "rotationY", { duration: 0.6 });
      vis.addEventListener("pointermove", (e) => {
        const r = vis.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      });
      vis.addEventListener("pointerleave", () => { rx(0); ry(0); });
    }

    // Perguntas entram uma a uma; a segunda linha do título acende com a rolagem.
    gsap.from(".lp-lista-perguntas li", { opacity: 0, x: 60, duration: 0.8, stagger: 0.18, ease: "power3.out", scrollTrigger: { trigger: ".lp-perguntas", start: "top 70%" } });
    gsap.fromTo(".lp-apagado", { "--acende": "0%" }, { "--acende": "100%", ease: "none", scrollTrigger: { trigger: ".lp-perguntas", start: "top 75%", end: "top 30%", scrub: true } });

    // Produto: no desktop o celular fica fixo e troca de tela conforme cada passo passa pelo meio da tela.
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const telas = el.querySelectorAll(".lp-fone-tela img"), pontos = el.querySelectorAll(".lp-progresso i");
      const ativar = (i) => {
        telas.forEach((t, k) => t.classList.toggle("ativa", k === i));
        pontos.forEach((t, k) => t.classList.toggle("ativa", k === i));
      };
      el.querySelectorAll(".lp-passo").forEach((passo, i) => {
        ST.create({ trigger: passo, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && ativar(i) });
        gsap.fromTo(passo, { opacity: 0.25 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: passo, start: "top 75%", end: "top 50%", scrub: true } });
      });
      ST.create({ trigger: ".lp-produto", start: "top top", end: "bottom bottom", pin: ".lp-produto-fone", pinSpacing: false });
      gsap.from(".lp-fone", { rotationY: -25, rotationX: 10, y: 80, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".lp-produto", start: "top 75%" } });
    });
    mm.add("(max-width: 899px)", () => {
      gsap.utils.toArray(".lp-passo").forEach((p) => gsap.from(p, { opacity: 0, y: 50, duration: 0.7, scrollTrigger: { trigger: p, start: "top 85%" } }));
    });

    // Relatório: as folhas saem empilhadas e abrem em leque com a rolagem.
    gsap.fromTo(".lp-folha", { rotation: 0, xPercent: 0, y: 60 }, {
      rotation: (i) => (i - 2) * 9, xPercent: (i) => (i - 2) * 62, y: (i) => Math.abs(i - 2) * 26, ease: "none",
      scrollTrigger: { trigger: ".lp-pdf", start: "top 75%", end: "center 45%", scrub: 0.6 },
    });

    // Exemplo: células sobem e os números contam quando entram na tela.
    gsap.from(".lp-cel", { opacity: 0, y: 50, duration: 0.8, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".lp-bento", start: "top 75%" } });
    ST.create({ trigger: ".lp-bento", start: "top 70%", once: true, onEnter: () => el.querySelectorAll(".lp-bento [data-conta]").forEach((n) => contar(n, gsap)) });

    // Como funciona: a linha liga as etapas com a rolagem.
    gsap.fromTo(".lp-trilha-linha line", { strokeDashoffset: 1, strokeDasharray: 1 }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".lp-trilha", start: "top 75%", end: "bottom 60%", scrub: true } });
    gsap.from(".lp-etapa", { opacity: 0, y: 40, duration: 0.7, stagger: 0.2, scrollTrigger: { trigger: ".lp-trilha", start: "top 75%" } });

    // Fechamento: o cartão entra, os itens se acumulam um a um e só então aparece o preço.
    const fecho = gsap.timeline({ scrollTrigger: { trigger: ".lp-preco", start: "top 65%" } });
    fecho.from(".lp-preco-card", { opacity: 0, y: 60, scale: 0.96, duration: 0.8, ease: "power3.out" })
      .from(".lp-preco-lista li", { opacity: 0, x: -30, duration: 0.45, stagger: 0.16, ease: "power3.out" }, 0.3)
      .from(".lp-preco-por", { opacity: 0, y: 12, duration: 0.4 }, "+=0.15")
      .from(".lp-preco-valor", { opacity: 0, scale: 0.6, filter: "blur(18px)", duration: 0.8, ease: "back.out(1.6)" }, "-=0.1")
      .from(".lp-preco-revela .lp-texto, .lp-preco-card .lp-btn, .lp-preco-como", { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, "-=0.3");
    gsap.from(".lp-faq details", { opacity: 0, y: 24, duration: 0.5, stagger: 0.06, scrollTrigger: { trigger: ".lp-faq", start: "top 80%" } });
  }, el);

  // Brilho do cartão de preço acompanha o ponteiro.
  const card = el.querySelector(".lp-preco-card");
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
  // Imagens que carregam depois mudam a altura da página: recalcula os gatilhos.
  el.querySelectorAll("img").forEach((i) => i.complete || i.addEventListener("load", () => ST.refresh(), { once: true }));
  return () => ctx.revert();
}
