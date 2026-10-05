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
export function tabela(el, { colunas, linhas, ordem = 0, desc = true, classe = () => "", limite = Infinity }) {
  let o = ordem, d = desc;
  const render = () => {
    const ls = ordenar(linhas, colunas[o].valor, d).slice(0, limite);
    el.innerHTML = `<table><thead><tr>${colunas.map((c, k) =>
      `<th data-ordem="${k}" class="${c.num ? "n" : ""}">${esc(c.rotulo)}${k === o ? (d ? " ▾" : " ▴") : ""}</th>`).join("")}</tr></thead>
      <tbody>${ls.map((l) => `<tr class="${classe(l)}">${colunas.map((c) =>
        `<td class="${c.num ? "n" : ""}">${(c.formato ?? esc)(c.valor(l), l)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    el.querySelectorAll("th").forEach((th) => {
      th.onclick = () => {
        const k = Number(th.dataset.ordem);
        if (k === o) d = !d; else { o = k; d = true; }
        render();
      };
    });
  };
  render();
}
