export interface EbookConfig {
  slug: string;
  title: string;
  titleLines: string[];
  subtitle: string;
  description: string;
  pdfPath: string;
  pdfDownloadName: string;
  ctaDownloadLabel: string;
  metaTitle: string;
  metaDescription: string;
  whatsappGroupUrl: string;
  postRedirectUrl: string;
}

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/EsuR5rzuYnM6v6nn6RmbVE";
const POST_REDIRECT_URL = "https://prandresantos.com.br";

export const EBOOKS: Record<string, EbookConfig> = {
  "quem-sou-eu": {
    slug: "quem-sou-eu",
    title: "Quem Sou Eu",
    titleLines: ["QUEM", "SOU EU"],
    subtitle: "Uma jornada para descobrir o meu propósito",
    description:
      "Você foi criado com um propósito único e insubstituível. Neste ebook, André Santos compartilha a jornada que o transformou de improvável em instrumento — e como você pode descobrir o chamado que Deus preparou especialmente para você.",
    pdfPath: "/ebooks/quem-sou-eu.pdf",
    pdfDownloadName: "quem-sou-eu.pdf",
    ctaDownloadLabel: "Baixar Quem Sou Eu",
    metaTitle: "Quem Sou Eu — Ebook Gratuito | André Santos",
    metaDescription:
      "Uma jornada para descobrir o meu propósito. Baixe agora o ebook gratuito de André Santos, pré-candidato a Deputado Estadual pelo Paraná.",
    whatsappGroupUrl: WHATSAPP_GROUP_URL,
    postRedirectUrl: POST_REDIRECT_URL,
  },
  "nao-vos-conformeis": {
    slug: "nao-vos-conformeis",
    title: "Não Vos Conformeis",
    titleLines: ["NÃO VOS", "CONFORMEIS"],
    subtitle: "Romanos 12 e o antídoto ao marxismo cultural",
    description:
      "Existe uma ameaça silenciosa e sutil na formação de adolescentes e jovens — o marxismo cultural. Neste ebook, André Santos desmascara os principais engodos dessa cosmovisão e mostra, versículo a versículo em Romanos 12, como blindar quem você ama pela renovação da mente: 'E não vos conformeis com este mundo, mas transformai-vos.'",
    pdfPath: "/ebooks/nao-vos-conformeis.pdf",
    pdfDownloadName: "nao-vos-conformeis.pdf",
    ctaDownloadLabel: "Baixar Não Vos Conformeis",
    metaTitle: "Não Vos Conformeis — Ebook Gratuito | André Santos",
    metaDescription:
      "Romanos 12 e o antídoto ao marxismo cultural na formação de adolescentes e jovens. Baixe o ebook gratuito de André Santos e blinde sua família pela Palavra.",
    whatsappGroupUrl: WHATSAPP_GROUP_URL,
    postRedirectUrl: POST_REDIRECT_URL,
  },
  casamento: {
    slug: "casamento",
    title: "Sob a Tua Palavra",
    titleLines: ["SOB A", "TUA PALAVRA"],
    subtitle: "Segredos para um Matrimônio Frutífero",
    description:
      "O casamento foi criado por Deus — mas ninguém disse que seria fácil. Baseado na história de Manoá e sua esposa em Juízes 13, André Santos revela os princípios que transformam lares em crise em famílias de impacto: sensibilidade, liderança, diálogo e obediência à Palavra de Deus como semente de frutificação.",
    pdfPath: "/ebooks/sob-a-tua-palavra.pdf",
    pdfDownloadName: "sob-a-tua-palavra.pdf",
    ctaDownloadLabel: "Baixar Sob a Tua Palavra",
    metaTitle: "Sob a Tua Palavra — Ebook Gratuito | André Santos",
    metaDescription:
      "Segredos para um Matrimônio Frutífero. Baixe o ebook gratuito de André Santos sobre os princípios bíblicos que transformam casamentos em famílias de impacto.",
    whatsappGroupUrl: WHATSAPP_GROUP_URL,
    postRedirectUrl: POST_REDIRECT_URL,
  },
};

export function getEbook(slug: string): EbookConfig | null {
  return EBOOKS[slug] ?? null;
}

export const EBOOK_SLUGS = Object.keys(EBOOKS);
