import { esc } from "./fmt.mjs";

export function ordenar(linhas, valor, desc) {
  return [...linhas].sort((a, b) => {
    const x = valor(a), y = valor(b);
    if (x == null || y == null) return (x == null) - (y == null);
    const c = typeof x === "string" ? x.localeCompare(y, "pt-BR") : x - y;
    return desc ? -c : c;
  });
}

// Tabela ordenável: clique no cabeçalho alterna a ordem. "formato" devolve HTML (já escapado).
// Com "busca", um campo filtra pela primeira coluna; com "aoClicar", cada linha vira um botão.
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export function tabela(el, { colunas, linhas, ordem = 0, desc = true, classe = () => "", limite = Infinity, busca = null, aoClicar = null }) {
  let o = ordem, d = desc, filtro = "";
  let alvo = el;
  if (busca) {
    el.innerHTML = `<input type="search" class="busca" placeholder="${esc(busca)}"><div class="tabela-corpo"></div>`;
    alvo = el.querySelector(".tabela-corpo");
    el.querySelector(".busca").addEventListener("input", (ev) => { filtro = normal(ev.target.value.trim()); render(); });
  }
  let ls = [];
  const render = () => {
    const vis = filtro ? linhas.filter((l) => normal(colunas[0].valor(l)).includes(filtro)) : linhas;
    ls = ordenar(vis, colunas[o].valor, d).slice(0, limite);
    alvo.innerHTML = `<table><thead><tr>${colunas.map((c, k) =>
      `<th data-ordem="${k}" class="${c.num ? "n" : ""}">${esc(c.rotulo)}${k === o ? (d ? " ▾" : " ▴") : ""}</th>`).join("")}</tr></thead>
      <tbody>${ls.map((l, i) => `<tr data-i="${i}" class="${classe(l)}${aoClicar ? " clicavel" : ""}">${colunas.map((c) =>
        `<td class="${c.num ? "n" : ""}">${(c.formato ?? esc)(c.valor(l), l)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    alvo.querySelectorAll("th").forEach((th) => {
      th.onclick = () => {
        const k = Number(th.dataset.ordem);
        if (k === o) d = !d; else { o = k; d = true; }
        render();
      };
    });
  };
  if (aoClicar) alvo.addEventListener("click", (ev) => { const tr = ev.target.closest("tr[data-i]"); if (tr) aoClicar(ls[Number(tr.dataset.i)]); });
  render();
}
