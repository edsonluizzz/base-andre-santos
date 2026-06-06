import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { CollaboratorRole, CollaboratorStatus } from "@prisma/client";
import ExcelJS from "exceljs";

// Export da base inteira pode levar segundos — evita corte do Vercel.
export const maxDuration = 60;

const IMPORT_SOURCES = ["IMPORTACAO_CSV", "IMPORTACAO_XLSX"];

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL: "Coord. Geral",
  COORD_REGIONAL: "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal",
  LIDER_BAIRRO: "Líder de Bairro",
  VOLUNTARIO: "Voluntário",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  LEAD: "Lead",
  INACTIVE: "Inativo",
};
const SUPPORT_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  NEGOCIANDO: "Negociando",
  NEUTRO: "Neutro",
  ADVERSARIO: "Adversário",
};
const PROFILE_LABEL: Record<string, string> = {
  PASTOR: "Pastor",
  PRESIDENTE_ASSOCIACAO: "Pres. Associação",
  LIDER_POLITICO: "Líder Político",
  VEREADOR: "Vereador",
  EMPRESARIO: "Empresário",
  LIDERANCA_COMUNITARIA: "Liderança Comunitária",
  LIDER_RELIGIOSO: "Líder Religioso",
  EDUCADOR: "Educador",
  FAMILIA: "Família",
  JOVEM: "Jovem",
  APOIADOR: "Apoiador",
};
const CHANNEL_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  EVENTO: "Evento",
  LINK: "Link",
  OUTRO: "Outro",
};

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

    // Build source condition
    let sourceCondition: Record<string, unknown> | undefined;
    if (sourceType === "IMPORTADO") {
      sourceCondition = { source: { in: IMPORT_SOURCES } };
    } else if (sourceType === "MANUAL") {
      sourceCondition = { registeredById: { not: null }, source: { notIn: IMPORT_SOURCES } };
    } else if (sourceType === "PUBLICO") {
      sourceCondition = { registeredById: null, source: { notIn: IMPORT_SOURCES } };
    } else if (sourceText) {
      sourceCondition = { source: { contains: sourceText, mode: "insensitive" as const } };
    }

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

    const collaborators = await db.collaborator.findMany({
      where,
      select: {
        name: true,
        email: true,
        phone: true,
        city: true,
        neighborhood: true,
        campaignRole: true,
        status: true,
        profile: true,
        supportStatus: true,
        source: true,
        channel: true,
        mobilizationScore: true,
        registeredBy: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { name: "asc" },
      take: 10000,
    });

    // Build XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Colaboradores", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Nome", key: "name", width: 30 },
      { header: "Telefone", key: "phone", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Cidade", key: "city", width: 20 },
      { header: "Bairro", key: "neighborhood", width: 20 },
      { header: "Cargo", key: "campaignRole", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Perfil", key: "profile", width: 22 },
      { header: "Apoio", key: "supportStatus", width: 15 },
      { header: "Origem", key: "source", width: 25 },
      { header: "Canal", key: "channel", width: 15 },
      { header: "Score", key: "mobilizationScore", width: 10 },
      { header: "Cadastrado por", key: "registeredBy", width: 25 },
      { header: "Data cadastro", key: "createdAt", width: 18 },
    ];

    // Header style
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF2563EB" } },
      };
    });
    sheet.getRow(1).height = 22;

    collaborators.forEach((c, i) => {
      const row = sheet.addRow({
        name: c.name,
        phone: c.phone ?? "",
        email: c.email ?? "",
        city: c.city ?? "",
        neighborhood: c.neighborhood ?? "",
        campaignRole: ROLE_LABEL[c.campaignRole] ?? c.campaignRole,
        status: STATUS_LABEL[c.status] ?? c.status,
        profile: PROFILE_LABEL[c.profile] ?? c.profile,
        supportStatus: SUPPORT_LABEL[c.supportStatus ?? ""] ?? c.supportStatus ?? "",
        source: c.source ?? "",
        channel: CHANNEL_LABEL[c.channel ?? ""] ?? c.channel ?? "",
        mobilizationScore: c.mobilizationScore != null ? Math.round(c.mobilizationScore) : "",
        registeredBy: c.registeredBy?.name ?? "",
        createdAt: c.createdAt.toLocaleDateString("pt-BR"),
      });

      // Zebra striping
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
        });
      }
    });

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(buffer as Buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="colaboradores-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[collaborators/export GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
