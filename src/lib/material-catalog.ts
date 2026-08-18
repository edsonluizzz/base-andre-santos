/** Catálogo fixo de material de campanha. Migrar para tabela própria só se
 * precisar de controle de estoque por item — no MVP isso é feito manualmente
 * pela equipe na aprovação do pedido (/materiais). */
export interface MaterialCatalogItem {
  id: string;
  label: string;
  unidade: string;
}

export const MATERIAL_CATALOG: MaterialCatalogItem[] = [
  { id: "santinho", label: "Santinho", unidade: "unidades" },
  { id: "adesivo", label: "Adesivo", unidade: "unidades" },
  { id: "camiseta", label: "Camiseta", unidade: "unidades" },
  { id: "bandeira", label: "Bandeira", unidade: "unidades" },
  { id: "bone", label: "Boné", unidade: "unidades" },
  { id: "cartaz", label: "Cartaz", unidade: "unidades" },
];

export const MATERIAL_CATALOG_MAP: Record<string, MaterialCatalogItem> = Object.fromEntries(
  MATERIAL_CATALOG.map((item) => [item.id, item]),
);

export interface MaterialRequestItem {
  item: string; // id do MATERIAL_CATALOG
  qty: number;
}

export function materialItemLabel(id: string): string {
  return MATERIAL_CATALOG_MAP[id]?.label ?? id;
}
