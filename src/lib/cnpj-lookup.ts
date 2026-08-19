import { normalizeCnpj, formatCnpj, formatEnderecoLinha1 } from "./cnpj";

export type CnpjLookupResult = {
  razaoSocial: string;
  document: string;
  address: string | null;
  municipio: string | null;
  uf: string | null;
  phone: string | null;
  email: string | null;
  situacao: string | null;
};

/**
 * Consulta CNPJ via ReceitaWS. Preferida à BrasilAPI: para CNPJ pequeno/MEI a
 * BrasilAPI costuma vir com logradouro/e-mail/telefone vazios, enquanto a ReceitaWS
 * retorna o mesmo conteúdo do cartão CNPJ.
 */
export async function lookupCnpj(rawCnpj: string): Promise<CnpjLookupResult | null> {
  const digits = normalizeCnpj(rawCnpj);
  if (digits.length !== 14) return null;

  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data?.status === "ERROR") return null;

  const address = formatEnderecoLinha1({
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
  });

  return {
    razaoSocial: data.nome ?? "",
    document: formatCnpj(digits),
    address,
    municipio: data.municipio || null,
    uf: data.uf || null,
    phone: data.telefone || null,
    email: data.email || null,
    situacao: data.situacao || null,
  };
}
