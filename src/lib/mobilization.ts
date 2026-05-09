const PROFILE_BASE: Record<string, number> = {
  VEREADOR:              100,
  LIDER_POLITICO:         90,
  PRESIDENTE_ASSOCIACAO:  85,
  PASTOR:                 80,
  LIDER_RELIGIOSO:        75,
  EMPRESARIO:             70,
  LIDERANCA_COMUNITARIA:  60,
  EDUCADOR:               50,
  FAMILIA:                40,
  JOVEM:                  35,
  APOIADOR:               20,
};

const SUPPORT_MULT: Record<string, number> = {
  CONFIRMADO: 1.0,
  NEGOCIANDO: 0.75,
  NEUTRO:     0.5,
  ADVERSARIO: 0.0,
};

const STATUS_MULT: Record<string, number> = {
  ACTIVE:   1.0,
  LEAD:     0.4,
  INACTIVE: 0.0,
};

export function calcMobilizationScore(params: {
  profile: string;
  supportStatus: string;
  status: string;
  contributionTypes: string[];
  attendanceCount?: number;
}): number {
  const base = PROFILE_BASE[params.profile] ?? 20;
  const sMult = STATUS_MULT[params.status] ?? 0;
  const suppMult = SUPPORT_MULT[params.supportStatus] ?? 0.5;
  const contribBonus = params.contributionTypes.length * 3;
  const attendanceBonus = Math.min(20, (params.attendanceCount ?? 0) * 2);
  const score = base * sMult * suppMult + contribBonus + attendanceBonus;
  return Math.min(100, Math.max(0, Math.round(score)));
}
