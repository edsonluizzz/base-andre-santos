import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { buildContractPdf, type ContractPdfData } from "@/lib/contracts";

const CONTENT_FIELDS = [
  "counterpartyName", "counterpartyDocument", "counterpartyAddress", "counterpartyCity", "counterpartyUf",
  "counterpartyPhone", "counterpartyEmail", "representativeName", "representativeCpf", "representativeAddress",
  "objectDescription", "eventAddress", "startDate", "endDate", "totalValue", "priceJustification",
  "paymentTerms", "signatureDate", "forumCity", "forumUf",
] as const;

const updateSchema = z.object({
  counterpartyName: z.string().min(1).optional(),
  counterpartyDocument: z.string().min(1).optional(),
  counterpartyAddress: z.string().nullable().optional(),
  counterpartyCity: z.string().nullable().optional(),
  counterpartyUf: z.string().nullable().optional(),
  counterpartyPhone: z.string().nullable().optional(),
  counterpartyEmail: z.string().nullable().optional(),
  representativeName: z.string().nullable().optional(),
  representativeCpf: z.string().nullable().optional(),
  representativeAddress: z.string().nullable().optional(),
  objectDescription: z.string().min(1).optional(),
  eventAddress: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  totalValue: z.number().nullable().optional(),
  priceJustification: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  signatureDate: z.string().optional(),
  forumCity: z.string().nullable().optional(),
  forumUf: z.string().nullable().optional(),
  status: z.enum(["GERADO", "ASSINADO", "CANCELADO"]).optional(),
  supplierId: z.string().nullable().optional(),
  payingEntityId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const contract = await gate.db.contract.findFirst({
      where: { id: params.id, campaignId: gate.cid },
      include: {
        supplier: { select: { id: true, name: true } },
        payingEntity: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        financialEntries: { select: { id: true, amount: true, status: true, date: true, description: true } },
      },
    });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    return NextResponse.json(contract);
  } catch (err) {
    console.error("[api/financeiro/contratos/:id GET] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar contrato" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const existing = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!existing) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    await gate.db.contract.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/financeiro/contratos/:id DELETE] erro:", err);
    return NextResponse.json({ error: "Erro ao excluir contrato" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!existing) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const contentChanged = CONTENT_FIELDS.some((f) => f in body);

    const merged = {
      ...existing,
      ...body,
      startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : existing.startDate,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate,
      signatureDate: body.signatureDate !== undefined ? new Date(body.signatureDate) : existing.signatureDate,
    };

    let pdfUrl = existing.pdfUrl;
    if (contentChanged) {
      const pdfData: ContractPdfData = {
        code: existing.code,
        contratanteNome: "", // preenchido abaixo
        contratanteCnpj: "",
        contratanteEndereco: null,
        contratanteCidade: null,
        contratanteUf: null,
        counterpartyName: merged.counterpartyName,
        counterpartyDocument: merged.counterpartyDocument,
        counterpartyAddress: merged.counterpartyAddress,
        counterpartyCity: merged.counterpartyCity,
        counterpartyUf: merged.counterpartyUf,
        counterpartyPhone: merged.counterpartyPhone,
        counterpartyEmail: merged.counterpartyEmail,
        representativeName: merged.representativeName,
        representativeCpf: merged.representativeCpf,
        representativeAddress: merged.representativeAddress,
        objectDescription: merged.objectDescription,
        eventAddress: merged.eventAddress,
        startDate: merged.startDate,
        endDate: merged.endDate,
        totalValue: merged.totalValue,
        priceJustification: merged.priceJustification,
        paymentTerms: merged.paymentTerms,
        signatureDate: merged.signatureDate,
        forumCity: merged.forumCity,
        forumUf: merged.forumUf,
      };

      // Reconstitui o bloco Contratante (não é editável pelo formulário — vem sempre do comitê/fonte pagadora).
      const [settings, campaign, payingEntity] = await Promise.all([
        gate.db.settings.findUnique({
          where: { id: "singleton" },
          select: {
            cnpj: true, razaoSocial: true, cnpjLogradouro: true, cnpjNumero: true,
            cnpjComplemento: true, cnpjBairro: true, cnpjCep: true, cnpjMunicipio: true, cnpjUf: true,
          },
        }),
        gate.db.campaign.findUnique({ where: { id: gate.cid }, select: { candidateName: true, name: true, office: true } }),
        merged.payingEntityId ? gate.db.payingEntity.findUnique({ where: { id: merged.payingEntityId } }) : Promise.resolve(null),
      ]);
      const { formatCnpj, formatEnderecoLinha1 } = await import("@/lib/cnpj");
      const candidateName = payingEntity?.candidateName ?? payingEntity?.name ?? campaign?.candidateName ?? campaign?.name ?? "Candidato";
      const office = payingEntity?.office ?? campaign?.office ?? "";
      pdfData.contratanteNome = payingEntity?.razaoSocial ?? settings?.razaoSocial ?? `ELEIÇÕES 2026 ${candidateName} ${office}`.trim();
      const rawContratanteCnpj = payingEntity?.cnpj ?? settings?.cnpj;
      pdfData.contratanteCnpj = rawContratanteCnpj ? formatCnpj(rawContratanteCnpj) : "—";
      pdfData.contratanteEndereco = payingEntity
        ? formatEnderecoLinha1(payingEntity)
        : formatEnderecoLinha1({
            logradouro: settings?.cnpjLogradouro, numero: settings?.cnpjNumero,
            complemento: settings?.cnpjComplemento, bairro: settings?.cnpjBairro,
          });
      pdfData.contratanteCidade = payingEntity?.municipio ?? settings?.cnpjMunicipio ?? null;
      pdfData.contratanteUf = payingEntity?.uf ?? settings?.cnpjUf ?? null;

      const pdfBuffer = await buildContractPdf(existing.templateType, pdfData);
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: "Upload de PDF indisponível (BLOB_READ_WRITE_TOKEN ausente)" }, { status: 503 });
      }
      const safeName = merged.counterpartyName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`contratos/${existing.code}-${safeName}.pdf`, pdfBuffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
        contentType: "application/pdf",
      });
      pdfUrl = blob.url;
    }

    const { status, supplierId, payingEntityId, notes, ...contentFields } = body;
    const contract = await gate.db.contract.update({
      where: { id: params.id },
      data: {
        ...contentFields,
        startDate: merged.startDate,
        endDate: merged.endDate,
        signatureDate: merged.signatureDate,
        status,
        supplierId,
        payingEntityId,
        notes,
        pdfUrl,
      },
    });
    return NextResponse.json(contract);
  } catch (err) {
    console.error("[api/financeiro/contratos/:id PATCH] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar contrato" }, { status: 500 });
  }
}
