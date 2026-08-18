import { Suspense } from "react";
import { MaterialForm } from "./material-form";

// Mesma lógica de /cadastro: página estática, form é client component.
export const dynamic = "force-static";

export default function MaterialPage() {
  return (
    <Suspense fallback={null}>
      <MaterialForm />
    </Suspense>
  );
}
