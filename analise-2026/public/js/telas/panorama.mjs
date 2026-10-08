import { UF } from "../config.mjs";
import { agremiacaoDe, chapa, nomeCurto, posicaoGeral } from "../dados.mjs";
import { barras, contar } from "../animar.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Quanto faltou (ou sobrou) para a próxima cadeira pelo quociente, só com votos da agremiação.
export function folgaQuociente(D, ag) {
  const total = ag.nominais + ag.legenda;
  const diretas = Math.floor(total / D.cargo.qe);
  return { total, diretas, falta: (diretas + 1) * D.cargo.qe - total };
}

export function montar(el, { D, foco }) {
  const c = D.cargo;
  const ag = agremiacaoDe(D, foco);
  const lista = chapa(D, foco);
  const { total, diretas, falta } = folgaQuociente(D, ag);
  const posChapa = lista.indexOf(foco) + 1;
  el.innerHTML = `
    <div class="grade kpis">
      <div class="cartao kpi"><h2>Votos válidos</h2><b data-n="${c.validos}"></b><small>${esc(c.nome)} · ${UF.nome} · ${c.vagas} vagas</small></div>
      <div class="cartao kpi"><h2>Quociente eleitoral</h2><b data-n="${c.qe}"></b><small>votos por cadeira</small></div>
      <div class="cartao kpi"><h2>${esc(ag.rotulo)}</h2><b data-n="${total}"></b><small>${inteiro(ag.nominais)} nominais + ${inteiro(ag.legenda)} de legenda · ${ag.vagas} cadeira(s) · faltaram ${inteiro(falta)} votos para a ${diretas + 1}ª pelo quociente</small></div>
      <div class="cartao kpi"><h2>${esc(nomeCurto(foco))}</h2><b class="destaque" data-n="${foco.votos}"></b><small>${posChapa}º de ${lista.length} na chapa ${esc(ag.rotulo)} · ${posicaoGeral(D, foco.n)}º de ${D.candidatos.length} no ${UF.sigla} · ${pct(foco.votos / c.validos)} dos válidos · ${esc(foco.st)}</small></div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Chapa ${esc(ag.rotulo)} · ${lista.length} candidatos · verde = eleito</h2><div id="pn-chapa"></div></div>
      <div class="cartao"><h2>Cadeiras por partido ou federação</h2><div id="pn-cadeiras"></div></div>
    </div>`;
  el.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), inteiro));
  barras(el.querySelector("#pn-chapa"), lista.map((x) => ({
    rotulo: x.nm, valor: x.votos, classe: x.n === foco.n ? "foco" : x.eleito ? "eleito" : "", titulo: `${x.nm} (${x.n}) — ${x.st}`,
  })), { formato: inteiro });
  barras(el.querySelector("#pn-cadeiras"), D.agremiacoes.filter((a) => a.vagas > 0).sort((a, b) => b.vagas - a.vagas).map((a) => ({
    rotulo: a.rotulo, valor: a.vagas, classe: a === ag ? "foco" : "", titulo: a.nm,
  })));
}
