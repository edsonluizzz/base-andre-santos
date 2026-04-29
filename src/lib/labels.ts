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
};

export const SUPPORT_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  NEGOCIANDO: "Negociando",
  NEUTRO:     "Neutro",
  ADVERSARIO: "Adversário",
};

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

export const TIER_LABEL: Record<string, string> = {
  APOIADOR:    "Apoiador",
  ATIVISTA:    "Ativista",
  LIDER_CELULA:"Líder de Célula",
  COORDENADOR: "Coordenador",
};

export const ROLE_ORDER = [
  "COORD_GERAL", "COORD_REGIONAL", "LIDER_MUNICIPAL", "LIDER_BAIRRO", "VOLUNTARIO",
] as const;

export const PROFILE_ORDER = [
  "PASTOR", "VEREADOR", "EMPRESARIO", "LIDER_POLITICO",
  "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA", "APOIADOR",
] as const;

export const SUPPORT_ORDER = [
  "CONFIRMADO", "NEGOCIANDO", "NEUTRO", "ADVERSARIO",
] as const;
