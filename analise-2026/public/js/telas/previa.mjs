// Prévia em PDF para divulgação (e-mail aos candidatos): 3 folhas A4 com o que é grátis aberto, uma amostra do
// diagnóstico completo com o resto TARJADO e a oferta com botão de compra. Não aparece no menu; o PDF é gerado
// por analise-2026/previa/gerar.mjs (#previa?cargo=…&c=…). A tarja é um bloco vazio: o dado escondido não vai
// para o PDF (nem como texto invisível).
import { UF } from "../config.mjs";
import { nomeCurto, ondeLocal, unidade } from "../dados.mjs";
import { quantil } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { linkCompra } from "../oferta.mjs";
import { conclusoes, diagnostico, folha, pctFino } from "./relatorio.mjs";

export const VENDA_PADRAO = { whatsapp: "5541999888951", preco: 297 };
const tarja = (largura = 60) => `<span class="tarja" style="width:${largura}px"></span>`;

export function linkPrevia(D, foco) {
  const p = new URLSearchParams({ cargo: D.cargo.id, c: foco.n });
  if (UF.sigla !== "PR") p.set("uf", UF.sigla);
  return `https://diagnostico.ovile.com.br/#panorama?${p}`;
}

export function montar(el, { D, geo, foco, comparados, venda }) {
  document.documentElement.dataset.tema = "claro";
  const v = { ...VENDA_PADRAO, ...(venda ?? {}) };
  const x = diagnostico(D, foco, comparados);
  const U = unidade(D);
  const nome = esc(nomeCurto(foco));
  const assinatura = `${esc(foco.nm)} · ${foco.n} · ${esc(D.cargo.nome)} · ${esc(U.area)} ${U.ano}`;
  const kpi = (rot, val, sub = "") => `<div class="rel-kpi"><small>${rot}</small><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const compra = linkCompra(v, foco, D.cargo.nome);
  const abertas = conclusoes(D, foco, x).slice(0, 2);
  // ranking da chapa: os 8 primeiros e o candidato, se estiver abaixo
  const chapaTop = x.lista.slice(0, 8).concat(x.lista.indexOf(foco) >= 8 ? [foco] : []);

  const capa = folha(`Ovile Diagnóstico · Prévia`, `
    <div class="rel-capa">
      <p class="rel-sobre">Diagnóstico eleitoral · ${esc(D.cargo.nome)} · ${esc(U.area)} ${U.ano}</p>
      <h1>${esc(foco.nm)}</h1>
      <p class="rel-sobre">${foco.n} · ${esc(foco.sg)}${x.ag?.federacao ? ` (${esc(x.ag.rotulo)})` : ""} · ${esc(foco.st)}</p>
    </div>
    <div class="rel-kpis">
      ${kpi("Votos", inteiro(foco.votos), `${pctFino(x.pctGeral)} dos válidos`)}
      ${kpi("Posição no estado", `${x.posGeral}º`, `de ${D.candidatos.length}`)}
      ${kpi(`${U.Uns} com voto`, inteiro(x.cMun.n), `de ${D.municipios.length}`)}
    </div>
    <div class="rel-2 espaco">
      <div><h3>Onde vieram os votos</h3><div id="pv-mapa"></div><div id="pv-leg"></div></div>
      <div><h3>O que os dados já mostram</h3><ol class="rel-conclusoes">${abertas.map((t) => `<li>${t}</li>`).join("")}</ol>
        <p class="pv-gancho">Isto é só a capa. O diagnóstico completo vai até o <b>local de votação e o bairro</b>, mostra <b>quanto custou cada voto</b>,
        <b>quem disputa a sua base</b> e <b>onde crescer na próxima eleição</b>.</p></div>
    </div>
    ${chapaTop.length > 1 ? `<h3 class="espaco">Chapa ${esc(x.ag?.rotulo ?? foco.sg)} · ${x.posChapa}º de ${x.lista.length}</h3>
    <table><thead><tr><th>Candidato</th><th class="n">Votos</th><th class="n">Situação</th></tr></thead><tbody>
      ${chapaTop.map((c) => `<tr class="${c === foco ? "foco" : ""}"><td>${x.lista.indexOf(c) + 1}º ${esc(c.nm)} <small>(${esc(c.sg)})</small></td><td class="n">${inteiro(c.votos)}</td><td class="n">${esc(c.st ?? "")}</td></tr>`).join("")}
    </tbody></table>` : ""}`, "Prévia gratuita");

  // Amostra: os 3 primeiros locais abertos, o resto tarjado
  const locais = [...x.vLoc].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rival = [...x.rivais].sort((a, b) => b.fracFoco - a.fracFoco)[0];
  const potencial = x.espaco.reduce((s, e) => s + e.potencial, 0);
  const bloco = (titulo, corpo) => `<div class="pv-bloco"><h3>${titulo}</h3>${corpo}</div>`;
  const amostra = folha("O que tem no diagnóstico completo", `
    <p class="rel-sobre">Uma amostra com os dados de ${nome}. As partes tarjadas aparecem completas no diagnóstico.</p>
    ${bloco("Locais de votação e bairros", `<table><thead><tr><th>Local de votação</th><th class="n">Votos</th><th class="n">% no local</th></tr></thead><tbody>
      ${locais.map(([j, vt], k) => { const l = D.locais[j]; return k < 3
        ? `<tr><td>${esc(l.nm)}<br><small>${esc(ondeLocal(D, l))}</small></td><td class="n">${inteiro(vt)}</td><td class="n">${pct(l.total ? vt / l.total : 0)}</td></tr>`
        : `<tr><td>${tarja(220 - (k % 3) * 40)}<br><small>${tarja(110)}</small></td><td class="n">${tarja(36)}</td><td class="n">${tarja(44)}</td></tr>`; }).join("")}
      </tbody></table><p class="nota">${inteiro(x.cLoc.n)} locais com voto, com mapa e ranking de bairros de cada cidade.</p>`)}
    <div class="rel-2">
      ${bloco("Custo do voto", `<p>Cada voto de ${nome} custou <b>R$ ${tarja(50)}</b>. Na chapa ${esc(x.ag?.rotulo ?? foco.sg)}, ele foi o <b>${tarja(24)}º</b> voto mais barato de ${x.nCusto || "—"}.
        <br>Comparado com a curva de todos os candidatos ${esc(U.daArea)}: ${tarja(40)}× o resultado esperado para o dinheiro arrecadado.</p>`)}
      ${bloco("Quem disputa a sua base", rival ? `<p><b>${tarja(120)}</b> teve voto nos mesmos locais que ${nome}: <b>${pct(rival.fracFoco, 0)}</b> dos votos de ${nome} estão onde ele também foi votado.
        <br>Mapa de calor lado a lado e as cidades onde cada um foi mais forte.</p>` : `<p>Comparação com os concorrentes mais próximos, local a local.</p>`)}
    </div>
    <div class="rel-2">
      ${bloco("Espaço para crescer", x.espaco.length ? `<p>Encontramos <b>${x.espaco.length} ${U.uns}</b> grandes onde ${nome} ficou abaixo da metade do próprio desempenho.
        ${potencial >= 100 ? `Só chegar à média nelas soma cerca de <b>${inteiro(potencial)} votos</b>.` : "E mostramos quanto cada uma vale."}</p><p>${esc(D.municipios[x.espaco[0].i].nm)}, ${x.espaco.slice(1, 4).map(() => tarja(80)).join(", ")}…</p>` : "<p>Cidades com espaço para crescer e quantos votos elas valem.</p>")}
      ${bloco("Perfil do eleitor", `<p>De onde vêm os votos por <b>idade, gênero e escolaridade</b> do eleitorado, e os <b>lugares com o mesmo perfil</b> onde ${nome} ainda teve pouco voto: ${tarja(160)}, ${tarja(120)}…</p>`)}
    </div>`, assinatura);

  const oferta = folha("Diagnóstico completo", `
    <div class="pv-oferta">
      <p class="oferta-selo">Ovile Diagnóstico</p>
      <h2>Os dados de ${nome} já estão prontos.</h2>
      <p class="rel-sobre">Dados oficiais do TSE, conferidos voto a voto com o resultado, num relatório para apresentar ao partido e à equipe.</p>
      <ul class="pv-lista">
        <li>Mapa dos votos até o <b>local de votação e o bairro</b></li>
        <li><b>Custo de cada voto</b> comparado à chapa e aos concorrentes</li>
        <li>Quem <b>disputa a mesma base</b> e onde cada um foi mais forte</li>
        <li><b>Cidades e lugares com espaço para crescer</b>, com o perfil do eleitor</li>
        <li><b>Relatório PDF</b> completo + acesso online ao painel</li>
      </ul>
      <div class="pv-preco"><small>Diagnóstico completo de ${nome}</small><b>R$ ${inteiro(v.preco)}</b><small>Pagamento por Pix · link liberado no mesmo dia</small></div>
      ${compra ? `<a class="pv-botao" href="${esc(compra)}">Quero o diagnóstico completo</a>` : ""}
      <h3 class="espaco">Como funciona</h3>
      <ol class="pv-passos">
        <li><b>Clique no botão</b> e fale com a gente no WhatsApp.</li>
        <li><b>Pague por Pix</b> (R$ ${inteiro(v.preco)}, pagamento único).</li>
        <li><b>Receba no mesmo dia</b> o link do painel de ${nome} e o relatório em PDF.</li>
      </ol>
      <p class="pv-link">Veja a prévia online: <a href="${esc(linkPrevia(D, foco))}">${esc(linkPrevia(D, foco).replace("https://", ""))}</a></p>
    </div>`, assinatura);

  el.innerHTML = `<div class="relatorio">${capa}${amostra}${oferta}</div>`;

  const max = Math.max(1e-9, quantil([...x.pMun.values()], 0.98));
  const escala = escalaSeq(max, "--laranja");
  criarMapa(el.querySelector("#pv-mapa"), { geo, D }).colorir((i) => (x.pMun.get(i) ? escala(x.pMun.get(i)) : null));
  legenda(el.querySelector("#pv-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0%", max: pct(max), titulo: "% dos válidos" });
}
