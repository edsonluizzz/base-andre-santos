// Base dos vídeos longos: palco (fundo, varredura, fim com CTA), peças em HTML e uma linha do tempo GSAP pausada.
// Uso numa página: <link base.css> + gsap + (d3 se tiver mapa) + este arquivo; depois
//   const V = videoLongo({ dur: 96, fim: 88, cta: "Comenta: …" });
//   V.cenas([...html das cenas com id]); …animações com V.entra/V.capitulo/V.hemi/…; V.fechar();
// window.__seek(t) posiciona o quadro (../renderizar.mjs grava 30 fps); ?play toca em tempo real.
(function () {
  const fmt = (v) => Math.round(v).toLocaleString("pt-BR");
  const pct = (v, casas = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
  const titulo = (linhas, top) => `<div class="abs titulo" style="top:${top}px">${linhas.map((l) => `<span class="linha">${l.split(" ").map((p) =>
    p.startsWith("*") ? `<span class="p k">${p.replaceAll("*", "")}</span>` : `<span class="p">${p}</span>`).join(" ")}</span>`).join("")}</div>`;
  function hemiciclo(grupos, maioria, filas) {
    const total = grupos.reduce((s, g) => s + g.n, 0), r0 = filas > 5 ? 170 : 200, r1 = 470;
    const raios = [...Array(filas)].map((_, i) => r0 + (r1 - r0) * i / (filas - 1)), somaR = raios.reduce((a, b) => a + b, 0), pos = [];
    let resto = total;
    raios.forEach((r, i) => { const n = i === filas - 1 ? resto : Math.round(total * r / somaR); resto -= n;
      for (let k = 0; k < n; k++) { const a = Math.PI * (1 - k / (n - 1)); pos.push({ a, f: i, x: 500 + r * Math.cos(a), y: 500 - r * Math.sin(a) }); } });
    pos.sort((p, q) => (q.a - p.a) || (p.f - q.f));
    const passo = Math.min((r1 - r0) / (filas - 1), Math.PI * r0 / (Math.round(total * r0 / somaR) - 1)), raio = passo * 0.42;
    const cores = grupos.flatMap((g, gi) => Array(g.n).fill([g.cor, gi]));
    let marca = "";
    if (maioria) { const am = pos[maioria - 1].a, x1 = 500 + (r0 - 40) * Math.cos(am), y1 = 500 - (r0 - 40) * Math.sin(am), x2 = 500 + (r1 + 40) * Math.cos(am), y2 = 500 - (r1 + 40) * Math.sin(am);
      marca = `<g class="marca"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text x="${x2}" y="${y2 - 18}">maioria: ${maioria}</text></g>`; }
    return `<svg class="hemi" viewBox="0 0 1000 560">${pos.map((p, i) => `<circle class="assento g${cores[i][1]}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${raio.toFixed(1)}" fill="#1b2232" data-cor="${cores[i][0]}"/>`).join("")}${marca}</svg>`;
  }
  const legenda = (grupos, top) => `<div class="legenda" style="top:${top}px">${grupos.map((g, i) => `<span class="lg${i}"><i style="background:${g.cor}"></i>${g.nome}${g.n !== undefined ? ` <b class="conta" data-v="${g.n}">0</b>` : ""}</span>`).join("")}</div>`;
  // mapa: <svg class="mapa" data-mapa="nome">; desenhado por desenharMapas(GEO, MAPAS) (cores por codarea; contorno opcional por UF)
  const mapa = (nome, top, alt = 820) => `<svg class="mapa" data-mapa="${nome}" viewBox="0 0 1000 ${alt}" style="top:${top}px;height:${alt}px"></svg>`;
  function desenharMapas(GEO, MAPAS, CONTORNO) {
    document.querySelectorAll("svg.mapa").forEach((svg) => {
      const alt = +svg.getAttribute("viewBox").split(" ")[3], caminho = d3.geoPath(d3.geoMercator().fitSize([1000, alt], GEO)), cores = MAPAS[svg.dataset.mapa];
      d3.select(svg).append("g").selectAll("path").data(GEO.features).join("path").attr("d", caminho).attr("fill", "#141a26")
        .attr("data-cor", (f) => cores[f.properties.codarea] ?? "#1b2232").attr("data-x", (f) => caminho.centroid(f)[0]);
      if (CONTORNO) d3.select(svg).append("g").attr("class", "ufs").selectAll("path").data(CONTORNO.features).join("path").attr("d", caminho);
    });
  }

  window.videoLongo = function ({ dur, fim, cta }) {
    document.getElementById("palco").insertAdjacentHTML("afterbegin", `<div class="brilho" id="b1"></div><div class="brilho" id="b2"></div><div id="grade"></div>`);
    document.getElementById("palco").insertAdjacentHTML("beforeend", `<div id="varredura"></div><div id="anel"></div>
      <div class="cena" id="fim"><div class="logo">OVILE <b>DIAGNÓSTICO</b></div><div class="tag">Sua eleição,<br><span class="k">voto a voto.</span></div>
      <div class="url">diagnostico.ovile.com.br</div><div id="cta">💬 ${cta}</div></div><div id="flash"></div>`);
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    const V = { tl, fmt, pct, titulo, hemiciclo, legenda, mapa, desenharMapas };
    V.cenas = (lista) => { document.getElementById("cenas").innerHTML = lista.join(""); gsap.set(".cena", { autoAlpha: 0 }); gsap.set(".titulo .p", { yPercent: 110 });
      tl.to("#b1", { x: 320, y: -300, duration: dur, ease: "sine.inOut" }, 0).to("#b2", { x: -240, y: 460, duration: dur, ease: "sine.inOut" }, 0).to("#grade", { x: 72, y: 144, duration: dur, ease: "none" }, 0); };
    V.contar = (el, t, d, f = fmt) => { if (!el) return; const o = { v: 0 }, alvo = +el.dataset.v; tl.to(o, { v: alvo, duration: d, ease: "power2.out", onUpdate: () => (el.textContent = f(o.v)) }, t); };
    V.surge = (alvos, t, extra = {}) => { if (alvos && (alvos.length === undefined || alvos.length)) tl.fromTo(alvos, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .7, ...extra }, t); };
    V.varre = (t) => tl.fromTo("#varredura", { x: 0 }, { x: 1900, duration: .9, ease: "power2.inOut", immediateRender: false }, t);
    V.flash = (t, o = .5) => tl.fromTo("#flash", { opacity: o }, { opacity: 0, duration: .5, ease: "power2.out", immediateRender: false }, t);
    V.entra = (id, t, f) => { const el = document.getElementById(id); tl.to(el, { autoAlpha: 1, duration: .01 }, t).fromTo(el, { scale: 1 }, { scale: 1.035, duration: f - t, ease: "none", immediateRender: false }, t)
      .to(el.querySelectorAll(".titulo .p"), { yPercent: 0, duration: .6, stagger: .08 }, t + .15).to(el, { autoAlpha: 0, filter: "blur(14px)", duration: .35, ease: "power2.in" }, f - .4); return el; };
    V.capitulo = (id, t, f) => { const el = V.entra(id, t, f); V.flash(t, .55);
      tl.from(el.querySelector(".cap small"), { autoAlpha: 0, letterSpacing: "30px", duration: .9 }, t + .1)
        .from(el.querySelector(".cap b"), { autoAlpha: 0, scale: 1.4, filter: "blur(30px)", duration: 1.0, ease: "expo.out" }, t + .2)
        .from(el.querySelector(".cap i"), { scaleX: 0, duration: 1.2, ease: "expo.out" }, t + .5);
      V.surge(el.querySelectorAll(".sub"), t + 2.2, { stagger: .4 }); return el; };
    V.hemi = (el, t) => { const svg = el.querySelector(".hemi"), grupos = [...new Set([...svg.querySelectorAll(".assento")].map((c) => c.classList[1]))];
      tl.from(svg, { autoAlpha: 0, scale: .92, transformOrigin: "50% 90%", duration: .7 }, t + .4);
      grupos.forEach((g, k) => { const a = svg.querySelectorAll("." + g), tg = t + 1.0 + k * 1.2;
        tl.to(a, { attr: { fill: (i, x) => x.dataset.cor }, duration: .2, stagger: 1.0 / a.length }, tg);
        V.surge(el.querySelector(".lg" + k), tg, { duration: .5 }); V.contar(el.querySelector(".lg" + k + " .conta"), tg, 1.0); });
      const m = svg.querySelector(".marca line"); if (m) { tl.from(m, { autoAlpha: 0, duration: .6 }, t + 4.6).from(svg.querySelector(".marca text"), { autoAlpha: 0, y: 20, duration: .5 }, t + 4.9); } };
    V.animarMapa = (el, t, sel = "svg.mapa", dur = 2.4) => { el.querySelectorAll(sel).forEach((svg) => { const ps = [...svg.querySelectorAll("g:first-child path")].sort((a, b) => a.dataset.x - b.dataset.x);
      tl.from(svg, { autoAlpha: 0, scale: .94, duration: .7 }, t + .3).to(ps, { attr: { fill: (k, x) => x.dataset.cor }, duration: .3, stagger: dur / ps.length }, t + .8);
      const u = svg.querySelector(".ufs"); if (u) tl.from(u, { autoAlpha: 0, duration: .6 }, t + .8 + dur); });
      V.surge(el.querySelectorAll(".legenda span"), t + .9 + dur, { stagger: .15, duration: .5 });
      el.querySelectorAll(".legenda .conta").forEach((c, k) => V.contar(c, t + 1.0 + dur + k * .15, .8)); };
    V.barras = (el, t, passo = .8, f = fmt) => { el.querySelectorAll(".bar").forEach((b, k) => { const tb = t + k * passo; V.surge(b, tb, { duration: .5 });
      const e = b.querySelector(".enche"); tl.to(e, { width: e.dataset.w + "%", duration: 1.5, ease: "power2.out" }, tb + .1); V.contar(b.querySelector(".v"), tb + .1, 1.5, f);
      if (b.querySelector(".meta")) tl.from(b.querySelector(".meta"), { autoAlpha: 0, scaleY: 0, duration: .4 }, tb); }); };
    V.pares = (el, t) => { el.querySelectorAll(".par").forEach((p, k) => { const tb = t + k * .9; V.surge(p, tb, { duration: .5 });
      p.querySelectorAll(".t i").forEach((x, j) => tl.to(x, { width: x.dataset.w + "%", duration: 1.2, ease: "power2.out" }, tb + .2 + j * .6)); }); };
    V.lista = (el, t, passo = .4) => V.surge(el.querySelectorAll(".item"), t, { stagger: passo, duration: .5 });
    V.grande = (g, t) => tl.fromTo(g, { autoAlpha: 0, scale: .6, filter: "blur(20px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: .8, ease: "back.out(1.6)" }, t);
    V.fechar = () => {
      tl.fromTo("#anel", { autoAlpha: .9, scale: .05 }, { autoAlpha: 0, scale: 1.2, duration: 1.4, ease: "power2.out", immediateRender: false }, fim);
      V.flash(fim, .5);
      tl.to("#fim", { autoAlpha: 1, duration: .01 }, fim)
        .from("#fim .logo", { autoAlpha: 0, y: 50, filter: "blur(16px)", duration: .7 }, fim)
        .from("#fim .tag", { autoAlpha: 0, scale: .9, filter: "blur(16px)", duration: .8 }, fim + .3)
        .from("#fim .url", { autoAlpha: 0, y: 30, duration: .7, ease: "back.out(2)" }, fim + 1.0)
        .from("#cta", { autoAlpha: 0, scale: .8, y: 40, duration: .7, ease: "back.out(1.8)" }, fim + 2.0)
        .to("#cta", { scale: 1.05, duration: .25, yoyo: true, repeat: 7, ease: "sine.inOut" }, fim + 3.0)
        .to("#palco", { autoAlpha: 0, duration: .8, ease: "power1.in" }, dur - .8).set({}, {}, dur);
      gsap.set("#fim", { autoAlpha: 0 });
      window.__duracao = dur; window.__seek = (t) => { tl.seek(t, false); }; window.__pronto = document.fonts.ready;
      if (location.search.includes("play")) tl.play();
    };
    return V;
  };
})();
