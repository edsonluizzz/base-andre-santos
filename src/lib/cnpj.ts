/** Remove tudo que não for dígito. Uso: normalizar antes de salvar/validar. */
export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Formata 14 dígitos como xx.xxx.xxx/xxxx-xx. Retorna o valor original se não tiver 14 dígitos. */
export function formatCnpj(raw: string): string {
  const d = normalizeCnpj(raw);
  if (d.length !== 14) return raw;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata uma linha de endereço a partir de campos opcionais, omitindo os ausentes. */
export function formatEndereco(opts: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  municipio?: string | null;
  uf?: string | null;
}): string | null {
  const linha1 = [opts.logradouro, opts.numero && `nº ${opts.numero}`, opts.complemento]
    .filter(Boolean)
    .join(", ");
  const linha2 = [opts.bairro, [opts.municipio, opts.uf].filter(Boolean).join("/"), opts.cep]
    .filter(Boolean)
    .join(" — ");
  const linhas = [linha1, linha2].filter(Boolean);
  return linhas.length > 0 ? linhas.join(" — ") : null;
}
