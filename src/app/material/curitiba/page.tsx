import { Suspense } from "react";
import { MaterialForm } from "../material-form";

// Mesma lógica de /material: página estática, form é client component.
// Variante específica para as congregações de Curitiba — exige seleção
// obrigatória da congregação (lista vem do cadastro de igrejas do sistema).
export const dynamic = "force-static";

export default function MaterialCuritibaPage() {
  return (
    <Suspense fallback={null}>
      <MaterialForm requireChurch />
    </Suspense>
  );
}
