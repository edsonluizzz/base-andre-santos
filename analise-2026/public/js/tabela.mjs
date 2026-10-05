export function ordenar(linhas, valor, desc) {
  return [...linhas].sort((a, b) => {
    const x = valor(a), y = valor(b);
    if (x == null || y == null) return (x == null) - (y == null);
    const c = typeof x === "string" ? x.localeCompare(y, "pt-BR") : x - y;
    return desc ? -c : c;
  });
}
