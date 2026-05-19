import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import estaduaisMunicipios from "@/data/eleitos-2022/dep-estaduais-municipios.json";
import federaisMunicipios from "@/data/eleitos-2022/dep-federais-municipios.json";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cargo = searchParams.get("cargo");
  const nome  = searchParams.get("nome")?.toUpperCase() ?? "";

  const db =
    cargo === "federal"
      ? (federaisMunicipios as Record<string, { codigo: string; municipio: string; votos: number }[]>)
      : (estaduaisMunicipios as Record<string, { codigo: string; municipio: string; votos: number }[]>);

  const municipios = db[nome] ?? [];

  return NextResponse.json(municipios);
}
