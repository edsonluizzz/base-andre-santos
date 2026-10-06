// A dica é guardada aqui porque pode sair do documento junto com um cartão em tela cheia.
let elDica = null;
const dica = () => (elDica ??= document.getElementById("dica"));

export function mostrarDica(ev, html) {
  const el = dica();
  if (!html) { el.hidden = true; return; }
  el.innerHTML = html;
  el.hidden = false;
  el.style.left = `${Math.min(ev.clientX + 14, innerWidth - el.offsetWidth - 8)}px`;
  el.style.top = `${Math.min(ev.clientY + 14, innerHeight - el.offsetHeight - 8)}px`;
}
export function esconderDica() {
  dica().hidden = true;
}

// Em tela cheia só o elemento em tela cheia aparece: a dica muda para dentro dele e volta depois.
document.addEventListener("fullscreenchange", () => {
  (document.fullscreenElement ?? document.body).appendChild(dica());
});
