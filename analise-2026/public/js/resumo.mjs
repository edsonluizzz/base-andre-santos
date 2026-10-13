// "Em resumo": 2 a 4 conclusões em frase no topo de cada tela (os detalhes ficam abaixo).
export function resumo(frases) {
  const fs = frases.filter(Boolean);
  return fs.length ? `<div class="cartao resumo"><h2>Em resumo</h2><ul>${fs.map((f) => `<li>${f}</li>`).join("")}</ul></div>` : "";
}
