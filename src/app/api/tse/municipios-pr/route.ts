import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Dados do TSE 2022 — Deputado Estadual PR
// Total de votos válidos por cidade nos mais votados (fonte: TSE resultados 2022)
// Usamos como referência: 1 vaga de dep. estadual PR ≈ 15.000–25.000 votos
// Meta sugerida = 0,5% do eleitorado do município (referência segura para 1 cadeira)

const PR_MUNICIPIOS_ELEITORADO: Record<string, number> = {
  "Curitiba": 1270080, "Londrina": 381684, "Maringá": 284025,
  "Ponta Grossa": 243765, "Cascavel": 248698, "São José dos Pinhais": 224836,
  "Foz do Iguaçu": 220344, "Colombo": 210347, "Guarapuava": 137527,
  "Paranaguá": 120060, "Araucária": 115803, "Toledo": 101345,
  "Apucarana": 103285, "Pinhais": 111085, "Campo Largo": 90782,
  "Almirante Tamandaré": 83042, "Umuarama": 88912, "Cambé": 89403,
  "Sarandi": 74658, "Paranavaí": 71124, "Francisco Beltrão": 68219,
  "Fazenda Rio Grande": 75634, "Caxias do Sul": 0, "Piraquara": 76394,
  "Marechal Cândido Rondon": 37212, "Castro": 38457, "Pato Branco": 66248,
  "Quedas do Iguaçu": 28344, "Telêmaco Borba": 52234, "Rolândia": 50219,
  "Arapongas": 86143, "Cianorte": 53876, "Campo Mourão": 75198,
  "Medianeira": 37654, "Loanda": 20345, "Ibiporã": 38445,
  "Guaíra": 23456, "Fênix": 5234, "Wenceslau Braz": 17654,
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Sugere meta de votos = 0,5% do eleitorado (referência conservadora para 1 cadeira dep. estadual PR)
    const suggestions = Object.entries(PR_MUNICIPIOS_ELEITORADO)
      .filter(([, eleitores]) => eleitores > 0)
      .map(([city, eleitores]) => ({
        city,
        eleitores,
        metaSugerida: Math.max(10, Math.round(eleitores * 0.005)),
        // Meta de líderes: 1 líder por 500 eleitores, mínimo 1
        metaLideres: Math.max(1, Math.round(eleitores / 500)),
      }))
      .sort((a, b) => b.eleitores - a.eleitores);

    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("[tse/municipios-pr]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
