import { DescadastroForm } from "./descadastro-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancelar recebimento de emails" };

export default function DescadastroPage({
  searchParams,
}: {
  searchParams: { e?: string; t?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a1220] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1a2e] p-8 text-slate-200">
        <h1 className="text-xl font-bold text-white mb-2">Cancelar recebimento de emails</h1>
        <DescadastroForm email={searchParams.e ?? ""} token={searchParams.t ?? ""} />
      </div>
    </main>
  );
}
