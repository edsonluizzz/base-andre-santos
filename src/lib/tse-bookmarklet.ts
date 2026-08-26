/**
 * Bookmarklet pra atualizar o snapshot do comparativo TSE sem depender de automação externa.
 *
 * Por que existe: a API do DivulgaCandContas bloqueia chamadas de servidor/datacenter (Vercel toma
 * 403) E bloqueia fetch cross-origin via CORS (confirmado: fetch direto de ovile.com.br pra TSE dá
 * "Failed to fetch"). Só funciona buscando com o navegador de verdade estando NA ABA da própria TSE.
 *
 * Como funciona: o usuário arrasta o link (ver TSE_BOOKMARKLET_HREF) pra barra de favoritos. Ao clicar
 * nele estando no site da TSE, o script busca 4 disputas do PR: Deputado Estadual e Federal (só
 * candidatos do NOVO — proporcional, comparativo intrapartidário) e Senador e Governador (campo
 * completo — majoritário, só 1 candidato por partido, então o comparativo é contra os concorrentes),
 * grava o resultado em `window.name` (sobrevive a navegação same-tab entre origens — técnica clássica
 * de cross-origin data transfer) e navega de volta pra `/financeiro/tse-comparativo`. A página, ao
 * carregar, lê `window.name`, reconhece o marcador e faz o POST pro nosso endpoint sozinha.
 */

const TSE_BOOKMARKLET_SOURCE = `
(function () {
  if (!/divulgacandcontas\\.tse\\.jus\\.br/.test(location.host)) {
    alert('Abra o site do TSE primeiro (link "Ver no site do TSE" na página do comparativo) e clique neste favorito de lá.');
    return;
  }
  var ORIGEM = 'https://ovile.com.br/financeiro/tse-comparativo';
  var ELEICAO = '20322002026', ANO = '2026', UF = 'PR', PARTIDO_NOVO = 30;
  // 7=Dep.Estadual, 6=Dep.Federal: proporcional, só candidatos do NOVO (comparativo intrapartidário).
  // 5=Senador, 3=Governador: majoritário (1 candidato por partido), campo inteiro (soPartido null).
  var CARGOS = [
    { cargo: 7, soPartido: PARTIDO_NOVO },
    { cargo: 6, soPartido: PARTIDO_NOVO },
    { cargo: 5, soPartido: null },
    { cargo: 3, soPartido: null }
  ];
  (async function () {
    var out = {};
    for (var i = 0; i < CARGOS.length; i++) {
      var cfg = CARGOS[i];
      var cargo = cfg.cargo;
      var bucket = cfg.soPartido || 0; // chave de armazenamento: 30 = só NOVO, 0 = campo inteiro
      var listUrl = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/' + ANO + '/' + UF + '/' + ELEICAO + '/' + cargo + '/candidatos' + (cfg.soPartido ? ('?partido=' + cfg.soPartido) : '');
      var lr = await fetch(listUrl);
      var lj = await lr.json();
      var cands = lj.candidatos || [];
      var rows = [];
      for (var k = 0; k < cands.length; k++) {
        var c = cands[k];
        // Partido do PRÓPRIO candidato (exigido no path da consulta de contas). Proporcional já é
        // só NOVO. Majoritário deriva do número de urna: Governador = número do partido puro (2
        // dígitos, 1 candidato por partido); Senador = partido+dígito (3 dígitos).
        var partidoCand = cfg.soPartido ? cfg.soPartido : (cargo === 3 ? c.numero : Math.floor(c.numero / 10));
        try {
          var rr = await fetch('https://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/' + ELEICAO + '/' + ANO + '/' + UF + '/' + cargo + '/' + partidoCand + '/' + c.numero + '/' + c.id);
          if (!rr.ok) continue;
          var rj = await rr.json();
          var d = rj.dadosConsolidados || {};
          rows.push({
            numero: c.numero,
            nome: c.nomeUrna,
            situacao: c.descricaoSituacao,
            totalRecebido: d.totalRecebido || 0,
            qtdRecebido: d.qtdRecebido || 0,
            totalReceitaPF: d.totalReceitaPF || 0,
            totalReceitaPJ: d.totalReceitaPJ || 0,
            totalPartidos: d.totalPartidos || 0,
            dataUltimaAtualizacaoContas: rj.dataUltimaAtualizacaoContas || null
          });
        } catch (e) {}
      }
      out[cargo] = { partido: bucket, rows: rows };
    }
    window.name = 'TSE_SNAPSHOT_PAYLOAD_V1::' + JSON.stringify(out);
    location.href = ORIGEM;
  })();
})();
`.trim();

export const TSE_SNAPSHOT_MARKER = "TSE_SNAPSHOT_PAYLOAD_V1::";

export const TSE_BOOKMARKLET_HREF = "javascript:" + encodeURIComponent(TSE_BOOKMARKLET_SOURCE);
