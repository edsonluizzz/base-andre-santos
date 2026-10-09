import { acharMunicipio, unidade } from "./dados.mjs";
import { esc } from "./fmt.mjs";

let contador = 0;

// Campo "Município" (ou "Bairro", nas municipais) com busca; null = estado ou cidade inteira.
export function seletorMunicipio(el, D, atual, aoMudar) {
  const id = `lista-municipios-${++contador}`;
  el.classList.add("seletor");
  const U = unidade(D);
  el.innerHTML = `<label>${U.Um} <input list="${id}" placeholder="${esc(U.todo)} · digite para buscar" value="${atual == null ? "" : esc(D.municipios[atual].nm)}"></label>
    <datalist id="${id}">${D.municipios.map((m) => `<option value="${esc(m.nm)}">`).join("")}</datalist>
    ${atual == null ? "" : `<button type="button" class="limpar" title="Voltar: ${esc(U.todo)}">✕ ${esc(U.todo)}</button>`}`;
  const input = el.querySelector("input");
  input.addEventListener("change", () => {
    const t = input.value.trim();
    if (!t) { aoMudar(null); return; }
    const i = acharMunicipio(D, t);
    if (i != null) aoMudar(i);
  });
  el.querySelector(".limpar")?.addEventListener("click", () => aoMudar(null));
}
