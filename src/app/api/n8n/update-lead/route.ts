import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";
import { logContact } from "@/lib/contact-log";

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
 *   {
 *     phone?: string,
 *     collaboratorId?: string,
 *     action: "CONTACTED" | "CONVERT" | "OPT_OUT",
 *     campaignId?: string   (padrão "andre-santos-2026")
 *   }
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

  let body: { phone?: string; collaboratorId?: string; action?: string; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { phone, collaboratorId, action, campaignId = "andre-santos-2026" } = body;

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

  // Resolve o banco correto para a campanha (multi-tenant)
  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  // Localizar o colaborador
  let collaborator: { id: string; name: string; status: string } | null = null;

  if (collaboratorId) {
    collaborator = await db.collaborator.findUnique({
      where: { id: collaboratorId },
      select: { id: true, name: true, status: true },
    });
  } else if (phone) {
    // Z-API às vezes manda número sem o 9 do celular (12 dígitos: 55+DDD+8 dígitos),
    // enquanto o banco pode ter salvo com 9 (13 dígitos: 55+DDD+9 dígitos).
    // Tenta primeiro pelo suffix de 9 dígitos; se falhar, cai para 8 dígitos.
    const digits = phone.replace(/\D/g, "");
    const sufix9 = digits.slice(-9);
    const sufix8 = digits.slice(-8);

    collaborator = await db.collaborator.findFirst({
      where: { campaignId, phone: { contains: sufix9 } },
      select: { id: true, name: true, status: true },
    });
    if (!collaborator && sufix8.length === 8) {
      collaborator = await db.collaborator.findFirst({
        where: { campaignId, phone: { contains: sufix8 } },
        select: { id: true, name: true, status: true },
      });
    }
  }

  if (!collaborator) {
    // Diagnóstico para WF do n8n: indica o que foi buscado e onde
    const searched = collaboratorId
      ? { by: "collaboratorId", value: collaboratorId }
      : { by: "phoneSuffix9", value: phone?.replace(/\D/g, "").slice(-9) ?? null, rawPhone: phone };
    console.warn("[update-lead] 404", { campaignId, action, searched });
    return NextResponse.json(
      { error: "Lead não encontrado", searched, campaignId, action },
      { status: 404 },
    );
  }

  const now = new Date();

  if (action === "CONTACTED") {
    await db.collaborator.update({
      where: { id: collaborator.id },
      data: { lastContactedAt: now },
    });
    await logContact(db, {
      collaboratorId: collaborator.id,
      campaignId,
      kind: "SENT_INVITE",
      channel: "WHATSAPP",
      source: "n8n",
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
    await logContact(db, {
      collaboratorId: collaborator.id,
      campaignId,
      kind: "CONVERT",
      channel: "WHATSAPP",
      source: "n8n",
    });

    // Busca o referrer inline (evita roundtrip HTTP de auto-call)
    let referrer: { id: string; name: string; phone: string | null } | null = null;
    try {
      const leadWithRef = await db.collaborator.findUnique({
        where: { id: collaborator.id },
        select: { registeredById: true },
      });
      if (leadWithRef?.registeredById) {
        referrer = await db.collaborator.findFirst({
          where: { campaignId, userId: leadWithRef.registeredById },
          select: { id: true, name: true, phone: true },
        });
      }
    } catch (err) {
      console.warn("[update-lead] falha buscando referrer:", err);
    }

    return NextResponse.json({
      ok: true,
      action: "CONVERTED",
      id: collaborator.id,
      name: collaborator.name,
      referrer,
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
    await logContact(db, {
      collaboratorId: collaborator.id,
      campaignId,
      kind: "OPT_OUT",
      channel: "WHATSAPP",
      source: "n8n",
    });
    return NextResponse.json({
      ok: true,
      action: "OPT_OUT",
      id: collaborator.id,
      name: collaborator.name,
    });
  }

  // Fallback — nunca deve chegar aqui (action já foi validado acima)
  return NextResponse.json({ error: "action inválida" }, { status: 400 });
}
