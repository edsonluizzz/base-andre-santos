import type { PrismaClient, ContractTemplateType } from "@prisma/client";
import PDFDocument from "pdfkit";
import { valorPorExtenso } from "./valor-extenso";

export type ContractPdfData = {
  code: string;

  contratanteNome: string;
  contratanteCnpj: string;
  contratanteEndereco: string | null;
  contratanteCidade: string | null;
  contratanteUf: string | null;

  counterpartyName: string;
  counterpartyDocument: string;
  counterpartyAddress: string | null;
  counterpartyCity: string | null;
  counterpartyUf: string | null;
  counterpartyPhone: string | null;
  counterpartyEmail: string | null;
  representativeName: string | null;
  representativeCpf: string | null;
  representativeAddress: string | null;

  objectDescription: string;
  eventAddress: string | null;
  startDate: Date | null;
  endDate: Date | null;
  totalValue: number | null;
  priceJustification: string | null;
  paymentTerms: string | null;
  signatureDate: Date;
  forumCity: string | null;
  forumUf: string | null;
};

function fmtDateLong(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtMoneyExtenso(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${fmtMoney(n)} (${valorPorExtenso(n)})`;
}

const TITLES: Record<ContractTemplateType, string> = {
  PRESTACAO_SERVICOS_PJ: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
  PRESTACAO_SERVICOS_PF: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
  MILITANCIA: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MILITÂNCIA",
  TERMO_DOACAO: "TERMO DE DOAÇÃO ESTIMÁVEL EM DINHEIRO",
  TERMO_CESSAO: "TERMO DE CESSÃO ESTIMÁVEL EM DINHEIRO\nPOR PERÍODO DETERMINADO",
};

const CELEBRA_LINE: Record<ContractTemplateType, string> = {
  PRESTACAO_SERVICOS_PJ: "Pelo presente, as partes acima qualificadas celebram CONTRATO DE PRESTAÇÃO DE SERVIÇO, o qual reger-se-á pelas seguintes cláusulas e condições:",
  PRESTACAO_SERVICOS_PF: "Pelo presente, as partes acima qualificadas celebram CONTRATO DE PRESTAÇÃO DE SERVIÇO, o qual reger-se-á pelas seguintes cláusulas e condições:",
  MILITANCIA: "Pelo presente, as partes acima qualificadas celebram CONTRATO DE PRESTAÇÃO DE SERVIÇO, o qual reger-se-á pelas seguintes cláusulas e condições:",
  TERMO_DOACAO: "Pelo presente, as partes acima celebram TERMO DE DOAÇÃO ESTIMÁVEL EM DINHEIRO, o qual reger-se-á pelas seguintes cláusulas e condições:",
  TERMO_CESSAO: "Pelo presente, as partes acima celebram TERMO DE CESSÃO ESTIMÁVEL EM DINHEIRO POR PERÍODO DETERMINADO, o qual reger-se-á pelas seguintes cláusulas e condições:",
};

function contratanteLine(d: ContractPdfData): string {
  return `${d.contratanteNome}, inscrito no CNPJ sob o nº ${d.contratanteCnpj}, com endereço sito à ${d.contratanteEndereco ?? "—"}, em ${d.contratanteCidade ?? "—"}/${d.contratanteUf ?? "—"}`;
}

function buildPreambulo(t: ContractTemplateType, d: ContractPdfData): string[] {
  switch (t) {
    case "PRESTACAO_SERVICOS_PJ":
      return [
        `${contratanteLine(d)}, doravante denominado apenas de “Contratante”;`,
        `${d.counterpartyName}, inscrito no CNPJ sob o nº ${d.counterpartyDocument}, com endereço sito à ${d.counterpartyAddress ?? "—"}, em ${d.counterpartyCity ?? "—"}/${d.counterpartyUf ?? "—"}, Fone ${d.counterpartyPhone ?? "—"}, e-mail ${d.counterpartyEmail ?? "—"}, neste ato representado por ${d.representativeName ?? "—"}, inscrito(a) no CPF sob o nº ${d.representativeCpf ?? "—"}, residente à ${d.representativeAddress ?? "—"}, em ${d.counterpartyCity ?? "—"}/${d.counterpartyUf ?? "—"}, doravante denominado(a) apenas de “Contratado(a)”;`,
      ];
    case "PRESTACAO_SERVICOS_PF":
    case "MILITANCIA":
      return [
        `${contratanteLine(d)}, doravante denominado apenas de “Contratante”;`,
        `${d.counterpartyName}, inscrito(a) no CPF sob o nº ${d.counterpartyDocument}, residente à ${d.counterpartyAddress ?? "—"}, em ${d.counterpartyCity ?? "—"}/${d.counterpartyUf ?? "—"}, Fone ${d.counterpartyPhone ?? "—"}, e-mail ${d.counterpartyEmail ?? "—"}, doravante denominado(a) apenas de “Contratado(a)”;`,
      ];
    case "TERMO_DOACAO":
      return [
        `${d.counterpartyName}, inscrito no CPF sob o nº ${d.counterpartyDocument}, com endereço sito à ${d.counterpartyAddress ?? "—"}, em ${d.counterpartyCity ?? "—"}/${d.counterpartyUf ?? "—"}, Fone ${d.counterpartyPhone ?? "—"}, e-mail ${d.counterpartyEmail ?? "—"}, doravante denominado(a) apenas de “Doador(a)”;`,
        `${contratanteLine(d)}, doravante denominado apenas de “Donatário”;`,
      ];
    case "TERMO_CESSAO":
      return [
        `${contratanteLine(d)}, doravante denominado apenas de “Cessionário”;`,
        `${d.counterpartyName}, inscrito no CPF sob o nº ${d.counterpartyDocument}, com endereço sito à ${d.counterpartyAddress ?? "—"}, em ${d.counterpartyCity ?? "—"}/${d.counterpartyUf ?? "—"}, Fone ${d.counterpartyPhone ?? "—"}, e-mail ${d.counterpartyEmail ?? "—"}, doravante denominado(a) apenas de “Cedente”;`,
      ];
  }
}

function buildClausesPJ(d: ContractPdfData): string[] {
  const paymentTerms = d.paymentTerms ?? `que deverá ser integralmente adimplido até a data de ${fmtDateShort(d.endDate)}`;
  return [
    `CLÁUSULA 1ª – OBJETO: O presente instrumento tem como objeto a prestação, pelo(a) Contratado(a) ao Contratante, dos serviços de ${d.objectDescription}${d.eventAddress ? `, a serem realizados na ${d.eventAddress}` : ""}.`,
    `Parágrafo Primeiro: Os serviços serão desempenhados pelo período de ${fmtDateShort(d.startDate)} até ${fmtDateShort(d.endDate)}.`,
    `Parágrafo Segundo: O(s) serviço(s) será(ão) prestado(s) de acordo com a necessidade do Contratante e preferencialmente em horário comercial, podendo ser prestados em horários extraordinários, à exclusivo critério do Contratante, mediante remuneração complementar.`,
    `CLÁUSULA 2ª – DA REMUNERAÇÃO: É obrigação do Contratante o pagamento, ao Contratado, do valor total de ${fmtMoneyExtenso(d.totalValue)}, ${paymentTerms}, mediante comprovação da materialidade do serviço contratado.`,
    `Parágrafo Primeiro: O valor da remuneração do(a) Contratado(a) é fixado de acordo com ${d.priceJustification ?? "orçamento apresentado pelo prestador"}.`,
    `Parágrafo Segundo: Eventuais despesas acessórias, necessárias à execução do serviço contratado, poderão ser reembolsadas, desde que:`,
    `I - Previamente autorizadas pelo Contratante ou por pessoa responsável;`,
    `II - A comprovação fiscal seja emitida contra o CNPJ do ora Contratante;`,
    `III - A solicitação de reembolso seja feita por escrito e acompanhada da necessária comprovação.`,
    `CLÁUSULA 3ª – DAS OBRIGAÇÕES DO CONTRATADO: São obrigações do Contratado(a):`,
    `a) Cumprir o estipulado nos termos do presente instrumento contratual.`,
    `b) Obedecer as instruções da contratante.`,
    `c) Prestar informações ao Contratante, sempre que solicitado, acerca da execução de seus serviços e demais detalhes sobre a execução de suas atividades.`,
    `d) Conservar os documentos comprobatórios do serviço, em especial, de sua efetiva execução (materialidade), por 05 (cinco) anos, sob pena de responder por eventual prejuízo suportado pelo Contratante decorrente da falta de tais documentos;`,
    `e) Realizar o registro de suas atividades através dos meios cabíveis (fotos, vídeos, etc.), com a finalidade de comprovar a materialidade do objeto do presente contrato.`,
    `Parágrafo Único: O descumprimento da presente Cláusula pelo(a) Contratado(a) implica na responsabilização exclusiva do mesmo por eventual prejuízo que venha a ser suportado pelo Contratante em decorrência do descumprimento.`,
    `CLÁUSULA 4ª – DAS CAUSAS DE RESCISÃO: São motivos para a rescisão do presente instrumento:`,
    `a) O não pagamento, pelo Contratante, da remuneração do(a) Contratado(a);`,
    `b) Desídia do(a) Contratado(a) no cumprimento das obrigações assumidas.`,
    `c) O não cumprimento das obrigações assumidas por parte do Contratado(a); praticar atos que atentem contra a imagem do Contratante perante terceiros.`,
    `d) Deixar de cumprir qualquer das cláusulas dispostas no presente instrumento.`,
    `e) O silêncio ou a impossibilidade injustificada de contato por parte do(a) Contratado(a), por período superior a 48 horas.`,
    `f) O compartilhamento, por parte do(a) Contratado(a), de informações relacionadas à Candidatura do Contratante, em especial, acerca de estratégias de campanha, ressalvada determinação legal ou de autoridade competente para tanto.`,
    `Parágrafo Único: A comunicação da rescisão contratual poderá ser comunicada à parte adversa por qualquer meio adequado, seja ele formal ou informal (por aplicativo de troca instantânea de mensagens, e-mail, etc.), mas desde que por escrito.`,
    `CLÁUSULA 5ª – DO FORO: As partes elegem o foro da Cidade de ${d.forumCity ?? "—"}/${d.forumUf ?? "—"}, para dirimir as questões resultantes da execução do presente contrato.`,
  ];
}

/** Prestação de Serviços (PF) — versão híbrida: estrutura da v2 (assinatura eletrônica,
 * rescisão livre) + itens d/e de materialidade restaurados da original (removidos na v2). */
function buildClausesPF(d: ContractPdfData): string[] {
  const paymentTerms = d.paymentTerms ?? `que deverá ser integralmente adimplido até a data de ${fmtDateShort(d.endDate)}`;
  return [
    `CLÁUSULA 1ª – OBJETO: O presente instrumento tem como objeto a prestação, pelo(a) Contratado(a) ao Contratante, dos serviços de ${d.objectDescription}.`,
    `Parágrafo Primeiro: O presente contrato terá vigência a partir de ${fmtDateShort(d.startDate)} até ${fmtDateShort(d.endDate)}.`,
    `Parágrafo Segundo: O(s) serviço(s) será(ão) prestado(s) de acordo com a necessidade do Contratante e preferencialmente em horário comercial${d.eventAddress ? `, na Cidade de ${d.eventAddress}` : ""}.`,
    `Parágrafo Terceiro: Os serviços poderão ser prestados em horários, locais e duração diversas, mediante prévio alinhamento e, se necessário, ajuste de remuneração, hipótese em que as condições complementares ou modificadas serão levadas a termo.`,
    `Parágrafo Quarto: O Contratado(a) declara, ao firmar o presente Contrato, que cumpre todos os requisitos legais para o desempenho das atividades contratadas.`,
    `CLÁUSULA 2ª – DA REMUNERAÇÃO: É obrigação do Contratante o pagamento, ao Contratado, do valor de ${fmtMoneyExtenso(d.totalValue)}, ${paymentTerms}.`,
    `Parágrafo Primeiro: O valor da remuneração do(a) Contratado(a) é fixado de acordo com ${d.priceJustification ?? "orçamento apresentado pelo prestador"}.`,
    `CLÁUSULA 3ª - DAS DESPESAS ACESSÓRIAS: Eventuais despesas acessórias, necessárias à execução do serviço contratado, poderão ser reembolsadas, desde que:`,
    `I - Previamente autorizadas pelo Contratante ou por pessoa responsável;`,
    `II - A comprovação fiscal seja emitida contra o CNPJ do ora Contratante;`,
    `III - A solicitação de reembolso seja feita por escrito e acompanhada da necessária comprovação.`,
    `CLÁUSULA 4ª – DAS OBRIGAÇÕES DO CONTRATADO: São obrigações do Contratado(a):`,
    `a) Cumprir o estipulado nos termos do presente instrumento contratual.`,
    `b) Obedecer às instruções do Contratante.`,
    `c) Prestar informações ao Contratante, sempre que solicitado, acerca da execução de seus serviços e demais detalhes sobre a execução de suas atividades.`,
    `d) Conservar os documentos comprobatórios do serviço, em especial, de sua efetiva execução (materialidade), por 05 (cinco) anos, sob pena de responder por eventual prejuízo suportado pelo Contratante decorrente da falta de tais documentos;`,
    `e) Realizar o registro de suas atividades através dos meios cabíveis (fotos, vídeos, etc.), com a finalidade de comprovar a materialidade do objeto do presente contrato.`,
    `Parágrafo Único: O descumprimento da presente Cláusula pelo(a) Contratado(a) implica na responsabilização exclusiva do mesmo por eventual prejuízo que venha a ser suportado pelo Contratante em decorrência do descumprimento.`,
    `CLÁUSULA 5ª – DA PROTEÇÃO DE DADOS: Os dados da pessoa natural do Contratado, sejam eles sensíveis ou não, à que o Contratante tiver acesso, serão utilizados exclusivamente para identificação do primeiro junto à autoridades competentes e para cumprimento de exigências decorrentes de Leis, Resoluções ou de autoridades competentes, em especial, para fins de prestação de contas junto à Justiça Eleitoral, sendo de responsabilidade do(a) Contratante o processamento das solicitações do Contratado relacionadas aos seus dados.`,
    `CLÁUSULA 6ª – DA RESCISÃO: São motivos para a rescisão do presente instrumento, independentemente de notificação judicial ou extrajudicial e de aviso prévio:`,
    `a) O não pagamento, pelo Contratante, da remuneração do(a) Contratado(a);`,
    `b) Desídia do(a) Contratado(a) no cumprimento das obrigações assumidas.`,
    `c) O não cumprimento das obrigações assumidas por parte do Contratado(a); praticar atos que atentem contra a imagem do Contratante perante terceiros.`,
    `d) Deixar de cumprir qualquer das cláusulas dispostas no presente instrumento.`,
    `e) O silêncio ou a impossibilidade injustificada de contato por parte do(a) Contratado(a), por período superior a 48 horas.`,
    `f) O compartilhamento, por parte do(a) Contratado(a), de informações relacionadas à Candidatura do Contratante, em especial, acerca de estratégias de campanha, ressalvada determinação legal ou de autoridade competente para tanto.`,
    `Parágrafo Primeiro: O presente contrato poderá ser rescindido por qualquer das partes e a qualquer tempo, sem necessidade de aviso prévio e sem prejuízo à remuneração proporcional ao serviço prestado.`,
    `Parágrafo Segundo: A rescisão será comunicada por escrito, por e-mail, aplicativo de mensagens, plataforma de gestão da campanha ou outro meio adequado.`,
    `CLÁUSULA 7ª - DA ASSINATURA ELETRÔNICA OU DIGITAL: Com fundamento no art. 10, caput e §§ 1º e 2º, da MP nº 2.200-2/2001, e no art. 4º, II e III, da Lei nº 14.063/2020, as Partes reconhecem a validade da assinatura deste Contrato por meio eletrônico ou digital, inclusive por certificado ICP-Brasil ou por outro meio equivalente, desde já admitidas pelas Partes como válidos, que permitam comprovar autoria, integridade e manifestação de vontade dos signatários, produzindo os mesmos efeitos da assinatura manuscrita.`,
    `CLÁUSULA 8ª – DO FORO: As partes elegem o foro da Cidade de ${d.forumCity ?? "—"}/${d.forumUf ?? "—"}, para dirimir as questões resultantes da execução do presente contrato.`,
  ];
}

/** Militância (Cabo Eleitoral) — mesma lógica híbrida da Prestação PF: estrutura da v2
 * + itens d/e de materialidade restaurados da original. */
function buildClausesMilitancia(d: ContractPdfData): string[] {
  const paymentTerms = d.paymentTerms ?? "até o dia anterior à data da eleição";
  return [
    `CLÁUSULA 1ª – OBJETO: O presente instrumento tem como objeto a prestação de serviços de militância em geral pelo(a) Contratado(a), tais quais como ${d.objectDescription}.`,
    `Parágrafo Primeiro: O presente contrato terá vigência a partir de ${fmtDateShort(d.startDate)} até ${fmtDateShort(d.endDate)}, sem prejuízo de eventual acordo complementar, sobretudo na hipótese de participação do Contratante em segundo turno das eleições.`,
    `Parágrafo Segundo: O(s) serviço(s) será(ão) prestado(s) nos seguintes horários e locais: ${d.eventAddress ?? "—"}.`,
    `Parágrafo Terceiro: Os serviços poderão ser prestados em horários, locais e duração diversas, mediante prévio alinhamento e, se necessário, ajuste de remuneração, hipótese em que as condições complementares ou modificadas serão levadas a termo.`,
    `CLÁUSULA 2ª – DA REMUNERAÇÃO: É obrigação do Contratante o pagamento, ao Contratado, do valor de ${fmtMoneyExtenso(d.totalValue)}, ${paymentTerms}.`,
    `Parágrafo Único: ${d.priceJustification ?? "As Partes declaram que a remuneração ora fixada do Contratado assim o foi em observância aos padrões praticados no mercado."}`,
    `CLÁUSULA 3ª - DAS DESPESAS ACESSÓRIAS: Eventuais despesas acessórias, necessárias à execução do serviço contratado, poderão ser reembolsadas, desde que:`,
    `I - Previamente autorizadas pelo Contratante ou por pessoa responsável;`,
    `II - A comprovação fiscal seja emitida contra o CNPJ do ora Contratante;`,
    `III - A solicitação de reembolso seja feita por escrito e acompanhada da necessária comprovação.`,
    `CLÁUSULA 4ª – DAS OBRIGAÇÕES DO CONTRATADO: São obrigações do Contratado(a):`,
    `a) Cumprir o estipulado nos termos do presente instrumento contratual.`,
    `b) Obedecer às instruções escritas e verbais do Contratante.`,
    `c) Prestar informações ao Contratante, sempre que solicitado, acerca da execução de seus serviços e demais detalhes sobre a execução de suas atividades.`,
    `d) Conservar os documentos comprobatórios do serviço, em especial, de sua efetiva execução (materialidade), por 05 (cinco) anos, sob pena de responder por eventual prejuízo suportado pelo Contratante decorrente da falta de tais documentos.`,
    `e) Realizar o registro de suas atividades através dos meios cabíveis (fotos, vídeos, etc.), com a finalidade de comprovar a materialidade do objeto do presente contrato.`,
    `Parágrafo Único: O descumprimento da presente Cláusula pelo(a) Contratado(a) implica na responsabilização exclusiva do mesmo por eventual prejuízo que venha a ser suportado pelo Contratante em decorrência do descumprimento.`,
    `CLÁUSULA 5ª – DA PROTEÇÃO DE DADOS: Os dados da pessoa natural do Contratado, sejam eles sensíveis ou não, à que o Contratante tiver acesso, serão utilizados exclusivamente para identificação do primeiro junto à autoridades competentes e para cumprimento de exigências decorrentes de Leis, Resoluções ou de autoridades competentes, em especial, para fins de prestação de contas junto à Justiça Eleitoral, sendo de responsabilidade do(a) Contratante o processamento das solicitações do Contratado relacionadas aos seus dados.`,
    `CLÁUSULA 6ª – DA RESCISÃO: São motivos para a rescisão do presente instrumento, independentemente de notificação judicial ou extrajudicial e de aviso prévio:`,
    `a) O não pagamento, pelo Contratante, da remuneração do(a) Contratado(a);`,
    `b) A desídia do Contratado(a) no cumprimento das obrigações assumidas.`,
    `c) O não cumprimento das obrigações assumidas por parte do Contratado(a), ou o seu não comparecimento para o trabalho;`,
    `d) A prática de atos que atentem contra a imagem do Contratante perante terceiros.`,
    `e) Deixar de cumprir qualquer das cláusulas dispostas no presente instrumento.`,
    `f) O silêncio ou a impossibilidade injustificada de contato por parte do(a) Contratado(a), por período superior a 48 horas.`,
    `g) O compartilhamento, por parte do(a) Contratado(a), de informações relacionadas à Candidatura do Contratante, em especial, acerca de estratégias de campanha, ressalvada determinação legal ou de autoridade competente para tanto.`,
    `Parágrafo Primeiro: O presente contrato poderá ser rescindido por qualquer das partes e a qualquer tempo, sem necessidade de aviso prévio e sem prejuízo à remuneração proporcional ao serviço prestado.`,
    `Parágrafo Segundo: A rescisão será comunicada por escrito, por e-mail, aplicativo de mensagens, plataforma de gestão da campanha ou outro meio adequado.`,
    `CLÁUSULA 7ª - DA ASSINATURA ELETRÔNICA OU DIGITAL: Com fundamento no art. 10, caput e §§ 1º e 2º, da MP nº 2.200-2/2001, e no art. 4º, II e III, da Lei nº 14.063/2020, as Partes reconhecem a validade da assinatura deste Contrato por meio eletrônico ou digital, inclusive por certificado ICP-Brasil ou por outro meio equivalente, desde já admitidas pelas Partes como válidos, que permitam comprovar autoria, integridade e manifestação de vontade dos signatários, produzindo os mesmos efeitos da assinatura manuscrita.`,
    `CLÁUSULA 8ª - DO FORO: As partes elegem o foro da Cidade de ${d.forumCity ?? "—"}/${d.forumUf ?? "—"}, para dirimir as questões resultantes da execução do presente contrato.`,
  ];
}

function buildClausesDoacao(d: ContractPdfData): string[] {
  return [
    `CLÁUSULA 1ª – OBJETO: O presente instrumento tem como objeto a Doação Estimável do(a) ${d.objectDescription} ao donatário, de propriedade ou atividade econômica do Doador(a).`,
    `CLÁUSULA 2ª – DA GRATUIDADE: A presente Doação é feita à título gratuito e não oneroso, cujo valor se estima em ${fmtMoneyExtenso(d.totalValue)}, em conformidade com os preços praticados no mercado.`,
    `CLÁUSULA 3ª – DO FORO: As partes elegem o foro de ${d.forumCity ?? "—"}/${d.forumUf ?? "—"}, para dirimir as questões decorrentes do presente termo.`,
  ];
}

function buildClausesCessao(d: ContractPdfData): string[] {
  return [
    `CLÁUSULA 1ª – OBJETO: O presente instrumento tem como objeto a Cessão Estimável do(a) ${d.objectDescription}, pelo período de campanha.`,
    `Parágrafo Único: É dever do Cessionário devolver o bem cedido em boas condições de uso e fruição ao Cedente.`,
    `CLÁUSULA 2ª – DA VIGÊNCIA: O presente instrumento entra em vigor na data de ${fmtDateShort(d.startDate)} e permanece em vigor até o término da campanha do Cessionário.`,
    `CLÁUSULA 3ª – DA GRATUIDADE DA CESSÃO: A presente Cessão é feita à título gratuito e não oneroso, cujo valor se estima em ${fmtMoneyExtenso(d.totalValue)}.`,
    `CLÁUSULA 4ª – DO FORO: As partes elegem o foro de ${d.forumCity ?? "—"}/${d.forumUf ?? "—"}, para dirimir as questões decorrentes do presente termo.`,
  ];
}

function buildClauses(t: ContractTemplateType, d: ContractPdfData): string[] {
  switch (t) {
    case "PRESTACAO_SERVICOS_PJ": return buildClausesPJ(d);
    case "PRESTACAO_SERVICOS_PF": return buildClausesPF(d);
    case "MILITANCIA": return buildClausesMilitancia(d);
    case "TERMO_DOACAO": return buildClausesDoacao(d);
    case "TERMO_CESSAO": return buildClausesCessao(d);
  }
}

function buildSignatureRoles(t: ContractTemplateType, d: ContractPdfData): { leftName: string; leftRole: string; rightName: string; rightRole: string } {
  switch (t) {
    case "PRESTACAO_SERVICOS_PJ":
    case "PRESTACAO_SERVICOS_PF":
    case "MILITANCIA":
      return { leftName: d.contratanteNome, leftRole: "CONTRATANTE", rightName: d.counterpartyName, rightRole: "CONTRATADO" };
    case "TERMO_DOACAO":
      return { leftName: d.counterpartyName, leftRole: "DOADOR(A)", rightName: d.contratanteNome, rightRole: "DONATÁRIO" };
    case "TERMO_CESSAO":
      return { leftName: d.contratanteNome, leftRole: "CESSIONÁRIO", rightName: d.counterpartyName, rightRole: "CEDENTE" };
  }
}

/** Gera o PDF do contrato/termo a partir do modelo (templateType) e dos dados preenchidos. */
export function buildContractPdf(templateType: ContractTemplateType, data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 56, right: 56 } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const justify = { align: "justify" as const, width: pageWidth, lineGap: 2 };

    doc.font("Helvetica-Bold").fontSize(13).text(TITLES[templateType], { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(10.5);
    for (const p of buildPreambulo(templateType, data)) {
      doc.text(p, justify);
      doc.moveDown(0.6);
    }

    doc.text(CELEBRA_LINE[templateType], justify);
    doc.moveDown(0.8);

    for (const p of buildClauses(templateType, data)) {
      doc.text(p, justify);
      doc.moveDown(0.6);
    }

    doc.text(
      "E, assim por estarem justos e contratados assinam o presente, em 2 (duas) vias de igual forma, teor, na presença das testemunhas abaixo:",
      justify,
    );
    doc.moveDown(0.3);
    doc.text(`${data.forumCity ?? "—"}/${data.forumUf ?? "—"}, ${fmtDateLong(data.signatureDate)}.`, justify);
    doc.moveDown(2);

    const { leftName, leftRole, rightName, rightRole } = buildSignatureRoles(templateType, data);
    const center = { align: "center" as const, width: pageWidth };

    doc.text("____________________________________________________", center);
    doc.font("Helvetica-Bold").text(leftName, center);
    doc.font("Helvetica").fontSize(9).text(leftRole, center);
    doc.fontSize(10.5).moveDown(1.2);

    doc.text("____________________________________________________", center);
    doc.font("Helvetica-Bold").text(rightName, center);
    doc.font("Helvetica").fontSize(9).text(rightRole, center);
    doc.fontSize(10.5).moveDown(1.5);

    doc.x = doc.page.margins.left;
    doc.font("Helvetica").fontSize(10.5).text("Testemunhas:", doc.page.margins.left, doc.y, { width: pageWidth });
    doc.moveDown(0.5);
    for (let i = 0; i < 2; i++) {
      doc.text("Assinatura: __________________________________________", doc.page.margins.left, doc.y, { width: pageWidth });
      doc.text("Nome: ______________________________________________", doc.page.margins.left, doc.y, { width: pageWidth });
      doc.text("CPF: ____________________ RG: ________________________", doc.page.margins.left, doc.y, { width: pageWidth });
      doc.moveDown(0.6);
    }

    doc.moveDown(0.8);
    doc.fontSize(7.5).fillColor("#888").text(`Documento gerado eletronicamente pelo sistema Ovile Eleitoral — Contrato ${data.code}.`, { align: "center", width: pageWidth });

    doc.end();
  });
}

/** Próximo código sequencial (CT-001, CT-002...) por campanha — preenche buracos deixados por exclusões antes de avançar. */
export async function nextContractCode(db: PrismaClient, campaignId: string): Promise<string> {
  const contracts = await db.contract.findMany({ where: { campaignId }, select: { code: true } });
  const used = new Set(
    contracts
      .map((c) => {
        const m = c.code.match(/^CT-(\d+)$/);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n !== null),
  );
  let n = 1;
  while (used.has(n)) n++;
  return `CT-${String(n).padStart(3, "0")}`;
}
