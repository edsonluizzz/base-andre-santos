// Quociente eleitoral (Código Eleitoral, art. 106): válidos ÷ vagas, desprezada a
// fração igual ou inferior a meio, equivalente a um se superior.
// Durante a apuração o valor é parcial. Não calcula sobras.

export function calcularQuociente({ validos, vagas, qeOficial }) {
  if (qeOficial > 0) return { quociente: qeOficial, oficial: true };
  if (!(validos > 0) || !(vagas > 0)) return { quociente: 0, oficial: false };
  const inteiro = Math.floor(validos / vagas);
  const resto = validos % vagas;
  return { quociente: resto * 2 > vagas ? inteiro + 1 : inteiro, oficial: false };
}

export function vagasPartido(total, quociente) {
  if (!(quociente > 0)) return { vagasDiretas: 0, faltamProxima: null };
  const vagasDiretas = Math.floor(total / quociente);
  return { vagasDiretas, faltamProxima: (vagasDiretas + 1) * quociente - total };
}
