export const CONTRIBUTION_OPTIONS = [
  { value: "VOLUNTARIO_CAMPANHA", label: "Voluntário de campanha" },
  { value: "DOADOR",              label: "Doador" },
  { value: "DIVULGADOR_REDES",    label: "Divulgar nas redes" },
  { value: "CABO_ELEITORAL",      label: "Cabo eleitoral" },
  { value: "PANFLETEIRO",         label: "Panfleteiro" },
  { value: "MOTORISTA",           label: "Motorista" },
  { value: "APOIO_LOGISTICO",     label: "Apoio logístico" },
  { value: "OUTRO",               label: "Outro" },
] as const;

export type ContributionValue = (typeof CONTRIBUTION_OPTIONS)[number]["value"];

export const TIER_LABEL: Record<string, string> = {
  APOIADOR:    "Apoiador",
  ATIVISTA:    "Ativista",
  LIDER_CELULA:"Líder de Célula",
  COORDENADOR: "Coordenador",
};

export const TIER_THRESHOLDS = { ATIVISTA: 5, LIDER_CELULA: 15 };
