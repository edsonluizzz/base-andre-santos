import type { MaterialRequestStatus, Prisma } from "@prisma/client";

export const VALID_MATERIAL_STATUSES = new Set<MaterialRequestStatus>([
  "PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO",
]);

export type MaterialFilters = {
  status?: MaterialRequestStatus;
  municipio?: string;
  zoneId?: string;
};

/** Lê status/cidade/classificação (zona) da querystring — usado por toda tela e exportação de Material de Campanha. */
export function parseMaterialFilters(url: string, opts?: { defaultStatus?: MaterialRequestStatus }): MaterialFilters {
  const { searchParams } = new URL(url);
  const statusParam = searchParams.get("status") ?? "";
  const status = VALID_MATERIAL_STATUSES.has(statusParam as MaterialRequestStatus)
    ? (statusParam as MaterialRequestStatus)
    : opts?.defaultStatus;
  const municipio = searchParams.get("municipio")?.trim() || undefined;
  const zoneId = searchParams.get("zoneId")?.trim() || undefined;
  return { status, municipio, zoneId };
}

export function buildMaterialWhere(cid: string, filters: MaterialFilters): Prisma.MaterialRequestWhereInput {
  return {
    campaignId: cid,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.municipio ? { deliveryMunicipio: filters.municipio } : {}),
    ...(filters.zoneId ? { collaborator: { zones: { some: { zoneId: filters.zoneId } } } } : {}),
  };
}
