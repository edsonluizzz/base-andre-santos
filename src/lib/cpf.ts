/** Remove tudo que não for dígito. Uso: normalizar antes de salvar/validar. */
export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Formata 11 dígitos como xxx.xxx.xxx-xx. Retorna o valor original se não tiver 11 dígitos. */
export function formatCpf(raw: string): string {
  const d = normalizeCpf(raw);
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Valida CPF pelos dígitos verificadores (módulo 11). Rejeita sequências repetidas (ex: 111.111.111-11). */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const calcCheckDigit = (upTo: number) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) sum += digits[i] * (upTo + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10];
}
