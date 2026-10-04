import { fmtInt, fmtPct, fmtHora } from "./util.mjs";

const $ = (id) => document.getElementById(id);

async function carregar() {
  const [rEstado, rMun] = await Promise.all([fetch("/api/state"), fetch("/api/municipios")]);
  if (!rMun.ok) {
    $("carregando").textContent = "Os municípios ainda não foram coletados. Tente de novo em alguns minutos.";
    return;
  }
  const estado = rEstado.ok ? await rEstado.json() : null;
  const m = await rMun.json();
  const andre = estado?.andre;
  if (andre) {
    $("nome").textContent = `${andre.nome} (${andre.n})`;
    $("total").textContent = fmtInt(andre.votos);
  }
  if (estado?.pr) $("secoes").textContent = `${fmtPct(estado.pr.secoesPct)}%`;
  $("com-votos").textContent = `${fmtInt(m.comVotos)} de ${fmtInt(m.total)}`;
  $("hora").textContent = fmtHora(m.atualizadoEm);
  $("sub").textContent = `Deputado Estadual · Paraná 2026 · relatório gerado em ${new Date().toLocaleString("pt-BR")}`;

  const tbody = document.querySelector("tbody");
  tbody.replaceChildren(...m.lista.map((x, i) => {
    const tr = document.createElement("tr");
    if (!x.votos) tr.className = "zero";
    for (const [texto, classe] of [
      [String(i + 1), ""], [x.nome, ""], [fmtInt(x.votos), "n"],
      [`${fmtPct(x.pctValidos)}%`, "n"], [`${fmtPct(x.secoesPct, 0)}%`, "n"],
    ]) {
      const td = document.createElement("td");
      td.textContent = texto;
      if (classe) td.className = classe;
      tr.append(td);
    }
    return tr;
  }));
  $("soma").textContent = fmtInt(m.lista.reduce((a, x) => a + x.votos, 0));
  $("nota").textContent =
    "Fonte: arquivos oficiais de resultado do TSE (resultados.tse.jus.br). Os municípios são atualizados a cada 5 minutos, " +
    "então a soma pode ficar um pouco abaixo do total do estado, que é atualizado a cada minuto." +
    (m.falhas ? ` ${m.falhas} município(s) sem resposta na última coleta: exibido o valor anterior.` : "");
  $("carregando").hidden = true;
  document.querySelector("table").hidden = false;
}

carregar().catch((e) => { $("carregando").textContent = `Falha ao carregar: ${e.message}`; });
