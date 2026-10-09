import { agremiacaoDe, chapa, nomeCurto, posicaoGeral, unidade } from "../dados.mjs";
import { barras, contar } from "../animar.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Quanto faltou (ou sobrou) para a próxima cadeira pelo quociente, só com votos da agremiação.
export function folgaQuociente(D, ag) {
  const total = ag.nominais + ag.legenda;
  const diretas = Math.floor(total / D.cargo.qe);
  return { total, diretas, falta: (diretas + 1) * D.cargo.qe - total };
}

// Majoritário (prefeito; depois governador e senador): disputa direta, sem quociente nem chapa.
export function disputa(D, foco) {
  const lista = [...D.candidatos].sort((a, b) => b.votos - a.votos);
  const pos = lista.indexOf(foco) + 1;
  const primeiro = lista[0], acima = lista[pos - 2] ?? null;
  const segundoTurno = lista.filter((c) => c.votos2 != null);
  return { lista, pos, primeiro, acima, segundoTurno, faltaPrimeiro: primeiro.votos - foco.votos, faltaAcima: acima ? acima.votos - foco.votos : 0 };
}

function montarMajoritario(el, D, foco, U) {
  const c = D.cargo, x = disputa(D, foco);
  const t2 = x.segundoTurno.length ? x.segundoTurno : null;
  el.innerHTML = `
    <div class="grade kpis">
      <div class="cartao kpi"><h2>Votos válidos</h2><b data-n="${c.validos}"></b><small>${esc(c.nome)} ${c.ano ?? ""} · ${esc(U.area)} · ${inteiro(x.lista.length)} candidatos</small></div>
      <div class="cartao kpi"><h2>${esc(nomeCurto(foco))}</h2><b class="destaque" data-n="${foco.votos}"></b><small>${x.pos}º de ${x.lista.length} · ${pct(foco.votos / c.validos)} dos válidos · ${esc(foco.st ?? "")}</small></div>
      <div class="cartao kpi"><h2>${x.pos === 1 ? "Vantagem sobre o 2º" : "Distância para o 1º"}</h2><b data-n="${x.pos === 1 ? foco.votos - (x.lista[1]?.votos ?? 0) : x.faltaPrimeiro}"></b><small>votos · ${esc(x.pos === 1 ? nomeCurto(x.lista[1] ?? foco) : nomeCurto(x.primeiro))}</small></div>
      ${t2 ? `<div class="cartao kpi"><h2>2º turno</h2><b data-n="${Math.max(...t2.map((k) => k.votos2))}"></b><small>${t2.map((k) => `${esc(nomeCurto(k))}: ${inteiro(k.votos2)}`).join(" · ")}</small></div>`
        : x.pos > 1 ? `<div class="cartao kpi"><h2>Distância para o ${x.pos - 1}º</h2><b data-n="${x.faltaAcima}"></b><small>votos · ${esc(nomeCurto(x.acima))}</small></div>` : ""}
    </div>
    <div class="cartao espaco"><h2>Resultado ${esc(U.naArea)} · 1º turno · verde = eleito</h2><div id="pn-ranking"></div></div>`;
  el.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), inteiro));
  barras(el.querySelector("#pn-ranking"), x.lista.map((k) => ({
    rotulo: k.nm, valor: k.votos, classe: k === foco ? "foco" : k.eleito ? "eleito" : "", titulo: `${k.nm} (${k.sg}) · ${k.st ?? ""}`,
  })), { formato: (v) => `${inteiro(v)} · ${pct(v / c.validos, 1)}` });
}

export function montar(el, { D, foco }) {
  const U = unidade(D);
  if (D.cargo.majoritario) return montarMajoritario(el, D, foco, U);
  const c = D.cargo;
  const ag = agremiacaoDe(D, foco);
  const lista = chapa(D, foco);
  const { total, diretas, falta } = folgaQuociente(D, ag);
  const posChapa = lista.indexOf(foco) + 1;
  el.innerHTML = `
    <div class="grade kpis">
      <div class="cartao kpi"><h2>Votos válidos</h2><b data-n="${c.validos}"></b><small>${esc(c.nome)}${U.municipal ? ` ${c.ano}` : ""} · ${esc(U.area)} · ${c.vagas} vagas</small></div>
      <div class="cartao kpi"><h2>Quociente eleitoral</h2><b data-n="${c.qe}"></b><small>votos por cadeira</small></div>
      <div class="cartao kpi"><h2>${esc(ag.rotulo)}</h2><b data-n="${total}"></b><small>${inteiro(ag.nominais)} nominais + ${inteiro(ag.legenda)} de legenda · ${ag.vagas} cadeira(s) · faltaram ${inteiro(falta)} votos para a ${diretas + 1}ª pelo quociente</small></div>
      <div class="cartao kpi"><h2>${esc(nomeCurto(foco))}</h2><b class="destaque" data-n="${foco.votos}"></b><small>${posChapa}º de ${lista.length} na chapa ${esc(ag.rotulo)} · ${posicaoGeral(D, foco.n)}º de ${D.candidatos.length} ${esc(U.naArea)} · ${pct(foco.votos / c.validos)} dos válidos · ${esc(foco.st)}</small></div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Chapa ${esc(ag.rotulo)} · ${lista.length} candidatos · verde = eleito</h2><div id="pn-chapa"></div></div>
      <div class="cartao"><h2>Cadeiras por partido ou federação</h2><div id="pn-cadeiras"></div></div>
    </div>`;
  el.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), inteiro));
  barras(el.querySelector("#pn-chapa"), lista.map((x) => ({
    rotulo: x.nm, valor: x.votos, classe: x.n === foco.n ? "foco" : x.eleito ? "eleito" : "", titulo: `${x.nm} (${x.n}) · ${x.st}`,
  })), { formato: inteiro });
  barras(el.querySelector("#pn-cadeiras"), D.agremiacoes.filter((a) => a.vagas > 0).sort((a, b) => b.vagas - a.vagas).map((a) => ({
    rotulo: a.rotulo, valor: a.vagas, classe: a === ag ? "foco" : "", titulo: a.nm,
  })));
}
