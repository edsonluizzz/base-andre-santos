import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllMunicipiosPR } from "@/lib/tse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(getAllMunicipiosPR());
  } catch (err) {
    console.error("[tse/municipios-pr]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
