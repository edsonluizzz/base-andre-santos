import { formatCpf } from "./cpf";
import { formatCnpj, formatEndereco } from "./cnpj";
import { materialItemLabel } from "./material-catalog";
import type { MaterialRequestItem } from "./material-catalog";

/**
 * RASCUNHO — NÃO É TEXTO JURÍDICO FINAL.
 * Este texto ainda não foi revisado por advogado/contador eleitoral da
 * campanha. Antes de publicar a página /material, submeter este arquivo à
 * mesma revisão já feita nos contratos PJ (ver CONTRATOS/). Mudanças no texto
 * exigem incrementar TERM_VERSION — cada MaterialRequest grava a versão
 * aceita no momento (auditoria).
 */
export const TERM_VERSION = "v1-rascunho-2026-08-18";

export interface TermoApoiadorData {
  supporterName: string;
  supporterCpf: string;
  city: string | null;
  items: MaterialRequestItem[];
  acceptedAt: Date;
  ip: string | null;
  candidateName: string;
  office: string | null;
  party: string | null;
  electionYear: number | null;
  committee: {
    razaoSocial: string | null;
    cnpj: string | null;
    address: string | null;
  };
}

export function buildTermoText(d: TermoApoiadorData): {
  title: string;
  paragraphs: string[];
  itemsLabel: { label: string; qty: number }[];
} {
  const officeLabel = d.office ?? "candidato(a)";
  const itemsLabel = d.items.map((i) => ({ label: materialItemLabel(i.item), qty: i.qty }));
  const itemsText = itemsLabel.map((i) => `${i.qty} ${i.label.toLowerCase()}`).join(", ");

  const paragraphs = [
    `Eu, ${d.supporterName}, portador(a) do CPF ${formatCpf(d.supporterCpf)}` +
      (d.city ? `, residente em ${d.city}` : "") +
      `, declaro para os devidos fins que recebi, na condição de apoiador(a) voluntário(a) da campanha de ` +
      `${d.candidateName} ao cargo de ${officeLabel}${d.electionYear ? ` (${d.electionYear})` : ""}` +
      (d.party ? `, pelo partido ${d.party}` : "") +
      `, o seguinte material de campanha: ${itemsText || "nenhum item informado"}.`,
    `Declaro que o material acima é recebido de forma voluntária e gratuita, sem qualquer contrapartida ` +
      `financeira, para distribuição espontânea de apoio à candidatura, comprometendo-me a utilizá-lo em ` +
      `conformidade com a Lei nº 9.504/1997 e as normas do TSE aplicáveis à propaganda eleitoral, sem fixação ` +
      `em local proibido e sem repasse a terceiros mediante pagamento.`,
    `Este termo é gerado eletronicamente a partir do aceite (clickwrap) registrado no formulário público de ` +
      `solicitação de material, servindo como comprovante de recebimento para fins de prestação de contas ` +
      `perante a Justiça Eleitoral.`,
  ];

  return {
    title: "Termo de Apoiador — Recebimento de Material de Campanha",
    paragraphs,
    itemsLabel,
  };
}

export function committeeFromSettings(settings: {
  razaoSocial: string | null;
  cnpj: string | null;
  cnpjLogradouro: string | null;
  cnpjNumero: string | null;
  cnpjComplemento: string | null;
  cnpjBairro: string | null;
  cnpjCep: string | null;
  cnpjMunicipio: string | null;
  cnpjUf: string | null;
}): TermoApoiadorData["committee"] {
  return {
    razaoSocial: settings.razaoSocial,
    cnpj: settings.cnpj,
    address: formatEndereco({
      logradouro: settings.cnpjLogradouro,
      numero: settings.cnpjNumero,
      complemento: settings.cnpjComplemento,
      bairro: settings.cnpjBairro,
      cep: settings.cnpjCep,
      municipio: settings.cnpjMunicipio,
      uf: settings.cnpjUf,
    }),
  };
}

export { formatCnpj };
