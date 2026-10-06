const NUM = new Intl.NumberFormat("pt-BR");
const dec = (v, casas) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const inteiro = (n) => NUM.format(Math.round(n));
export const reais = (v, casas = 2) => (v == null ? "sem dado" : `R$ ${dec(v, casas)}`);
export const pp = (x, casas = 2) => (x == null ? "—" : `${dec(x * 100, casas)} p.p.`);
export const pct = (x, casas = 2) => (x == null ? "—" : `${dec(x * 100, casas)}%`);
export function reaisCurto(v) {
  if (v == null) return "sem dado";
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (v >= 1e3) return `R$ ${inteiro(v / 1e3)} mil`;
  return reais(v);
}
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
