import type { MaterialRequestStatus, Prisma } from "@prisma/client";

export const VALID_MATERIAL_STATUSES = new Set<MaterialRequestStatus>([
  "PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO",
]);

export type MaterialKind = "individual" | "church";
const VALID_KINDS = new Set<MaterialKind>(["individual", "church"]);

export type MaterialFilters = {
  status?: MaterialRequestStatus;
  municipio?: string;
  zoneId?: string;
  kind?: MaterialKind;
};

/** Lê status/cidade/classificação (zona)/tipo da querystring — usado por toda tela e exportação de Material de Campanha. */
export function parseMaterialFilters(url: string, opts?: { defaultStatus?: MaterialRequestStatus }): MaterialFilters {
  const { searchParams } = new URL(url);
  const statusParam = searchParams.get("status") ?? "";
  const status = VALID_MATERIAL_STATUSES.has(statusParam as MaterialRequestStatus)
    ? (statusParam as MaterialRequestStatus)
    : opts?.defaultStatus;
  const municipio = searchParams.get("municipio")?.trim() || undefined;
  const zoneId = searchParams.get("zoneId")?.trim() || undefined;
  const kindParam = searchParams.get("kind") ?? "";
  const kind = VALID_KINDS.has(kindParam as MaterialKind) ? (kindParam as MaterialKind) : undefined;
  return { status, municipio, zoneId, kind };
}

export function buildMaterialWhere(cid: string, filters: MaterialFilters): Prisma.MaterialRequestWhereInput {
  return {
    campaignId: cid,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.municipio ? { deliveryMunicipio: filters.municipio } : {}),
    ...(filters.zoneId ? { collaborator: { zones: { some: { zoneId: filters.zoneId } } } } : {}),
    // Pedido de congregação (kit) tem churchId preenchido; pedido individual, não.
    ...(filters.kind === "church" ? { churchId: { not: null } } : {}),
    ...(filters.kind === "individual" ? { churchId: null } : {}),
  };
}
