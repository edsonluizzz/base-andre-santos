// Oferta do Diagnóstico Eleitoral para quem ainda não comprou o candidato aberto.
import { esc, inteiro } from "./fmt.mjs";
import { nomeCurto } from "./dados.mjs";

// Sem compra: Panorama inteiro e "Votos do candidato" em prévia (mapa borrado, sem números). O resto, oferta.
export const TELAS_LIVRES = ["panorama", "candidato"];

// Candidato liberado: comprou (cargo:número), é admin do sistema, ou está rodando local (sem acesso.json).
export function estaLiberado(acesso, cargo, n) {
  return !acesso || acesso.todos === true || (acesso.liberados ?? []).includes(`${cargo}:${n}`);
}

export function linkCompra(venda, foco, cargoNome) {
  if (!venda?.whatsapp) return null;
  const texto = `Olá! Quero comprar o Ovile Diagnóstico 2026 de ${foco.nm} (número ${foco.n}, ${cargoNome}).`;
  return `https://wa.me/${String(venda.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

export function oferta(foco, D, venda, { compacta = false } = {}) {
  const link = linkCompra(venda, foco, D.cargo.nome);
  const preco = Number(venda?.preco ?? 297);
  return `<div class="oferta${compacta ? " compacta" : ""}">
    <div>
      <p class="oferta-selo">Diagnóstico completo</p>
      <h2>${esc(nomeCurto(foco))} · ${inteiro(foco.votos)} votos</h2>
      <ul>
        <li>Mapa dos votos até o <b>local de votação e o bairro</b></li>
        <li><b>Custo de cada voto</b> comparado à chapa e aos concorrentes</li>
        <li>Quem <b>disputa a mesma base</b> e onde cada um foi mais forte</li>
        <li><b>Cidades com espaço para crescer</b> e quantos votos elas valem</li>
        <li><b>Relatório PDF</b> de 5 páginas pronto para apresentar ao partido e à equipe</li>
        <li>Dados oficiais do TSE, conferidos voto a voto com o resultado</li>
      </ul>
    </div>
    <div class="oferta-compra">
      <b class="oferta-preco">R$ ${inteiro(preco)}</b>
      <small>Você chama no WhatsApp, paga por Pix e recebe o link do seu candidato.</small>
      ${link ? `<a class="botao-compra" href="${esc(link)}" target="_blank" rel="noopener">Comprar diagnóstico · R$ ${inteiro(preco)}</a>` : ""}
      <small>Já comprou? Abra o link exclusivo que você recebeu no WhatsApp.</small>
    </div>
  </div>`;
}
