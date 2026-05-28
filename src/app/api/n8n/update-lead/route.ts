import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/update-lead
 *
 * Atualiza um lead disparado pelo n8n. Identifica pelo telefone (normalizado)
 * ou pelo id do colaborador.
 *
 * Body JSON:
 *   { phone?: string, collaboratorId?: string, action: "CONTACTED" | "CONVERT" | "OPT_OUT" }
 *
 * Ações:
 *   CONTACTED  → registra lastContactedAt = agora (mensagem enviada, aguardando resposta)
 *   CONVERT    → status LEAD → ACTIVE, supportStatus → CONFIRMADO, lastContactedAt = agora
 *   OPT_OUT    → status → INACTIVE, adiciona nota, lastContactedAt = agora
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone?: string; collaboratorId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { phone, collaboratorId, action } = body;

  if (!action || !["CONTACTED", "CONVERT", "OPT_OUT"].includes(action)) {
    return NextResponse.json(
      { error: "action deve ser CONTACTED, CONVERT ou OPT_OUT" },
      { status: 400 }
    );
  }

  if (!phone && !collaboratorId) {
    return NextResponse.json(
      { error: "Informe phone ou collaboratorId" },
      { status: 400 }
    );
  }

  // Localizar o colaborador
  let collaborator: { id: string; name: string; status: string } | null = null;

  if (collaboratorId) {
    collaborator = await db.collaborator.findUnique({
      where: { id: collaboratorId },
      select: { id: true, name: true, status: true },
    });
  } else if (phone) {
    // Normaliza para os últimos 9 dígitos (único o suficiente no BR)
    const digits = phone.replace(/\D/g, "");
    const suffix = digits.slice(-9);

    collaborator = await db.collaborator.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        phone: { contains: suffix },
      },
      select: { id: true, name: true, status: true },
    });
  }

  if (!collaborator) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const now = new Date();

  if (action === "CONTACTED") {
    await db.collaborator.update({
      where: { id: collaborator.id },
      data: { lastContactedAt: now },
    });
    return NextResponse.json({
      ok: true,
      action: "CONTACTED",
      id: collaborator.id,
      name: collaborator.name,
    });
  }

  if (action === "CONVERT") {
    await db.collaborator.update({
      where: { id: collaborator.id },
      data: {
        status: "ACTIVE",
        supportStatus: "CONFIRMADO",
        lastContactedAt: now,
      },
    });
    return NextResponse.json({
      ok: true,
      action: "CONVERTED",
      id: collaborator.id,
      name: collaborator.name,
    });
  }

  if (action === "OPT_OUT") {
    const currentNotes = await db.collaborator
      .findUnique({ where: { id: collaborator.id }, select: { notes: true } })
      .then((c) => c?.notes ?? "");

    await db.collaborator.update({
      where: { id: collaborator.id },
      data: {
        status: "INACTIVE",
        lastContactedAt: now,
        notes: currentNotes
          ? `${currentNotes}\n[n8n] Optou por não participar via WhatsApp`
          : "[n8n] Optou por não participar via WhatsApp",
      },
    });
    return NextResponse.json({
      ok: true,
      action: "OPT_OUT",
      id: collaborator.id,
      name: collaborator.name,
    });
  }
}
