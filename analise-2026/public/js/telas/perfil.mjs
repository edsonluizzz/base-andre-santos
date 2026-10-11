// Tela "Perfil do eleitor": de que perfil de lugar vêm os votos do candidato, onde o perfil indica voto que não
// veio (dentro das cidades onde ele já tem base) e quanto o eleitorado de cada cidade trocou de partido entre 2022 e 2026.
import { PERFIL_CATS, PERFIL_DIMENSOES, PERFIL_UFS, UF, posCat } from "../config.mjs";
import { idxMunicipio, locaisDoMunicipio, nomeCurto, ondeLocal, percentuais, unidade } from "../dados.mjs";
import { ajustarModelo, fracoes, perfilDosVotos, somarLocais, volatilidade } from "../perfil.mjs";
import { quantil } from "../calc.mjs";
import { cor, criarMapa, escalaDiv, escalaSeq, legenda } from "../mapa.mjs";
import { tabela } from "../tabela.mjs";
import { seletorMunicipio } from "../seletor.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Força do modelo, em palavras (R² dentro das cidades).
export function forcaModelo(r2) {
  if (r2 == null) return null;
  if (r2 >= 0.3) return { rotulo: "forte", texto: "o perfil do eleitorado explica boa parte de onde o voto saiu" };
  if (r2 >= 0.1) return { rotulo: "moderada", texto: "o perfil ajuda a explicar, mas rede e presença pesam mais" };
  return { rotulo: "fraca", texto: "o voto segue mais rede, igreja, liderança local e presença do que perfil demográfico" };
}
const indice = (a, b) => (a == null || !b ? null : (100 * a) / b);
const fmtIndice = (v) => (v == null ? "—" : String(Math.round(v)));
const corIndice = (v) => (v == null ? "" : v >= 110 ? "var(--laranja)" : v <= 90 ? "var(--azul)" : "inherit");
const sinal = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${inteiro(Math.abs(v))}`;

// Motivo para a tela não se aplicar (ou null).
export function indisponivel(D, foco, perfil) {
  if (D.cargo?.escopo === "municipio") return "O perfil do eleitor está disponível para as eleições gerais (deputado, senador, governador). Para vereador e prefeito, em breve.";
  if (!PERFIL_UFS.includes(UF.sigla)) return `O perfil do eleitor está disponível, por enquanto, só para o Paraná. ${UF.nome} entra em breve.`;
  if (!perfil) return "O perfil do eleitorado deste ano ainda não foi carregado.";
  if (!foco.votos || !foco.loc?.length) return "Este candidato não teve votos para analisar.";
  return null;
}

export function montar(el, { D, geo, params, navegar, foco: a, perfil: PI, outro }) {
  const motivo = indisponivel(D, a, PI);
  if (motivo) { el.innerHTML = `<div class="aviso">${esc(motivo)}</div>`; return; }
  const U = unidade(D);
  const sel = idxMunicipio(D, params.mun);
  const nomeSel = sel == null ? null : D.municipios[sel].nm;
  const irPara = (i) => navegar({ mun: i == null ? null : D.municipios[i].cd });
  const camada = params.camada ?? "espaco";

  const base = fracoes(PI.total);
  const pv = perfilDosVotos(D, a, PI);
  const modelo = ajustarModelo(D, a, PI);
  const forca = forcaModelo(modelo?.r2);
  const vol = outro ? volatilidade(D, outro) : null;
  const anoOutro = outro?.cargo?.ano;
  const real = new Map(a.loc);
  const pLoc = percentuais(D, a, "loc");
  const pMun = percentuais(D, a, "mun");

  // categorias mais acima e mais abaixo da média do estado
  const idx = PERFIL_CATS.map((c, k) => ({ c, k, i: indice(pv.fr[k], base[k]) })).filter((x) => x.i != null);
  const acima = [...idx].sort((x, y) => y.i - x.i)[0];
  const abaixo = [...idx].sort((x, y) => x.i - y.i)[0];

  // lacunas: locais onde o perfil indica mais voto do que veio (só onde há modelo)
  const lacunas = modelo ? [...modelo.esperado].map(([j, e]) => ({ j, l: D.locais[j], esp: e, real: real.get(j) ?? 0, dif: e - (real.get(j) ?? 0) })) : [];
  const lacunasSel = sel == null ? lacunas : lacunas.filter((x) => x.l.mun === sel);
  const somaLacuna = lacunasSel.reduce((s, x) => s + Math.max(0, x.dif), 0);

  const opcoesCamada = [
    ["espaco", "Espaço para crescer"], ["real", "Voto real"],
    ...(vol ? [["vol", `Troca de partido ${Math.min(anoOutro, U.ano)}→${Math.max(anoOutro, U.ano)}`]] : []),
    ...PERFIL_CATS.map((c) => [`cat-${c.id}`, `Perfil: ${c.nome}`]),
  ];

  el.innerHTML = `
    <div class="controles">
      <label class="campo">Mapa <select id="pf-camada">${opcoesCamada.map(([v, r]) => `<option value="${v}"${v === camada ? " selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
      <span id="pf-sel"></span>
    </div>
    <div class="grade g3">
      <div class="cartao kpi"><h2>De onde vêm os votos</h2>
        <b>${acima ? `${esc(acima.c.nome)} ${sinal(acima.i - 100)}%` : "—"}</b>
        <small>${acima ? `os locais onde ${esc(nomeCurto(a))} teve voto têm ${inteiro(Math.abs(acima.i - 100))}% ${acima.i >= 100 ? "mais" : "menos"} eleitores nessa faixa que a média ${esc(U.daArea)}` : ""}${abaixo && abaixo !== acima ? `; menos: ${esc(abaixo.c.nome.toLowerCase())} (${sinal(abaixo.i - 100)}%)` : ""}</small></div>
      <div class="cartao kpi"><h2>Peso do perfil no voto</h2>
        <b>${forca ? `${esc(forca.rotulo)} · ${pct(modelo.r2, 0)}` : "sem dado"}</b>
        <small>${forca ? `${esc(forca.texto)} (comparando locais da mesma cidade, em ${inteiro(modelo.unidades)} cidades)` : "poucos locais com voto para comparar"}</small></div>
      <div class="cartao kpi"><h2>${vol ? `Troca de partido ${Math.min(anoOutro, U.ano)}→${Math.max(anoOutro, U.ano)}` : "Espaço para crescer"}</h2>
        ${vol ? `<b>${pct(vol.estado, 0)}</b><small>do voto nominal ${esc(U.daArea)} mudou de partido entre as duas eleições${sel != null && vol.porMun.has(sel) ? `; em ${esc(nomeSel)}, ${pct(vol.porMun.get(sel), 0)}` : ""}</small>`
          : `<b>${inteiro(somaLacuna)}</b><small>votos que o perfil indica e não vieram${nomeSel ? ` em ${esc(nomeSel)}` : ""}</small>`}</div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>${esc(opcoesCamada.find(([v]) => v === camada)?.[1] ?? "")}${nomeSel ? ` · ${esc(nomeSel)}` : ""}</h2><div id="pf-mapa"></div><div id="pf-leg"></div>
        <small id="pf-nota"></small></div>
      <div class="cartao"><h2>Perfil dos lugares de onde vieram os votos</h2><div id="pf-perfil"></div>
        <small>Índice 100 = igual à média ${esc(U.daArea)}. Acima de 110 (laranja): a faixa pesa mais nos locais onde ${esc(nomeCurto(a))} teve voto; abaixo de 90 (azul): pesa menos.
        É o perfil do <b>lugar</b>, não de quem votou: o TSE não diz quem votou em quem.</small></div>
    </div>
    <div class="cartao espaco"><h2>Onde o perfil indica mais voto do que veio${nomeSel ? ` · ${esc(nomeSel)}` : " · locais de votação"}</h2>
      <div id="pf-lacunas"></div>
      <small>Voto esperado: compara cada local com os outros da mesma cidade, usando o perfil (gênero, idade, escolaridade) dos locais onde ${esc(nomeCurto(a))} foi bem e mal.
      Só entram cidades com pelo menos 30 votos dele${modelo ? ` (${inteiro(modelo.unidades)} cidades, ${inteiro(modelo.n)} locais)` : ""}. Com peso do perfil fraco, leia como pista, não como previsão.</small></div>
    ${sel == null ? "" : `<div class="cartao espaco"><h2>Bairros de ${esc(nomeSel)}</h2><div id="pf-bairros"></div></div>`}
    <div class="cartao espaco"><h2>${U.Uns}: voto, perfil e troca de partido</h2><div id="pf-muns"></div></div>`;

  el.querySelector("#pf-camada").onchange = (e) => navegar({ camada: e.target.value === "espaco" ? null : e.target.value });
  seletorMunicipio(el.querySelector("#pf-sel"), D, sel, irPara);

  // Perfil por dimensão: estado × locais do candidato (× cidade escolhida)
  const perfilSel = sel == null ? null : fracoes(somarLocais(PI, locaisDoMunicipio(D, sel).map((j) => D.locais[j].id)));
  el.querySelector("#pf-perfil").innerHTML = PERFIL_DIMENSOES.map((d) => `<h3>${esc(d.nome)}</h3><table class="perfil-tab"><thead><tr><th>Faixa</th><th class="n">${esc(UF.sigla)}</th>${perfilSel ? `<th class="n">${esc(nomeSel)}</th>` : ""}<th class="n">Locais com voto</th><th class="n">Índice</th></tr></thead><tbody>${d.cats.map((c) => {
    const k = posCat(c.id) - 1, i = indice(pv.fr[k], base[k]);
    return `<tr><td>${esc(c.nome)}</td><td class="n">${pct(base[k], 1)}</td>${perfilSel ? `<td class="n">${pct(perfilSel[k], 1)}</td>` : ""}<td class="n">${pct(pv.fr[k], 1)}</td><td class="n"><b style="color:${corIndice(i)}">${fmtIndice(i)}</b></td></tr>`;
  }).join("")}</tbody></table>`).join("") + (pv.semPerfil ? `<small>${inteiro(pv.semPerfil)} votos em locais sem perfil no TSE (presídios, voto em trânsito) ficam de fora.</small>` : "");

  // Mapa
  const mapa = criarMapa(el.querySelector("#pf-mapa"), { geo, D });
  mapa.aoClicar(irPara);
  const perfilMun = (i) => { const v = PI.porMun.get(D.municipios[i].cd); return v ? fracoes(v) : null; };
  // Por cidade, o esperado soma o mesmo que o real (o modelo compara locais dentro da cidade); o que interessa é
  // quanto faltou nos locais que ficaram abaixo do perfil.
  const faltouMun = new Map();
  for (const x of lacunas) if (x.dif > 0) faltouMun.set(x.l.mun, (faltouMun.get(x.l.mun) ?? 0) + x.dif);
  let valorMun, fmt, escala, titulo, nota = "";
  if (camada === "real") {
    const max = quantil([...pMun.values()], 0.98);
    escala = escalaSeq(max, "--laranja"); valorMun = (i) => pMun.get(i) ?? null; fmt = (v) => pct(v);
    titulo = "% dos válidos"; legenda(el.querySelector("#pf-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0%", max: pct(max), titulo });
  } else if (camada === "vol" && vol) {
    const vs = [...vol.porMun.values()], min = quantil(vs, 0.02), max = quantil(vs, 0.98);
    const s = escalaSeq(max - min, "--roxo"); escala = (v) => s(v - min); valorMun = (i) => vol.porMun.get(i) ?? null; fmt = (v) => pct(v, 0);
    titulo = "voto que trocou de partido"; legenda(el.querySelector("#pf-leg"), { cores: [cor("--mapa-vazio"), cor("--roxo")], min: pct(min, 0), max: pct(max, 0), titulo });
    nota = "Índice de Pedersen: metade da soma das variações de participação de cada partido nos votos nominais. Partido que mudou de nome ou se fundiu conta como troca.";
  } else if (camada.startsWith("cat-")) {
    const k = posCat(camada.slice(4)) - 1;
    const vs = D.municipios.map((_, i) => perfilMun(i)?.[k]).filter((v) => v != null), min = quantil(vs, 0.02), max = quantil(vs, 0.98);
    const s = escalaSeq(max - min, "--azul", { linear: true }); escala = (v) => s(v - min); valorMun = (i) => perfilMun(i)?.[k] ?? null; fmt = (v) => pct(v, 1);
    titulo = `${PERFIL_CATS[k].nome} no eleitorado`; legenda(el.querySelector("#pf-leg"), { cores: [cor("--mapa-vazio"), cor("--azul")], min: pct(min, 0), max: pct(max, 0), titulo });
  } else {
    // espaço: votos que faltaram nos locais abaixo do perfil, somados por cidade
    const max = Math.max(1, quantil([...faltouMun.values()], 0.98));
    escala = escalaSeq(max, "--laranja"); valorMun = (i) => faltouMun.get(i) ?? null; fmt = (v) => `${inteiro(v)} votos`;
    titulo = "votos que faltaram"; legenda(el.querySelector("#pf-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0", max: inteiro(max), titulo });
    nota = "Soma, por cidade, do que faltou nos locais que renderam abaixo do perfil. Escolha uma cidade: nos pontos, azul = local abaixo do perfil, laranja = acima."
  }
  // com cidade escolhida no "espaço", o fundo fica neutro para os pontos (azul/laranja) aparecerem
  const fundoNeutro = sel != null && camada === "espaco";
  mapa.colorir((i) => { const v = valorMun(i); return v == null || fundoNeutro ? null : escala(v); });
  mapa.dicas((i) => {
    const m = D.municipios[i], f = perfilMun(i), v = valorMun(i);
    return `<b>${esc(m.nm)}</b><small>${esc(titulo)}: ${v == null ? "—" : fmt(v)}</small><br>${esc(nomeCurto(a))}: ${inteiro(a.mun.find(([k]) => k === i)?.[1] ?? 0)} votos (${pct(pMun.get(i) ?? 0)})` +
      (faltouMun.has(i) ? `<br>faltaram ${inteiro(faltouMun.get(i))} votos nos locais abaixo do perfil` : "") + (vol?.porMun.has(i) ? `<br>troca de partido: ${pct(vol.porMun.get(i), 0)}` : "") +
      (f ? `<br><small>superior ${pct(f[posCat("e4") - 1], 0)} · 60+ ${pct(f[posCat("i60") - 1], 0)} · 16–24 ${pct(f[posCat("i16") - 1], 0)}</small>` : "") + `<br><small>clique para ver os locais</small>`;
  }, (j) => {
    const x = lacunas.find((y) => y.j === j), l = D.locais[j];
    return `<b>${esc(l.nm)}</b><small>${esc(ondeLocal(D, l) || "sem bairro")}</small><br>${inteiro(real.get(j) ?? 0)} votos (${pct(pLoc.get(j) ?? 0)})${x ? `<br>esperado pelo perfil: ${inteiro(x.esp)} (${sinal(x.real - x.esp)})` : ""}`;
  });
  if (sel != null) {
    mapa.focar(sel);
    const doMun = lacunas.filter((x) => x.l.mun === sel);
    const lim = Math.max(1, ...doMun.map((x) => Math.abs(x.dif)));
    const div = escalaDiv(lim);
    mapa.pontos(doMun.map((x) => ({ j: x.j, raio: 2 + 6 * Math.sqrt(Math.abs(x.dif) / lim), cor: div(x.real - x.esp) })), { semLimiar: true });
  }
  el.querySelector("#pf-nota").textContent = nota;

  // Tabela de lacunas (locais)
  tabela(el.querySelector("#pf-lacunas"), {
    linhas: lacunasSel, ordem: 4, limite: 40, busca: "Buscar local…",
    colunas: [
      { rotulo: "Local", valor: (x) => x.l.nm, formato: (v, x) => `${esc(v)}<br><small>${esc(ondeLocal(D, x.l))}</small>` },
      { rotulo: "Votos", valor: (x) => x.real, formato: (v) => inteiro(v), num: true },
      { rotulo: "% no local", valor: (x) => pLoc.get(x.j) ?? 0, formato: (v) => pct(v), num: true },
      { rotulo: "Esperado", valor: (x) => x.esp, formato: (v) => inteiro(v), num: true },
      { rotulo: "Diferença", valor: (x) => x.dif, formato: (v) => `<b style="color:${v > 0 ? "var(--azul)" : "var(--laranja)"}">${v > 0 ? "faltaram " : "sobraram "}${inteiro(Math.abs(v))}</b>`, num: true },
    ],
  });

  // Bairros da cidade escolhida
  if (sel != null) {
    const acc = new Map();
    for (const j of locaisDoMunicipio(D, sel)) {
      const l = D.locais[j], k = l.bairro ?? "(sem bairro)";
      const x = acc.get(k) ?? { bairro: k, ids: [], votos: 0, total: 0, esp: 0, temEsp: false };
      x.ids.push(l.id); x.votos += real.get(j) ?? 0; x.total += l.total;
      if (modelo?.esperado.has(j)) { x.esp += modelo.esperado.get(j); x.temEsp = true; }
      acc.set(k, x);
    }
    const linhas = [...acc.values()].map((x) => ({ ...x, f: fracoes(somarLocais(PI, x.ids)) }));
    tabela(el.querySelector("#pf-bairros"), {
      linhas, ordem: 1, busca: "Buscar bairro…",
      colunas: [
        { rotulo: "Bairro", valor: (x) => x.bairro },
        { rotulo: "Votos", valor: (x) => x.votos, formato: (v) => inteiro(v), num: true },
        { rotulo: "% no bairro", valor: (x) => (x.total ? x.votos / x.total : 0), formato: (v) => pct(v), num: true },
        { rotulo: "Esperado", valor: (x) => (x.temEsp ? x.esp : null), formato: (v) => (v == null ? "—" : inteiro(v)), num: true },
        { rotulo: "Superior", valor: (x) => x.f[posCat("e4") - 1], formato: (v) => pct(v, 0), num: true },
        { rotulo: "60+", valor: (x) => x.f[posCat("i60") - 1], formato: (v) => pct(v, 0), num: true },
        { rotulo: "16–24", valor: (x) => x.f[posCat("i16") - 1], formato: (v) => pct(v, 0), num: true },
        { rotulo: "Mulheres", valor: (x) => x.f[posCat("f") - 1], formato: (v) => pct(v, 0), num: true },
      ],
    });
  }

  // Municípios
  const linhasMun = D.municipios.map((m, i) => ({ i, m, v: a.mun.find(([k]) => k === i)?.[1] ?? 0, p: pMun.get(i) ?? 0, faltou: faltouMun.get(i) ?? null, vol: vol?.porMun.get(i) ?? null, f: perfilMun(i) }));
  tabela(el.querySelector("#pf-muns"), {
    linhas: linhasMun, ordem: 1, limite: 60, busca: `Buscar ${U.um}…`, aoClicar: (x) => irPara(x.i),
    colunas: [
      { rotulo: U.Um, valor: (x) => x.m.nm },
      { rotulo: "Votos", valor: (x) => x.v, formato: (v) => inteiro(v), num: true },
      { rotulo: "% válidos", valor: (x) => x.p, formato: (v) => pct(v), num: true },
      { rotulo: "Faltaram", valor: (x) => x.faltou, formato: (v) => (v == null ? "—" : inteiro(v)), num: true },
      ...(vol ? [{ rotulo: "Troca de partido", valor: (x) => x.vol, formato: (v) => (v == null ? "—" : pct(v, 0)), num: true }] : []),
      { rotulo: "Superior", valor: (x) => x.f?.[posCat("e4") - 1] ?? null, formato: (v) => (v == null ? "—" : pct(v, 0)), num: true },
      { rotulo: "60+", valor: (x) => x.f?.[posCat("i60") - 1] ?? null, formato: (v) => (v == null ? "—" : pct(v, 0)), num: true },
    ],
  });
}
