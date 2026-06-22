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
  // Canal principal (evento EBA) — edição ADOLESCENTES. É o destino do QR Code da apostila.
  "nao-vos-conformeis": {
    slug: "nao-vos-conformeis",
    title: "Não Vos Conformeis",
    titleLines: ["NÃO VOS", "CONFORMEIS"],
    subtitle: "O que estão tentando plantar na sua cabeça",
    description:
      "Existe uma disputa silenciosa pela sua mente — o marxismo cultural, empurrado o tempo todo pelo feed, pela série e pela aula. Nesta edição para adolescentes, André Santos mostra as 7 armadilhas mais comuns, de onde elas vieram e como Romanos 12 te blinda pela renovação da mente: 'E não vos conformeis com este mundo, mas transformai-vos.'",
    pdfPath: "/ebooks/nao-vos-conformeis.pdf",
    pdfDownloadName: "nao-vos-conformeis.pdf",
    ctaDownloadLabel: "Baixar Não Vos Conformeis",
    metaTitle: "Não Vos Conformeis — Ebook Gratuito | André Santos",
    metaDescription:
      "O antídoto de Romanos 12 ao marxismo cultural, em linguagem para adolescentes. Baixe o ebook gratuito de André Santos e não se conforme: transforme-se.",
    whatsappGroupUrl: WHATSAPP_GROUP_URL,
    postRedirectUrl: POST_REDIRECT_URL,
  },
  // Mesmo tema, edição para PAIS e líderes (com a história das raízes ideológicas).
  "nao-vos-conformeis-pais": {
    slug: "nao-vos-conformeis-pais",
    title: "Não Vos Conformeis",
    titleLines: ["NÃO VOS", "CONFORMEIS"],
    subtitle: "Como blindar seus filhos contra o marxismo cultural",
    description:
      "Existe uma ameaça silenciosa e sutil na formação de adolescentes e jovens — o marxismo cultural. Nesta edição para pais e líderes, André Santos revela as raízes históricas dessa cosmovisão (de Marx a Gramsci e à Escola de Frankfurt), desmascara os 7 engodos e mostra, versículo a versículo em Romanos 12, como blindar quem você ama pela renovação da mente.",
    pdfPath: "/ebooks/nao-vos-conformeis-pais.pdf",
    pdfDownloadName: "nao-vos-conformeis-pais.pdf",
    ctaDownloadLabel: "Baixar Não Vos Conformeis (Pais)",
    metaTitle: "Não Vos Conformeis (Pais) — Ebook Gratuito | André Santos",
    metaDescription:
      "Como blindar adolescentes e jovens contra o marxismo cultural, à luz de Romanos 12. Edição para pais e líderes. Baixe o ebook gratuito de André Santos.",
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
