import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { buildContractPdf, nextContractCode, type ContractPdfData } from "@/lib/contracts";
import { formatCnpj, formatEnderecoLinha1 } from "@/lib/cnpj";

const createSchema = z.object({
  templateType: z.enum(["PRESTACAO_SERVICOS_PJ", "PRESTACAO_SERVICOS_PF", "MILITANCIA", "TERMO_DOACAO", "TERMO_CESSAO"]),
  counterpartyName: z.string().min(1),
  counterpartyDocument: z.string().min(1),
  counterpartyAddress: z.string().optional(),
  counterpartyCity: z.string().optional(),
  counterpartyUf: z.string().optional(),
  counterpartyPhone: z.string().optional(),
  counterpartyEmail: z.string().optional(),
  representativeName: z.string().optional(),
  representativeCpf: z.string().optional(),
  representativeAddress: z.string().optional(),
  objectDescription: z.string().min(1),
  eventAddress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  totalValue: z.number().optional(),
  priceJustification: z.string().optional(),
  paymentTerms: z.string().optional(),
  signatureDate: z.string().optional(),
  forumCity: z.string().optional(),
  forumUf: z.string().optional(),
  supplierId: z.string().nullable().optional(),
  payingEntityId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get("templateType");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { campaignId: gate.cid };
    if (templateType) where.templateType = templateType;
    if (status) where.status = status;

    const contracts = await gate.db.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        payingEntity: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: contracts });
  } catch (err) {
    console.error("[api/financeiro/contratos GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar contratos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const body = parsed.data;

    const [settings, campaign, payingEntity] = await Promise.all([
      gate.db.settings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
        select: {
          cnpj: true, razaoSocial: true, cnpjLogradouro: true, cnpjNumero: true,
          cnpjComplemento: true, cnpjBairro: true, cnpjCep: true, cnpjMunicipio: true, cnpjUf: true,
        },
      }),
      gate.db.campaign.findUnique({ where: { id: gate.cid }, select: { candidateName: true, name: true, office: true } }),
      body.payingEntityId ? gate.db.payingEntity.findUnique({ where: { id: body.payingEntityId } }) : Promise.resolve(null),
    ]);

    const candidateName = payingEntity?.candidateName ?? payingEntity?.name ?? campaign?.candidateName ?? campaign?.name ?? "Candidato";
    const office = payingEntity?.office ?? campaign?.office ?? "";
    const contratanteNome = payingEntity?.razaoSocial ?? settings.razaoSocial ?? `ELEIÇÕES 2026 ${candidateName} ${office}`.trim();
    const rawContratanteCnpj = payingEntity?.cnpj ?? settings.cnpj;
    const contratanteCnpj = rawContratanteCnpj ? formatCnpj(rawContratanteCnpj) : "—";
    const contratanteEndereco = payingEntity
      ? formatEnderecoLinha1(payingEntity)
      : formatEnderecoLinha1({
          logradouro: settings.cnpjLogradouro, numero: settings.cnpjNumero,
          complemento: settings.cnpjComplemento, bairro: settings.cnpjBairro,
        });
    const contratanteCidade = payingEntity?.municipio ?? settings.cnpjMunicipio ?? null;
    const contratanteUf = payingEntity?.uf ?? settings.cnpjUf ?? null;

    let code = await nextContractCode(gate.db, gate.cid);

    const pdfData: ContractPdfData = {
      code,
      contratanteNome,
      contratanteCnpj,
      contratanteEndereco,
      contratanteCidade,
      contratanteUf,
      counterpartyName: body.counterpartyName,
      counterpartyDocument: body.counterpartyDocument,
      counterpartyAddress: body.counterpartyAddress ?? null,
      counterpartyCity: body.counterpartyCity ?? null,
      counterpartyUf: body.counterpartyUf ?? null,
      counterpartyPhone: body.counterpartyPhone ?? null,
      counterpartyEmail: body.counterpartyEmail ?? null,
      representativeName: body.representativeName ?? null,
      representativeCpf: body.representativeCpf ?? null,
      representativeAddress: body.representativeAddress ?? null,
      objectDescription: body.objectDescription,
      eventAddress: body.eventAddress ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      totalValue: body.totalValue ?? null,
      priceJustification: body.priceJustification ?? null,
      paymentTerms: body.paymentTerms ?? null,
      signatureDate: body.signatureDate ? new Date(body.signatureDate) : new Date(),
      forumCity: body.forumCity ?? contratanteCidade,
      forumUf: body.forumUf ?? contratanteUf,
    };

    const pdfBuffer = await buildContractPdf(body.templateType, pdfData);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Upload de PDF indisponível (BLOB_READ_WRITE_TOKEN ausente)" }, { status: 503 });
    }
    const safeName = body.counterpartyName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`contratos/${code}-${safeName}.pdf`, pdfBuffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: "application/pdf",
    });

    let contract;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        contract = await gate.db.contract.create({
          data: {
            campaignId: gate.cid,
            code,
            templateType: body.templateType,
            counterpartyName: body.counterpartyName,
            counterpartyDocument: body.counterpartyDocument,
            counterpartyAddress: body.counterpartyAddress,
            counterpartyCity: body.counterpartyCity,
            counterpartyUf: body.counterpartyUf,
            counterpartyPhone: body.counterpartyPhone,
            counterpartyEmail: body.counterpartyEmail,
            representativeName: body.representativeName,
            representativeCpf: body.representativeCpf,
            representativeAddress: body.representativeAddress,
            objectDescription: body.objectDescription,
            eventAddress: body.eventAddress,
            startDate: pdfData.startDate,
            endDate: pdfData.endDate,
            totalValue: body.totalValue,
            priceJustification: body.priceJustification,
            paymentTerms: body.paymentTerms,
            signatureDate: pdfData.signatureDate,
            forumCity: pdfData.forumCity,
            forumUf: pdfData.forumUf,
            supplierId: body.supplierId || null,
            payingEntityId: body.payingEntityId || null,
            pdfUrl: blob.url,
            notes: body.notes,
            createdById: gate.session.user.id,
          },
        });
        break;
      } catch (err: unknown) {
        const isUniqueConflict = typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
        if (isUniqueConflict && attempt < 2) {
          code = await nextContractCode(gate.db, gate.cid);
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error("[api/financeiro/contratos POST] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar contrato" }, { status: 500 });
  }
}
