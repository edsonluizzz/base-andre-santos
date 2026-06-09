import { Suspense } from "react";
import { CadastroForm } from "./cadastro-form";

// Página 100% estática (form é client component) — servida pelo CDN sem
// invocação de função. Se alguém introduzir API dinâmica aqui, o build quebra
// em vez de silenciosamente virar serverless (custo por visitante em evento).
export const dynamic = "force-static";

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
