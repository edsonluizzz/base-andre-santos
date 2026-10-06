import { acharMunicipio } from "./dados.mjs";
import { esc } from "./fmt.mjs";

let contador = 0;

// Campo "Município" com busca (lista do navegador); null = Paraná inteiro.
export function seletorMunicipio(el, D, atual, aoMudar) {
  const id = `lista-municipios-${++contador}`;
  el.classList.add("seletor");
  el.innerHTML = `<label>Município <input list="${id}" placeholder="Paraná inteiro — digite para buscar" value="${atual == null ? "" : esc(D.municipios[atual].nm)}"></label>
    <datalist id="${id}">${D.municipios.map((m) => `<option value="${esc(m.nm)}">`).join("")}</datalist>
    ${atual == null ? "" : `<button type="button" class="limpar" title="Voltar ao Paraná inteiro">✕ Paraná inteiro</button>`}`;
  const input = el.querySelector("input");
  input.addEventListener("change", () => {
    const t = input.value.trim();
    if (!t) { aoMudar(null); return; }
    const i = acharMunicipio(D, t);
    if (i != null) aoMudar(i);
  });
  el.querySelector(".limpar")?.addEventListener("click", () => aoMudar(null));
}
