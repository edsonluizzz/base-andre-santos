import { Suspense } from "react";
import { CadastroForm } from "./cadastro-form";

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
