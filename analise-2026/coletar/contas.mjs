// Soma receitas e despesas contratadas por candidato (CSV de prestação de contas do TSE).
// O mesmo SQ_DESPESA/SQ_RECEITA aparece em várias linhas com valores diferentes (parcelas/itens): soma tudo.

export function valorBR(s) {
  const t = String(s ?? "").trim();
  if (!t || t.startsWith("#")) return 0;
  const v = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export function categoriaReceita(fonte, origem) {
  if (fonte === "FUNDO ESPECIAL") return "FEFC";
  if (fonte === "FUNDO PARTIDARIO") return "Fundo Partidário";
  const o = String(origem ?? "");
  if (/pessoas f[ií]sicas|internet|financiamento coletivo/i.test(o)) return "Pessoas físicas";
  if (/pr[óo]prios/i.test(o)) return "Recursos próprios";
  if (/outros candidatos/i.test(o)) return "Outros candidatos";
  if (/partido/i.test(o)) return "Partido (outros recursos)";
  return "Outros";
}

export function criarSomaContas(cargoContas = "Deputado Estadual") {
  const receitas = new Map();
  const despesas = new Map();
  return {
    receita({ sq, cargo, fonte, origem, valor }) {
      if (cargo !== cargoContas) return;
      let r = receitas.get(sq);
      if (!r) receitas.set(sq, (r = { total: 0, porOrigem: {} }));
      const v = valorBR(valor);
      const cat = categoriaReceita(fonte, origem);
      r.total += v;
      r.porOrigem[cat] = (r.porOrigem[cat] ?? 0) + v;
    },
    despesa({ sq, cargo, valor }) {
      if (cargo !== cargoContas) return;
      despesas.set(sq, (despesas.get(sq) ?? 0) + valorBR(valor));
    },
    resultado: () => ({ receitas, despesas }),
  };
}
