import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

// Limite simples por IP em memória (reseta a cada reinício da função)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde 1 minuto." }, { status: 429 });
    }

    const body = await req.json();
    const { name, phone, city, neighborhood, email, howHelp } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: "WhatsApp é obrigatório" }, { status: 400 });

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }

    // Evita duplicidade por telefone
    const existing = await db.collaborator.findFirst({
      where: { campaignId: CID, phone: { contains: cleanPhone.slice(-8) } },
    });
    if (existing) {
      return NextResponse.json({ message: "Cadastro já realizado! Entraremos em contato." }, { status: 200 });
    }

    await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        city: city?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        campaignRole: "VOLUNTARIO",
        status: "LEAD",
        notes: howHelp ? `Como quer ajudar: ${howHelp}` : null,
        source: "CADASTRO_PUBLICO",
      },
    });

    return NextResponse.json({ message: "Cadastro realizado com sucesso!" }, { status: 201 });
  } catch (err) {
    console.error("[public/cadastro POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
