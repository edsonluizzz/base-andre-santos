import { Suspense } from "react";
import { FotoPerfilForm } from "./fotoperfil-form";

// Estática como /cadastro — moldura é desenhada no canvas a partir das cores/
// dados do tenant (buscados client-side em /api/public/stats), sem imagem fixa.
export const dynamic = "force-static";

export default function FotoPerfilPage() {
  return (
    <Suspense fallback={null}>
      <FotoPerfilForm />
    </Suspense>
  );
}
