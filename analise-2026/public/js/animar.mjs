import { esc } from "./fmt.mjs";

export const reduzido = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Número "contando" de 0 até o valor final.
export function contar(el, ate, formato = String, ms = 1200) {
  if (reduzido()) { el.textContent = formato(ate); return; }
  const t0 = performance.now();
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = formato(ate * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Barras horizontais que crescem em sequência ("corrida").
export function barras(el, itens, { formato = String, max } = {}) {
  const m = max ?? Math.max(1, ...itens.map((i) => i.valor));
  el.classList.add("barras");
  el.innerHTML = itens.map((i) => `
    <div class="barra ${i.classe ?? ""}" title="${esc(i.titulo ?? i.rotulo)}">
      <span class="rot">${esc(i.rotulo)}</span>
      <span class="trilho"><span class="enche" data-w="${(100 * i.valor) / m}" style="${i.cor ? `background:${i.cor}` : ""}"></span></span>
      <span class="val">${formato(i.valor)}</span>
    </div>`).join("");
  el.offsetWidth; // força o layout com largura 0 antes de animar
  el.querySelectorAll(".enche").forEach((e, k) => {
    e.style.transitionDelay = reduzido() ? "0s" : `${Math.min(k * 25, 900)}ms`;
    e.style.width = `${e.dataset.w}%`;
  });
}
