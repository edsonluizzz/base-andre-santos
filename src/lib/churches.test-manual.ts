import { normalizeRegional, dedupeChurchRows, assertDistinctMembers } from "./churches";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FALHOU: ${label}\n  esperado: ${e}\n  recebido: ${a}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

assertEqual(normalizeRegional("  Santa felicidade "), "Santa Felicidade", "normaliza case/trim");
assertEqual(normalizeRegional("CIC"), "CIC", "mantém sigla já normalizada");

assertEqual(
  dedupeChurchRows([
    { name: "Água Verde", regional: "Matriz" },
    { name: "água verde", regional: "matriz" }, // duplicata (case/acentuação)
    { name: "Ahú", regional: "Matriz" },
  ]),
  [
    { name: "Água Verde", regional: "Matriz" },
    { name: "Ahú", regional: "Matriz" },
  ],
  "dedup por nome normalizado dentro da mesma regional",
);

try {
  assertDistinctMembers("abc", "abc");
  console.error("FALHOU: assertDistinctMembers deveria lançar erro para IDs iguais");
  process.exitCode = 1;
} catch {
  console.log("OK: assertDistinctMembers rejeita IDs iguais");
}

try {
  assertDistinctMembers("abc", "def");
  console.log("OK: assertDistinctMembers aceita IDs diferentes");
} catch {
  console.error("FALHOU: assertDistinctMembers não deveria lançar erro para IDs diferentes");
  process.exitCode = 1;
}
