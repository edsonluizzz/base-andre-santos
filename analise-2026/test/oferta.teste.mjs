import test from "node:test";
import assert from "node:assert/strict";
import { estaLiberado, linkCompra } from "../public/js/oferta.mjs";

test("liberação: local, admin, comprado ou não", () => {
  assert.equal(estaLiberado(null, "estadual", "30777"), true); // rodando local, sem acesso.json
  assert.equal(estaLiberado({ todos: true, liberados: [] }, "federal", "3030"), true);
  assert.equal(estaLiberado({ todos: false, liberados: ["estadual:30777"] }, "estadual", "30777"), true);
  assert.equal(estaLiberado({ todos: false, liberados: ["estadual:30777"] }, "federal", "30777"), false);
  assert.equal(estaLiberado({ todos: false, liberados: [] }, "estadual", "30300"), false);
});

test("link de compra pelo WhatsApp só com número configurado", () => {
  const foco = { nm: "ANDRÉ SANTOS", n: "30777" };
  assert.equal(linkCompra({ preco: 297, whatsapp: null }, foco, "Deputado Estadual"), null);
  const l = linkCompra({ preco: 297, whatsapp: "+55 (41) 99999-0000" }, foco, "Deputado Estadual");
  assert.ok(l.startsWith("https://wa.me/5541999990000?text="));
  assert.ok(decodeURIComponent(l).includes("ANDRÉ SANTOS (número 30777, Deputado Estadual, PR)"));
});
