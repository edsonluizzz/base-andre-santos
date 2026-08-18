import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { normalizeCpf, isValidCpf } from "@/lib/cpf";
import { MATERIAL_CATALOG_MAP } from "@/lib/material-catalog";
import { generateTermoApoiadorPdf, sendTermoApoiadorChannels } from "@/lib/material-request";
import { TERM_VERSION } from "@/lib/termo-apoiador";

const ALLOWED_ORIGINS = new Set([
  "https://prandresantos.com.br",
  "https://www.prandresantos.com.br",
  "https://leads.prandresantos.com.br",
  "https://ovile.com.br",
  "https://www.ovile.com.br",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

const itemSchema = z.object({
  item: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
});

const materialRequestSchema = z.object({
  name: z.string().min(2).max(255),
  cpf: z.string().min(11).max(14),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  city: z.string().max(100).optional().or(z.literal("")),
  neighborhood: z.string().max(100).optional().or(z.literal("")),
  items: z.array(itemSchema).min(1).max(20),
  termAccepted: z.literal(true),
});

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  try {
    const body = await req.json();
    const parsed = materialRequestSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400, headers: cors });
    }
    const { name, cpf, phone, email, city, neighborhood, items } = parsed.data;

    const cleanCpf = normalizeCpf(cpf);
    if (!isValidCpf(cleanCpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400, headers: cors });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400, headers: cors });
    }

    for (const i of items) {
      if (!MATERIAL_CATALOG_MAP[i.item]) {
        return NextResponse.json({ error: "Item de material inválido" }, { status: 400, headers: cors });
      }
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited("material_request_public", ip, 5, 60)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 1 minuto." },
        { status: 429, headers: cors }
      );
    }

    const { db, cid: CID } = await resolvePublicTenant(req);

    const pNorm = normalizePhone(cleanPhone);
    let collaboratorId: string;
    const existing = pNorm
      ? await db.collaborator.findFirst({ where: { campaignId: CID, phoneNormalized: pNorm }, select: { id: true } })
      : null;

    if (existing) {
      collaboratorId = existing.id;
      // Mantém CPF/email atualizados se a pessoa não tinha informado antes.
      await db.collaborator.update({
        where: { id: collaboratorId },
        data: {
          cpf: cleanCpf,
          email: email?.trim() || undefined,
          city: city?.trim() || undefined,
          neighborhood: neighborhood?.trim() || undefined,
        },
      }).catch(() => {});
    } else {
      const created = await db.collaborator.create({
        data: {
          campaignId: CID,
          name: name.trim(),
          cpf: cleanCpf,
          phone: cleanPhone,
          phoneNormalized: pNorm,
          email: email?.trim() || null,
          city: city?.trim() || null,
          neighborhood: neighborhood?.trim() || null,
          campaignRole: "VOLUNTARIO",
          status: "LEAD",
          source: "MATERIAL",
          lgpdConsent: true,
          lgpdConsentAt: new Date(),
        },
      });
      collaboratorId = created.id;
    }

    const materialRequest = await db.materialRequest.create({
      data: {
        campaignId: CID,
        collaboratorId,
        items,
        termSnapshotName: name.trim(),
        termSnapshotCpf: cleanCpf,
        termVersion: TERM_VERSION,
        termAcceptedAt: new Date(),
        termIp: ip,
        termUserAgent: req.headers.get("user-agent") ?? null,
      },
    });

    // PDF é síncrono (rápido, poucos segundos) — devolve pdfUrl já no response
    // pra permitir download imediato na tela de sucesso.
    const pdfUrl = await generateTermoApoiadorPdf(db, materialRequest.id, CID);

    // Envio por email/WhatsApp é fire-and-forget — não bloqueia o response.
    if (pdfUrl) sendTermoApoiadorChannels(db, materialRequest.id, CID, pdfUrl).catch(() => {});

    return NextResponse.json(
      { message: "Solicitação enviada! Aguarde a aprovação da equipe.", materialRequestId: materialRequest.id, pdfUrl },
      { status: 200, headers: cors }
    );
  } catch (err) {
    console.error("[api/public/material-request] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: cors });
  }
}
