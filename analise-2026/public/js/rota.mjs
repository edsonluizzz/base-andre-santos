// Estado da tela na URL: "#comparador?b=30300&nivel=loc".
export function lerRota(hash, ids) {
  const [tela, qs = ""] = String(hash ?? "").replace(/^#/, "").split("?");
  return { tela: ids.includes(tela) ? tela : ids[0], params: Object.fromEntries(new URLSearchParams(qs)) };
}

export function escreverRota(tela, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
  return `#${tela}${qs ? `?${qs}` : ""}`;
}
