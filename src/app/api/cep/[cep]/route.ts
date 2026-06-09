import { NextRequest, NextResponse } from "next/server";

type ViaCepResponse = {
  erro?: boolean;
  localidade?: string;
  bairro?: string;
  logradouro?: string;
  uf?: string;
  cep?: string;
};

export async function GET(_req: NextRequest, { params }: { params: { cep: string } }) {
  try {
    const cep = params.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      return NextResponse.json({ error: "CEP deve ter 8 dígitos" }, { status: 400 });
    }

    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao consultar ViaCEP" }, { status: 502 });
    }

    const data: ViaCepResponse = await res.json();

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      {
        city:         data.localidade ?? "",
        neighborhood: data.bairro ?? "",
        street:       data.logradouro ?? "",
        state:        data.uf ?? "",
        cep:          data.cep ?? "",
      },
      {
        // CEP praticamente não muda — CDN serve repetições do mesmo CEP por 24h
        // (em evento, dezenas de pessoas da mesma cidade digitam CEPs iguais).
        headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
      }
    );
  } catch (err) {
    console.error("[cep GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
