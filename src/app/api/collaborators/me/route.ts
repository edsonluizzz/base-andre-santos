import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizeCpf, isValidCpf } from "@/lib/cpf";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { db } = getCampaignContext(session);

    const collaborator = await db.collaborator.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true, name: true, phone: true, cpf: true,
        city: true, neighborhood: true, campaignRole: true, photoUrl: true,
      },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: collaborator });
  } catch (err) {
    console.error("[api/collaborators/me GET] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 });
  }
}

const bodySchema = z.object({ cpf: z.string().min(1) });

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const cpf = normalizeCpf(parsed.data.cpf);
    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const { db } = getCampaignContext(session);
    const collaborator = await db.collaborator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
    }

    await db.collaborator.update({ where: { id: collaborator.id }, data: { cpf } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/collaborators/me PUT] erro:", err);
    return NextResponse.json({ error: "Erro ao salvar CPF" }, { status: 500 });
  }
}
