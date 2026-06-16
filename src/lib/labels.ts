export const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL:     "Coord. Geral",
  COORD_REGIONAL:  "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal",
  LIDER_BAIRRO:    "Líder de Bairro",
  VOLUNTARIO:      "Voluntário",
};

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE:   "Ativo",
  LEAD:     "Lead",
  INACTIVE: "Inativo",
};

export const PROFILE_LABEL: Record<string, string> = {
  APOIADOR:              "Apoiador",
  PASTOR:                "Pastor",
  PRESIDENTE_ASSOCIACAO: "Pres. de Associação",
  LIDER_POLITICO:        "Líder Político",
  VEREADOR:              "Vereador",
  EMPRESARIO:            "Empresário",
  LIDERANCA_COMUNITARIA: "Liderança Comunitária",
  LIDER_RELIGIOSO:       "Líder Religioso",
  EDUCADOR:              "Educador",
  FAMILIA:               "Família",
  JOVEM:                 "Jovem",
};

export const CHANNEL_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP:  "WhatsApp",
  EVENTO:    "Evento",
  LINK:      "Link de cadastro",
  OUTRO:     "Outro",
};

export const SUPPORT_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  NEGOCIANDO: "Negociando",
  NEUTRO:     "Neutro",
  ADVERSARIO: "Adversário",
};

export const SOURCE_LABEL: Record<string, string> = {
  CADASTRO_PUBLICO: "Formulário público",
  INDICACAO:        "Indicação",
  EVENTO:           "Evento",
  INSTAGRAM:        "Instagram",
  WHATSAPP:         "WhatsApp",
  LINK:             "Link de cadastro",
  RUA:              "Cadastro na rua",
  CONVITE_LINK:     "Convite (link)",
  IMPORTACAO_XLSX:  "Importação (planilha)",
  MANUAL_FORM:      "Cadastro manual",
  MANUAL_ADMIN:     "Cadastro manual (admin)",
  WF1:              "WhatsApp (cron diário)",
  WF3:              "WhatsApp (lead novo)",
  WF4:              "WhatsApp (disparo manual)",
};

// Rótulo amigável para qualquer origem. Conhecidos vêm do SOURCE_LABEL; EBOOK_*
// vira "E-book: ..."; o resto é capitalizado (nunca mostra CÓDIGO_CRU na tela).
export function sourceLabel(s: string | null | undefined): string {
  if (!s) return "—";
  if (SOURCE_LABEL[s]) return SOURCE_LABEL[s];
  if (s.toUpperCase().startsWith("EBOOK")) {
    const rest = s.slice(5).replace(/^[_-]+/, "").replace(/[_-]+/g, " ").trim().toLowerCase();
    return rest ? `E-book: ${rest.replace(/\b\w/g, (c) => c.toUpperCase())}` : "E-book";
  }
  return s.replace(/[_-]+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CONTRIB_LABEL: Record<string, string> = {
  VOLUNTARIO_CAMPANHA: "Voluntário de apoio",
  DOADOR:              "Doador",
  DIVULGADOR_REDES:    "Divulgar nas redes",
  CABO_ELEITORAL:      "Cabo eleitoral",
  PANFLETEIRO:         "Panfleteiro",
  MOTORISTA:           "Motorista",
  APOIO_LOGISTICO:     "Apoio logístico",
  OUTRO:               "Outro",
};

export const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT:   "Presente",
  ABSENT:    "Ausente",
  JUSTIFIED: "Justificado",
};

export const ROLE_ORDER = [
  "COORD_GERAL", "COORD_REGIONAL", "LIDER_MUNICIPAL", "LIDER_BAIRRO", "VOLUNTARIO",
] as const;

export const PROFILE_ORDER = [
  "PASTOR", "LIDER_RELIGIOSO", "VEREADOR", "EMPRESARIO", "LIDER_POLITICO",
  "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA", "EDUCADOR", "JOVEM", "FAMILIA", "APOIADOR",
] as const;

export const CHANNEL_ORDER = [
  "INSTAGRAM", "WHATSAPP", "EVENTO", "LINK", "OUTRO",
] as const;

export const SUPPORT_ORDER = [
  "CONFIRMADO", "NEGOCIANDO", "NEUTRO", "ADVERSARIO",
] as const;
