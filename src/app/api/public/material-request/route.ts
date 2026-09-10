import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { createMaterialRequest } from "@/lib/material-request";

const ALLOWED_ORIGINS = new Set([
  "https://prandresantos.com.br",
  "https://www.prandresantos.com.br",
  "https://leads.prandresantos.com.br",
  "https://ovile.com.br",
  "https://www.ovile.com.br",
  "https://chiquini.ovile.com.br",
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
  email: z.string().email("Informe um e-mail válido"),
  cep: z.string().min(8).max(9),
  logradouro: z.string().min(2).max(200),
  numero: z.string().min(1).max(20),
  complemento: z.string().max(100).optional().or(z.literal("")),
  neighborhood: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  uf: z.string().length(2),
  items: z.array(itemSchema).max(20),
  termAccepted: z.literal(true),
  churchId: z.string().optional(),
}).refine((d) => d.churchId || d.items.length > 0, {
  message: "Selecione ao menos um material",
  path: ["items"],
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
    const { name, cpf, phone, email, cep, logradouro, numero, complemento, city, neighborhood, uf, items, churchId } = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited("material_request_public", ip, 5, 60)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 1 minuto." },
        { status: 429, headers: cors }
      );
    }

    const { db, cid: CID } = await resolvePublicTenant(req);

    const result = await createMaterialRequest(db, CID, {
      name, cpf, phone, email, cep, logradouro, numero, complemento, city, neighborhood, uf, items,
      churchId: churchId ?? null,
      termIp: ip,
      termUserAgent: req.headers.get("user-agent") ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: cors });
    }

    return NextResponse.json(
      { message: "Solicitação enviada! Aguarde a aprovação da equipe.", materialRequestId: result.materialRequestId, pdfUrl: result.pdfUrl },
      { status: 200, headers: cors }
    );
  } catch (err) {
    console.error("[api/public/material-request] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: cors });
  }
}
