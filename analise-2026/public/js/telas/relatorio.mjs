// Relatório de diagnóstico do candidato, em folhas A4: na tela é uma prévia; "Baixar PDF" usa a impressão do navegador.
import { UF } from "../config.mjs";
import { agremiacaoDe, chapa, locaisDoMunicipio, nomeCurto, percentuais, porBairro, porRegiao, posicaoGeral, serie } from "../dados.mjs";
import { concentracao, pearson, quantil, regressaoLog, rsPorVoto, sobreposicao } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { esc, inteiro, pct, reais, reaisCurto } from "../fmt.mjs";
import { folgaQuociente } from "./panorama.mjs";
import { eficienciaVoto, medianaChapa } from "./custo.mjs";

const nf2 = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const linhasTabela = (cab, linhas) => `<table><thead><tr>${cab.map((c, k) => `<th class="${k ? "n" : ""}">${c}</th>`).join("")}</tr></thead>
  <tbody>${linhas.map((l) => `<tr class="${l.classe ?? ""}">${l.cels.map((c, k) => `<td class="${k ? "n" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

// Todos os números do relatório, calculados uma vez (as frases e as tabelas usam o mesmo objeto).
export function diagnostico(D, foco, comparados) {
  const ag = agremiacaoDe(D, foco);
  const lista = chapa(D, foco);
  const vMun = serie(foco, "mun"), pMun = percentuais(D, foco, "mun");
  const vLoc = serie(foco, "loc");
  const cMun = concentracao([...vMun.values()]);
  const cLoc = concentracao([...vLoc.values()]);
  const pctGeral = D.cargo.validos ? foco.votos / D.cargo.validos : 0;
  const topMun = [...vMun].sort((a, b) => b[1] - a[1]);
  const regioes = Object.entries(porRegiao(D, foco)).sort((a, b) => b[1] - a[1]);
  // Espaço para crescer: cidades grandes onde o candidato ficou abaixo da metade do seu % no estado.
  const espaco = D.municipios.map((m, i) => ({ i, validos: m.validos, p: pMun.get(i) ?? 0, v: vMun.get(i) ?? 0 }))
    .filter((x) => x.p < pctGeral / 2)
    .sort((a, b) => b.validos - a.validos)
    .slice(0, 10)
    .map((x) => ({ ...x, potencial: Math.round(x.validos * pctGeral) - x.v }));
  const fit = regressaoLog(D.candidatos.map((c) => ({ x: c.receita, y: c.votos })));
  const ef = eficienciaVoto(fit, foco, "receita");
  const rpv = rsPorVoto(foco.receita, foco.votos);
  const naChapa = lista.filter((c) => c.receita != null && c.votos > 0).map((c) => ({ c, v: rsPorVoto(c.receita, c.votos) })).sort((a, b) => a.v - b.v);
  const rivais = comparados.map((c) => {
    const sl = sobreposicao(vLoc, serie(c, "loc"));
    const vc = serie(c, "mun");
    let ganhaDele = 0, perdeDele = 0;
    for (const i of new Set([...vMun.keys(), ...vc.keys()])) {
      const a = vMun.get(i) ?? 0, b = vc.get(i) ?? 0;
      if (a > b) ganhaDele++; else if (b > a) perdeDele++;
    }
    const pc = percentuais(D, c, "mun");
    const ondeEleForte = D.municipios.map((m, i) => ({ i, d: (pc.get(i) ?? 0) - (pMun.get(i) ?? 0), v: vc.get(i) ?? 0, a: vMun.get(i) ?? 0 }))
      .filter((x) => x.d > 0).sort((a, b) => b.v - b.a - (a.v - a.a)).slice(0, 8);
    return {
      c, r: pearson(pMun, pc), fracFoco: sl.fracA, fracDele: sl.fracB, ganhaDele, perdeDele, ondeEleForte,
      rpv: rsPorVoto(c.receita, c.votos),
    };
  });
  return {
    ag, lista, vMun, pMun, vLoc, cMun, cLoc, pctGeral, topMun, regioes, espaco, fit, ef, rpv, rivais,
    posGeral: posicaoGeral(D, foco.n), posChapa: lista.indexOf(foco) + 1,
    posCusto: naChapa.findIndex((x) => x.c.n === foco.n) + 1, nCusto: naChapa.length,
    mediana: medianaChapa(lista, "receita"), folga: folgaQuociente(D, ag),
  };
}

// Conclusões em texto corrido, geradas a partir dos números (sem opinião; quem lê decide).
export function conclusoes(D, foco, x) {
  const nome = nomeCurto(foco);
  const out = [];
  out.push(`${nome} teve <b>${inteiro(foco.votos)} votos</b> (${pct(x.pctGeral)} dos válidos): <b>${x.posGeral}º de ${D.candidatos.length}</b> no ${UF.sigla} e ${x.posChapa}º de ${x.lista.length} na chapa ${esc(x.ag.rotulo)}. Situação: ${esc(foco.st)}.`);
  if (x.topMun.length) {
    const [i, v] = x.topMun[0];
    out.push(`A base é ${x.cMun.p50 <= 3 ? "<b>muito concentrada</b>" : x.cMun.p50 <= 15 ? "<b>concentrada</b>" : "<b>espalhada</b>"}: ${inteiro(x.cMun.p50)} município(s) fizeram metade dos votos e ${inteiro(x.cMun.p80)} fizeram 80%, de ${inteiro(x.cMun.n)} com voto. A principal cidade é <b>${esc(D.municipios[i].nm)}</b>, com ${pct(v / foco.votos, 1)} do total.`);
  }
  const [reg, vr] = x.regioes[0] ?? [];
  if (reg && foco.votos) out.push(`Por região, <b>${reg}</b> respondeu por ${pct(vr / foco.votos, 1)} dos votos${x.regioes[1]?.[1] ? `, seguida de ${x.regioes[1][0]} (${pct(x.regioes[1][1] / foco.votos, 1)})` : ""}.`);
  if (x.rpv != null) {
    const comp = x.mediana ? (x.rpv < x.mediana ? `abaixo da mediana da chapa (${reais(x.mediana)})` : `acima da mediana da chapa (${reais(x.mediana)})`) : "";
    out.push(`Cada voto custou <b>${reais(x.rpv)}</b> de receita declarada, ${comp}${x.posCusto ? ` — o ${x.posCusto}º mais barato de ${x.nCusto} na chapa` : ""}.${x.ef ? ` Pela curva receita × votos do ${UF.sigla}, um candidato médio com ${reaisCurto(foco.receita)} faria ${inteiro(x.ef.previsto)} votos: o resultado foi <b>${nf2(x.ef.razao)}× o esperado</b>.` : ""}`);
  } else {
    out.push("Não há receita declarada na prestação de contas parcial do TSE, então o custo por voto não pôde ser calculado.");
  }
  const maisPerto = [...x.rivais].sort((a, b) => b.fracFoco - a.fracFoco)[0];
  if (maisPerto) out.push(`Entre os comparados, quem mais divide a base é <b>${esc(nomeCurto(maisPerto.c))}</b>: ${pct(maisPerto.fracFoco, 0)} dos votos de ${nome} estão em locais onde ${esc(nomeCurto(maisPerto.c))} também teve voto.`);
  if (x.espaco.length) out.push(`Maiores cidades com espaço para crescer (abaixo da metade do desempenho no estado): ${x.espaco.slice(0, 4).map((e) => esc(D.municipios[e.i].nm)).join(", ")}. Só alcançar a média estadual nessas ${x.espaco.length} cidades somaria cerca de <b>${inteiro(x.espaco.reduce((s, e) => s + e.potencial, 0))} votos</b>.`);
  out.push(`A chapa ${esc(x.ag.rotulo)} fez ${inteiro(x.folga.total)} votos (${x.ag.vagas} cadeira(s)); faltaram ${inteiro(x.folga.falta)} para a ${x.folga.diretas + 1}ª pelo quociente (${inteiro(D.cargo.qe)}).`);
  return out;
}

function folha(titulo, corpo, sub = "") {
  return `<section class="folha"><div class="folha-topo"><span>${titulo}</span><span>${sub}</span></div>${corpo}</section>`;
}

export function montar(el, { D, geo, foco, comparados, cores }) {
  // O relatório é sempre claro (vira papel); a tela volta ao tema do usuário na próxima navegação.
  document.documentElement.dataset.tema = "claro";
  const x = diagnostico(D, foco, comparados);
  const nome = esc(nomeCurto(foco));
  const hoje = new Date().toLocaleDateString("pt-BR");
  const assinatura = `${esc(foco.nm)} · ${foco.n} · ${esc(D.cargo.nome)} ${UF.sigla} 2026`;
  const principal = x.topMun[0]?.[0] ?? null;

  const kpi = (rot, val, sub = "") => `<div class="rel-kpi"><small>${rot}</small><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const capa = folha("Ovile Diagnóstico · Eleição 2026", `
    <div class="rel-capa">
      <p class="rel-sobre">${esc(D.cargo.nome)} · ${UF.nome} · Eleição 2026</p>
      <h1>${esc(foco.nm)}</h1>
      <p class="rel-sobre">${foco.n} · ${esc(foco.sg)}${x.ag.federacao ? ` (${esc(x.ag.rotulo)})` : ""} · ${esc(foco.st)}</p>
    </div>
    <div class="rel-kpis">
      ${kpi("Votos", inteiro(foco.votos), `${pct(x.pctGeral)} dos válidos`)}
      ${kpi("Posição no estado", `${x.posGeral}º`, `de ${D.candidatos.length}`)}
      ${kpi("Posição na chapa", `${x.posChapa}º`, `de ${x.lista.length} · ${esc(x.ag.rotulo)}`)}
      ${kpi("Municípios com voto", inteiro(x.cMun.n), `de ${D.municipios.length}`)}
      ${kpi("Custo por voto", x.rpv == null ? "—" : reais(x.rpv), "receita ÷ votos")}
      ${kpi("Eficiência", x.ef ? `${nf2(x.ef.razao)}×` : "—", "votos ÷ esperado p/ a receita")}
    </div>
    <h2>Principais conclusões</h2>
    <ol class="rel-conclusoes">${conclusoes(D, foco, x).map((t) => `<li>${t}</li>`).join("")}</ol>`, hoje);

  const geografia = folha("Onde vieram os votos", `
    <div class="rel-2">
      <div><h3>% dos votos válidos por município</h3><div id="rl-mapa"></div><div id="rl-leg"></div></div>
      <div><h3>Por região</h3><div id="rl-reg"></div>
        <h3 class="espaco">Concentração</h3>
        <p>${inteiro(x.cMun.p50)} municípios fazem 50% dos votos e ${inteiro(x.cMun.p80)} fazem 80%.<br>${inteiro(x.cLoc.p50)} locais de votação fazem 50% e ${inteiro(x.cLoc.p80)} fazem 80% (de ${inteiro(x.cLoc.n)} com voto).</p></div>
    </div>
    <h3 class="espaco">Os 15 municípios com mais votos</h3>
    ${linhasTabela(["Município", "Votos", "% do total", "% dos válidos na cidade"], x.topMun.slice(0, 15).map(([i, v]) => ({
      cels: [esc(D.municipios[i].nm), inteiro(v), pct(v / foco.votos, 1), pct(x.pMun.get(i))],
    })))}`, assinatura);

  const locais = [...x.vLoc].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const bairros = principal == null ? [] : porBairro(D, foco, D.municipios[principal].nm).slice(0, 10);
  const cidade = folha("Locais de votação e bairros", `
    ${principal == null ? "" : `<div class="rel-2"><div><h3>${esc(D.municipios[principal].nm)} · locais de votação</h3><div id="rl-mapa-cidade"></div></div>
      <div><h3>Bairros de ${esc(D.municipios[principal].nm)}</h3>${linhasTabela(["Bairro", "Votos", "% no bairro"], bairros.map((b) => ({ cels: [esc(b.bairro), inteiro(b.votos), b.total ? pct(b.votos / b.total) : "—"] })))}</div></div>`}
    <h3 class="espaco">Os 12 locais de votação com mais votos</h3>
    ${linhasTabela(["Local", "Votos", "% no local", "Eleitores"], locais.map(([j, v]) => {
      const l = D.locais[j];
      return { cels: [`${esc(l.nm)}<br><small>${esc(l.bairro ?? "")} · ${esc(D.municipios[l.mun].nm)}</small>`, inteiro(v), pct(l.total ? v / l.total : 0), inteiro(l.aptos)] };
    }))}`, assinatura);

  const todos = [foco, ...comparados];
  const custo = folha("Custo do voto e concorrentes", `
    <h3>Dinheiro × votos</h3>
    ${linhasTabela(["Candidato", "Votos", "Receita declarada", "R$ por voto", "Eficiência"], [
      ...todos.map((c) => {
        const e = eficienciaVoto(x.fit, c, "receita");
        return { classe: c === foco ? "foco" : "", cels: [`<span class="chip" style="background:${cores.get(c.n)}"></span>${esc(c.nm)} <small>(${esc(c.sg)})</small>`, inteiro(c.votos), reais(c.receita, 0), c.receita == null ? "—" : reais(rsPorVoto(c.receita, c.votos)), e ? `${nf2(e.razao)}×` : "—"] };
      }),
      { classe: "suave", cels: [`Mediana da chapa ${esc(x.ag.rotulo)}`, "", "", reais(x.mediana || null), ""] },
    ])}
    <p class="nota">Eficiência = votos obtidos ÷ votos que a curva receita × votos de todos os candidatos do ${UF.sigla} prevê para aquela receita. Acima de 1× = rendeu mais que a média.</p>
    ${x.rivais.length ? `<h3 class="espaco">Disputa de base com os comparados</h3>
    ${linhasTabela(["Concorrente", "Votos", "Seus votos onde ele também teve", "Correlação geográfica", "Municípios: você × ele"], x.rivais.map((r) => ({
      cels: [`<span class="chip" style="background:${cores.get(r.c.n)}"></span>${esc(r.c.nm)} <small>(${esc(r.c.sg)})</small>`, inteiro(r.c.votos), pct(r.fracFoco, 0), r.r == null ? "—" : nf2(r.r), `${inteiro(r.ganhaDele)} × ${inteiro(r.perdeDele)}`],
    })))}
    <p class="nota">Correlação geográfica: 1 = votam nos mesmos lugares na mesma proporção; 0 = sem relação; negativo = bases opostas. "Municípios: você × ele" = em quantas cidades cada um teve mais votos.</p>
    <div class="rel-2 espaco">${x.rivais.slice(0, 2).map((r) => `<div><h3>Onde ${esc(nomeCurto(r.c))} foi mais forte que ${nome}</h3>
      ${linhasTabela(["Município", nome, esc(nomeCurto(r.c))], r.ondeEleForte.map((o) => ({ cels: [esc(D.municipios[o.i].nm), inteiro(o.a), inteiro(o.v)] })))}</div>`).join("")}</div>` : ""}`, assinatura);

  const crescer = folha("Espaço para crescer e metodologia", `
    <h3>Maiores cidades onde ${nome} ficou abaixo da metade do seu desempenho no estado</h3>
    ${linhasTabela(["Município", "Votos válidos", "Votos de " + nome, "% dos válidos", `Votos na média do ${UF.sigla}`], x.espaco.map((e) => ({
      cels: [esc(D.municipios[e.i].nm), inteiro(e.validos), inteiro(e.v), pct(e.p), inteiro(e.v + e.potencial)],
    })))}
    <p class="nota">"Votos na média" = votos válidos da cidade × ${pct(x.pctGeral)} (o desempenho de ${nome} no estado inteiro). É uma referência de tamanho de mercado, não uma previsão.</p>
    <h3 class="espaco">Metodologia e fontes</h3>
    <ul class="rel-metodo">
      <li>Votação por seção, locais de votação, resultado oficial e prestação de contas: dados abertos do TSE. Malha municipal: IBGE.</li>
      <li>A soma dos votos por seção de cada candidato foi conferida com o resultado oficial: ${inteiro(D.candidatos.length - (D.meta.divergencias ?? 0))} de ${inteiro(D.candidatos.length)} batem exatamente.</li>
      <li>Custo do voto = receita declarada ÷ votos, supondo que o candidato gastou o que arrecadou. A prestação de contas usada é a parcial (${esc(D.meta.fontes.contas)}); a final sai em novembro.</li>
      <li>"% dos válidos" = votos do candidato ÷ votos nominais e de legenda válidos para ${esc(D.cargo.nome.toLowerCase())} no município; no local de votação, ÷ votos nominais do local.</li>
      <li>A curva receita × votos mostra associação entre candidatos, não prova que mais dinheiro causa mais voto.</li>
    </ul>
    <p class="nota espaco">Fontes: votação por seção (${esc(D.meta.fontes.secao)}), locais (${esc(D.meta.fontes.locais)}), resultado oficial (${esc(D.meta.fontes.oficial)}). Relatório gerado em ${hoje}.</p>`, assinatura);

  el.innerHTML = `
    <div class="rel-acoes">
      <button id="rl-pdf" class="principal">⬇ Baixar PDF</button>
      <small>Na janela que abrir, escolha <b>Salvar como PDF</b> (papel A4, sem cabeçalhos). A comparação usa os candidatos escolhidos em “Comparar com”.</small>
    </div>
    <div class="relatorio">${capa}${geografia}${cidade}${custo}${crescer}</div>`;
  el.querySelector("#rl-pdf").onclick = () => {
    const titulo = document.title;
    document.title = `Diagnóstico ${nomeCurto(foco)} ${foco.n} - ${D.cargo.nome} 2026`; // vira o nome do arquivo
    print();
    document.title = titulo;
  };

  const max = Math.max(1e-9, quantil([...x.pMun.values()], 0.98));
  const escala = escalaSeq(max, "--laranja");
  const mapa = criarMapa(el.querySelector("#rl-mapa"), { geo, D });
  mapa.colorir((i) => (x.pMun.get(i) ? escala(x.pMun.get(i)) : null));
  legenda(el.querySelector("#rl-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0%", max: pct(max), titulo: "% dos válidos" });
  barras(el.querySelector("#rl-reg"), x.regioes.map(([k, v]) => ({ rotulo: k, valor: v, classe: "foco" })),
    { formato: (v) => `${inteiro(v)} · ${foco.votos ? pct(v / foco.votos, 1) : "—"}` });

  if (principal != null) {
    const mc = criarMapa(el.querySelector("#rl-mapa-cidade"), { geo, D });
    const daCidade = new Set(locaisDoMunicipio(D, principal));
    const pLoc = percentuais(D, foco, "loc");
    const maxP = Math.max(1e-9, quantil([...pLoc].filter(([j]) => daCidade.has(j)).map(([, p]) => p), 0.98));
    const sLoc = escalaSeq(maxP, "--laranja");
    const maxV = Math.max(1, ...[...x.vLoc].filter(([j]) => daCidade.has(j)).map(([, v]) => v));
    mc.colorir(() => null);
    mc.pontos([...x.vLoc].filter(([j]) => daCidade.has(j)).map(([j, v]) => ({ j, raio: 2 + 10 * Math.sqrt(v / maxV), cor: sLoc(pLoc.get(j)) })), { semLimiar: true });
    mc.focar(principal);
  }
}
