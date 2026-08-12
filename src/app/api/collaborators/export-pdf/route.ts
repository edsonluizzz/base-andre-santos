import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { CollaboratorRole, CollaboratorStatus } from "@prisma/client";
import { buildSimpleTablePdf } from "@/lib/pdf-table";

export const maxDuration = 60;

const IMPORT_SOURCES = ["IMPORTACAO_CSV", "IMPORTACAO_XLSX"];
const PDF_ROW_LIMIT = 3000; // tabela em PDF fica ilegível/lenta acima disso — usar XLSX pra base completa

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL: "Coord. Geral", COORD_REGIONAL: "Coord. Regional", LIDER_MUNICIPAL: "Líder Municipal",
  LIDER_BAIRRO: "Líder de Bairro", VOLUNTARIO: "Voluntário",
};
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Ativo", LEAD: "Lead", INACTIVE: "Inativo" };

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid } = getCampaignContext(session);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("q") ?? "";
    const role = searchParams.get("role") ?? "";
    const city = searchParams.get("city") ?? "";
    const status = searchParams.get("status") ?? "ACTIVE";
    const mine = searchParams.get("mine") === "true";
    const registeredBy = searchParams.get("registeredBy") ?? "";
    const sourceType = searchParams.get("sourceType") ?? "";
    const sourceText = searchParams.get("source") ?? "";
    const profile = searchParams.get("profile") ?? "";
    const channel = searchParams.get("channel") ?? "";
    const supportStatus = searchParams.get("supportStatus") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";

    let sourceCondition: Record<string, unknown> | undefined;
    if (sourceType === "IMPORTADO") sourceCondition = { source: { in: IMPORT_SOURCES } };
    else if (sourceType === "MANUAL") sourceCondition = { registeredById: { not: null }, source: { notIn: IMPORT_SOURCES } };
    else if (sourceType === "PUBLICO") sourceCondition = { registeredById: null, source: { notIn: IMPORT_SOURCES } };
    else if (sourceText) sourceCondition = { source: { contains: sourceText, mode: "insensitive" as const } };

    const where = {
      campaignId: cid,
      ...(status && status !== "ALL" && { status: status as CollaboratorStatus }),
      ...(role && { campaignRole: role as CollaboratorRole }),
      ...(city && { city }),
      ...(mine && { registeredById: session.user.id }),
      ...(registeredBy && { registeredById: registeredBy }),
      ...(profile && { profile: profile as never }),
      ...(channel && { channel: channel as never }),
      ...(supportStatus && { supportStatus: supportStatus as never }),
      ...sourceCondition,
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { source: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const total = await db.collaborator.count({ where });
    const collaborators = await db.collaborator.findMany({
      where,
      select: { name: true, phone: true, email: true, city: true, campaignRole: true, status: true, registeredBy: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: PDF_ROW_LIMIT,
    });

    const rows = collaborators.map((c) => [
      c.name,
      c.phone ?? "",
      c.email ?? "",
      c.city ?? "",
      ROLE_LABEL[c.campaignRole] ?? c.campaignRole,
      STATUS_LABEL[c.status] ?? c.status,
      c.registeredBy?.name ?? "",
    ]);

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Colaboradores",
      subtitle: total > PDF_ROW_LIMIT
        ? `${total} colaboradores no filtro — mostrando os ${PDF_ROW_LIMIT} primeiros (ver export XLSX para a lista completa)`
        : `${total} colaborador(es)`,
      columns: [
        { header: "Nome", width: 130 },
        { header: "Telefone", width: 90 },
        { header: "Email", width: 130 },
        { header: "Cidade", width: 90 },
        { header: "Cargo", width: 90 },
        { header: "Status", width: 60 },
        { header: "Cadastrado por", width: 100 },
      ],
      rows,
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="colaboradores-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[collaborators/export-pdf GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
