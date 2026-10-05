export function mostrarDica(ev, html) {
  const el = document.getElementById("dica");
  if (!html) { el.hidden = true; return; }
  el.innerHTML = html;
  el.hidden = false;
  el.style.left = `${Math.min(ev.clientX + 14, innerWidth - el.offsetWidth - 8)}px`;
  el.style.top = `${Math.min(ev.clientY + 14, innerHeight - el.offsetHeight - 8)}px`;
}
export function esconderDica() {
  document.getElementById("dica").hidden = true;
}
