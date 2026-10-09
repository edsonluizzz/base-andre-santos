// Página de venda do Ovile Diagnóstico (raiz do site, sem candidato escolhido).
// Exemplo real: André Santos (30777), com autorização. Votos e R$/voto saem dos dados; mediana da chapa, 3,34×,
// 99% e 39,5% são do relatório dele de 08/10/2026 (a sobreposição precisa dos votos por local, que a página pública
// não carrega). Se a prestação de contas final mudar esses números, atualizar aqui.
import { UF } from "./config.mjs";
import { esc, inteiro, reais } from "./fmt.mjs";
import { rsPorVoto } from "./calc.mjs";

const EXEMPLO = "30777";

export function linkContato(venda) {
  if (!venda?.whatsapp) return null;
  const texto = "Olá! Quero saber mais sobre o Ovile Diagnóstico da eleição 2026.";
  return `https://wa.me/${String(venda.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

const img = (arq, alt) => `<img src="img/${arq}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

function blocoRecurso({ titulo, texto, imagem, alt, inverter = false }) {
  return `<div class="lp-recurso${inverter ? " inverter" : ""}">
    <div class="lp-recurso-texto"><h3>${titulo}</h3><p>${texto}</p></div>
    <div class="lp-recurso-img">${img(imagem, alt)}</div>
  </div>`;
}

export function landing({ D, venda, totalCandidatos }) {
  const preco = Number(venda?.preco ?? 297);
  const contato = linkContato(venda);
  const ex = D.cargo.id === "estadual" ? D.porNumero.get(EXEMPLO) : null;
  const exRpv = ex ? rsPorVoto(ex.receita, ex.votos) : null;
  const botaoWhats = (rotulo) => (contato ? `<a class="botao-compra" href="${esc(contato)}" target="_blank" rel="noopener">${rotulo}</a>` : "");

  return `
  <div class="lp">
    <section class="lp-hero">
      <div>
        <p class="oferta-selo">Ovile Diagnóstico · Eleição 2026 · ${UF.nome}</p>
        <h1>Você sabe onde ganhou e onde perdeu cada voto?</h1>
        <p class="lp-sub">O diagnóstico completo da sua eleição para deputado estadual ou federal no ${UF.sigla}: do município ao local de votação, quanto custou cada voto e quem disputa a sua base. Com relatório em PDF pronto para levar ao partido.</p>
        <div class="lp-ctas">
          <button type="button" class="botao-principal" data-rolar="escolher">Ver a prévia grátis do meu resultado</button>
          ${botaoWhats(`Quero o diagnóstico · R$ ${inteiro(preco)}`)}
        </div>
        <p class="lp-miudo">Dados oficiais do TSE · ${inteiro(totalCandidatos)} candidatos do ${UF.sigla} conferidos voto a voto com o resultado oficial</p>
      </div>
      <div class="lp-hero-img">${img("relatorio-1.jpg", "Capa do relatório em PDF do Ovile Diagnóstico")}</div>
    </section>

    <section class="lp-secao">
      <h2>A eleição acabou. As perguntas, não.</h2>
      <div class="lp-perguntas">
        <div><b>Onde estão os meus votos de verdade?</b><p>Não só a cidade: o bairro e o local de votação onde você foi forte e onde ninguém te conheceu.</p></div>
        <div><b>O dinheiro rendeu?</b><p>Quanto custou cada voto seu, comparado aos colegas de chapa e aos adversários que gastaram mais.</p></div>
        <div><b>Quem está disputando o mesmo eleitor?</b><p>Os candidatos que votam nos mesmos lugares que você, e onde cada um levou a melhor.</p></div>
      </div>
    </section>

    <section class="lp-secao">
      <h2>O que vem no diagnóstico</h2>
      ${blocoRecurso({ titulo: "Mapa dos votos até o local de votação", texto: "Os 399 municípios do Paraná coloridos pelo seu desempenho. Clique numa cidade e veja cada escola onde você teve voto, com o bairro e o percentual em cada uma.", imagem: "mapa-estado.jpg", alt: "Mapa do Paraná com os votos do candidato por município" })}
      ${blocoRecurso({ titulo: "Custo de cada voto", texto: "Receita declarada ao TSE dividida pelos votos, ao lado dos concorrentes e da mediana da chapa. E quantas vezes você rendeu acima ou abaixo do que um candidato médio faria com o mesmo dinheiro.", imagem: "custo-barras.jpg", alt: "Dinheiro recebido e votos do candidato e dos concorrentes", inverter: true })}
      ${blocoRecurso({ titulo: "Quem disputa a sua base", texto: "Escolha até 3 candidatos (o sistema já sugere os concorrentes diretos) e compare mapa a mapa: quanto da sua votação está nos mesmos locais que a deles e em que cidades cada um venceu.", imagem: "concorrentes-calor.jpg", alt: "Mapas de calor do candidato e de três concorrentes" })}
      ${blocoRecurso({ titulo: "Relatório PDF de 5 páginas", texto: "Conclusões escritas em português claro, mapas, os 15 municípios e os locais mais fortes, custo do voto, disputa de base e as cidades com mais espaço para crescer. Pronto para apresentar ao partido, à equipe ou a apoiadores.", imagem: "relatorio-2.jpg", alt: "Página do relatório em PDF com mapa e tabela de municípios", inverter: true })}
    </section>

    ${ex ? `<section class="lp-secao lp-exemplo">
      <h2>Exemplo real: ${esc(ex.nm)} (${esc(ex.sg)})</h2>
      <p>Suplente a deputado estadual, ${inteiro(ex.votos)} votos. O diagnóstico mostrou:</p>
      <div class="lp-numeros">
        <div><b>${reais(exRpv)}</b><span>por voto, contra R$ 33,21 da mediana da chapa</span></div>
        <div><b>3,34×</b><span>mais votos do que a curva do ${UF.sigla} prevê para a receita dele</span></div>
        <div><b>99%</b><span>da votação dele em locais onde a principal concorrente também teve voto</span></div>
        <div><b>39,5%</b><span>dos votos vieram de Curitiba; 2 cidades fizeram metade da votação</span></div>
      </div>
      <p class="lp-miudo">Números do relatório de ${esc(ex.nm)}, publicados com autorização. Gere a prévia do seu nome abaixo.</p>
    </section>` : ""}

    <section class="lp-secao">
      <h2>Como funciona</h2>
      <ol class="lp-passos">
        <li><b>Veja a prévia grátis.</b> Busque seu nome abaixo e veja o panorama da sua eleição e o mapa (borrado) dos seus votos.</li>
        <li><b>Peça pelo WhatsApp.</b> Pagamento único de R$ ${inteiro(preco)} por Pix. Sem assinatura, sem cadastro.</li>
        <li><b>Receba o seu link.</b> Um link exclusivo abre o painel completo e o relatório em PDF do seu candidato.</li>
      </ol>
    </section>

    <section class="lp-secao lp-faq">
      <h2>Perguntas frequentes</h2>
      <details><summary>Serve para quem não foi eleito?</summary><p>Principalmente. Suplentes e não eleitos são quem mais precisa saber onde a votação veio, quanto custou e onde dá para crescer até a próxima eleição.</p></details>
      <details><summary>De onde vêm os dados?</summary><p>Dos dados abertos do TSE: votação por seção eleitoral, locais de votação, resultado oficial e prestação de contas dos candidatos. A soma por seção de cada candidato é conferida com o resultado oficial; todos batem exatamente.</p></details>
      <details><summary>Posso escolher com quem comparar?</summary><p>Sim. O sistema sugere os 3 concorrentes que mais se parecem com você em tamanho e geografia, e você troca por quem quiser, de qualquer partido, quantas vezes quiser.</p></details>
      <details><summary>E a prestação de contas, que ainda não é a final?</summary><p>O custo do voto usa a prestação parcial publicada pelo TSE. Quando a final sair, em novembro, os números são atualizados no seu link sem custo.</p></details>
      <details><summary>Quais cargos estão disponíveis?</summary><p>Deputado estadual e deputado federal do Paraná. Outros cargos e estados estão a caminho.</p></details>
      <details><summary>Usa dados pessoais de eleitores?</summary><p>Não. Só resultados públicos agregados por seção e local de votação, os mesmos que o TSE publica para qualquer pessoa.</p></details>
    </section>

    <section class="lp-secao lp-final" id="escolher">
      <h2>Veja a prévia grátis do seu resultado</h2>
      <p>Escolha o cargo no topo e busque o nome ou o número do candidato.</p>
    </section>
  </div>`;
}
