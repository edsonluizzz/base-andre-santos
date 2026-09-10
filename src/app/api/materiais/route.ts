import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { parseMaterialFilters, buildMaterialWhere } from "@/lib/materiais-filters";
import { createMaterialRequest } from "@/lib/material-request";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const itemSchema = z.object({
  item: z.string().min(1),
  qty: z.number().int().min(1).max(9999),
});

const manualRequestSchema = z.object({
  name: z.string().min(2).max(255),
  cpf: z.string().min(11).max(14),
  phone: z.string().min(10).max(20),
  email: z.string().email("Informe um e-mail válido").or(z.literal("")),
  cep: z.string().min(8).max(9),
  logradouro: z.string().min(2).max(200),
  numero: z.string().min(1).max(20),
  complemento: z.string().max(100).optional().or(z.literal("")),
  neighborhood: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  uf: z.string().length(2),
  items: z.array(itemSchema).max(20),
  churchId: z.string().optional(),
  consentConfirmed: z.literal(true),
}).refine((d) => d.churchId || d.items.length > 0, {
  message: "Selecione ao menos um material",
  path: ["items"],
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const filters = parseMaterialFilters(req.url);
    const where = buildMaterialWhere(cid, filters);

    const [rows, cityRows] = await Promise.all([
      db.materialRequest.findMany({
        where,
        select: {
          id: true, items: true, status: true, pdfUrl: true,
          termSnapshotName: true, termSnapshotCpf: true, termAcceptedAt: true,
          emailStatus: true, whatsappStatus: true,
          deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
          deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
          churchName: true, memberCount: true,
          approvedAt: true, deliveredAt: true, notes: true, createdAt: true,
          collaborator: { select: { id: true, name: true, phone: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          deliveredBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      // Cidades distintas de todo o campanha (não só do filtro atual) — pra popular o dropdown de filtro.
      db.materialRequest.findMany({
        where: { campaignId: cid, deliveryMunicipio: { not: null } },
        select: { deliveryMunicipio: true },
        distinct: ["deliveryMunicipio"],
        orderBy: { deliveryMunicipio: "asc" },
      }),
    ]);

    const cities = cityRows.map((r) => r.deliveryMunicipio!).filter(Boolean);
    // Soma de membros no filtro atual — só faz sentido pra listagem de congregações,
    // mas calcular sempre é barato (já veio no select) e evita mais uma rota.
    const totalMembers = rows.reduce((sum, r) => sum + (r.memberCount ?? 0), 0);

    return NextResponse.json({ rows, cities, totalMembers });
  } catch (err) {
    console.error("[api/materiais] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * Cadastro manual de pedido de material pela equipe (ex.: pessoa pediu por
 * telefone/presencialmente) — mesmo núcleo de criação da rota pública, mas
 * autenticado e sem o clickwrap do apoiador (a equipe confirma o consentimento).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role ?? "MEMBER";
    if ((ROLE_RANK[role] ?? 0) < ROLE_RANK.LEADER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { db, cid } = getCampaignContext(session);

    const body = await req.json();
    const parsed = manualRequestSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { name, cpf, phone, email, cep, logradouro, numero, complemento, city, neighborhood, uf, items, churchId } = parsed.data;

    const result = await createMaterialRequest(db, cid, {
      name, cpf, phone, email, cep, logradouro, numero, complemento, city, neighborhood, uf, items,
      churchId: churchId ?? null,
      termIp: null,
      termUserAgent: `manual-admin:${session.user.email ?? session.user.id}`,
      registeredById: session.user.id,
      source: "MATERIAL_MANUAL",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ materialRequestId: result.materialRequestId, pdfUrl: result.pdfUrl });
  } catch (err) {
    console.error("[api/materiais] POST erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
