import { FOCO, PARTIDO } from "../config.mjs";
import { chapa, posicaoGeral } from "../dados.mjs";
import { barras, contar } from "../animar.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

export function montar(el, { D }) {
  const c = D.cargo;
  const andre = D.porNumero.get(FOCO);
  const novo = chapa(D, PARTIDO);
  const ag = D.agremiacoes.find((a) => a.siglas.includes(PARTIDO));
  const totalNovo = ag.nominais + ag.legenda;
  const diretas = Math.floor(totalNovo / c.qe);
  const falta = (diretas + 1) * c.qe - totalNovo;
  el.innerHTML = `
    <div class="grade kpis">
      <div class="cartao kpi"><h2>Votos válidos</h2><b data-n="${c.validos}"></b><small>Deputado Estadual · Paraná · ${c.vagas} vagas</small></div>
      <div class="cartao kpi"><h2>Quociente eleitoral</h2><b data-n="${c.qe}"></b><small>votos por cadeira</small></div>
      <div class="cartao kpi"><h2>NOVO</h2><b data-n="${totalNovo}"></b><small>${inteiro(ag.nominais)} nominais + ${inteiro(ag.legenda)} de legenda · ${ag.vagas} cadeiras · faltaram ${inteiro(falta)} votos para a ${diretas + 1}ª pelo quociente</small></div>
      <div class="cartao kpi"><h2>André Santos</h2><b class="destaque" data-n="${andre.votos}"></b><small>${novo.indexOf(andre) + 1}º de ${novo.length} na chapa do NOVO · ${posicaoGeral(D, FOCO)}º de ${D.candidatos.length} no PR · ${pct(andre.votos / c.validos)} dos válidos · ${esc(andre.st)}</small></div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Chapa do NOVO · ${novo.length} candidatos · verde = eleito</h2><div id="pn-chapa"></div></div>
      <div class="cartao"><h2>Cadeiras por partido ou federação</h2><div id="pn-cadeiras"></div></div>
    </div>`;
  el.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), inteiro));
  barras(el.querySelector("#pn-chapa"), novo.map((x) => ({
    rotulo: x.nm, valor: x.votos, classe: x.n === FOCO ? "foco" : x.eleito ? "eleito" : "", titulo: `${x.nm} (${x.n}) — ${x.st}`,
  })), { formato: inteiro });
  barras(el.querySelector("#pn-cadeiras"), D.agremiacoes.filter((a) => a.vagas > 0).sort((a, b) => b.vagas - a.vagas).map((a) => ({
    rotulo: a.rotulo, valor: a.vagas, classe: a.siglas.includes(PARTIDO) ? "foco" : "", titulo: a.nm,
  })));
}
