import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import {
  ROLE_LABEL, STATUS_LABEL, SUPPORT_LABEL, PROFILE_LABEL,
  CONTRIB_LABEL, ROLE_ORDER, PROFILE_ORDER, SUPPORT_ORDER,
} from "@/lib/labels";

const CID = "andre-santos-2026";

function coverageScore(roles: Record<string, number>): "Alta" | "Média" | "Baixa" {
  if (roles.COORD_GERAL > 0 || roles.COORD_REGIONAL > 0 || roles.LIDER_MUNICIPAL > 0) return "Alta";
  if (roles.LIDER_BAIRRO > 0) return "Média";
  return "Baixa";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const all = await db.collaborator.findMany({
      where: { campaignId: CID },
      select: {
        name: true, city: true, neighborhood: true, phone: true, email: true,
        campaignRole: true, status: true, supportStatus: true, profile: true,
        contributionTypes: true, createdAt: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString("pt-BR");

    // ── Aba 1: Resumo ────────────────────────────────────────────
    const active    = all.filter((c) => c.status === "ACTIVE").length;
    const leads     = all.filter((c) => c.status === "LEAD").length;
    const inactive  = all.filter((c) => c.status === "INACTIVE").length;
    const confirm   = all.filter((c) => c.supportStatus === "CONFIRMADO" && c.status === "ACTIVE").length;
    const cityCount = new Set(all.map((c) => c.city).filter(Boolean)).size;

    const resumoData: (string | number)[][] = [
      [`Relatório — Base André Santos 2026`],
      [`Gerado em: ${today}`],
      [],
      ["VISÃO GERAL", ""],
      ["Municípios com presença", cityCount],
      ["Total de pessoas",        all.length],
      ["Ativas",                  active],
      ["Leads",                   leads],
      ["Inativas",                inactive],
      ["Confirmadas (apoio)",     confirm],
      [],
      ["POR CARGO (ativos)", "Qtd"],
      ...ROLE_ORDER.map((r) => [
        ROLE_LABEL[r],
        all.filter((c) => c.status === "ACTIVE" && c.campaignRole === r).length,
      ]),
      [],
      ["POR PERFIL (total)", "Qtd"],
      ...PROFILE_ORDER
        .map((p) => [PROFILE_LABEL[p], all.filter((c) => c.profile === p).length] as (string | number)[])
        .filter(([, n]) => (n as number) > 0),
      [],
      ["STATUS DE APOIO (ativos)", "Qtd"],
      ...SUPPORT_ORDER.map((s) => [
        SUPPORT_LABEL[s],
        all.filter((c) => c.supportStatus === s && c.status === "ACTIVE").length,
      ]),
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo["!cols"] = [{ wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // ── Aba 2: Cobertura por Município ───────────────────────────
    type CityRow = { roles: Record<string, number>; active: number; leads: number; confirmados: number; total: number };
    const cityMap: Record<string, CityRow> = {};
    for (const c of all.filter((c) => c.city)) {
      const key = c.city!;
      if (!cityMap[key]) cityMap[key] = { roles: {}, active: 0, leads: 0, confirmados: 0, total: 0 };
      const m = cityMap[key];
      m.total++;
      m.roles[c.campaignRole] = (m.roles[c.campaignRole] ?? 0) + 1;
      if (c.status === "ACTIVE") m.active++;
      if (c.status === "LEAD")   m.leads++;
      if (c.supportStatus === "CONFIRMADO" && c.status === "ACTIVE") m.confirmados++;
    }
    const cityEntries = Object.entries(cityMap).sort((a, b) => b[1].active - a[1].active);

    const covHeaders = ["Município", "Cobertura", "C. Geral", "C. Regional", "L. Municipal", "L. Bairro", "Voluntários", "Ativos", "Leads", "Confirmados", "Total"];
    const covRows = cityEntries.map(([city, m]) => [
      city, coverageScore(m.roles),
      m.roles["COORD_GERAL"]     ?? 0,
      m.roles["COORD_REGIONAL"]  ?? 0,
      m.roles["LIDER_MUNICIPAL"] ?? 0,
      m.roles["LIDER_BAIRRO"]    ?? 0,
      m.roles["VOLUNTARIO"]      ?? 0,
      m.active, m.leads, m.confirmados, m.total,
    ]);
    const covTotals = [
      "TOTAL", "",
      ...ROLE_ORDER.map((r) => cityEntries.reduce((s, [, m]) => s + (m.roles[r] ?? 0), 0)),
      cityEntries.reduce((s, [, m]) => s + m.active, 0),
      cityEntries.reduce((s, [, m]) => s + m.leads, 0),
      cityEntries.reduce((s, [, m]) => s + m.confirmados, 0),
      cityEntries.reduce((s, [, m]) => s + m.total, 0),
    ];

    const wsCov = XLSX.utils.aoa_to_sheet([covHeaders, ...covRows, covTotals]);
    wsCov["!cols"] = [{ wch: 22 }, { wch: 10 }, ...Array(9).fill({ wch: 10 })];
    XLSX.utils.book_append_sheet(wb, wsCov, "Cobertura");

    // ── Aba 3: Lista Completa ────────────────────────────────────
    const listHeaders = [
      "Nome", "Município", "Bairro", "Telefone", "E-mail",
      "Cargo", "Status", "Apoio", "Perfil", "Formas de Contribuição", "Cadastrado em",
    ];
    const listRows = all.map((c) => [
      c.name,
      c.city          ?? "",
      c.neighborhood  ?? "",
      c.phone         ?? "",
      c.email         ?? "",
      ROLE_LABEL[c.campaignRole]     ?? c.campaignRole,
      STATUS_LABEL[c.status]         ?? c.status,
      SUPPORT_LABEL[c.supportStatus] ?? c.supportStatus,
      PROFILE_LABEL[c.profile]       ?? c.profile,
      c.contributionTypes.map((t) => CONTRIB_LABEL[t] ?? t).join("; "),
      new Date(c.createdAt).toLocaleDateString("pt-BR"),
    ]);

    const wsList = XLSX.utils.aoa_to_sheet([listHeaders, ...listRows]);
    wsList["!cols"] = [
      { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 26 },
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 32 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsList, "Colaboradores");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().split("T")[0];

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio-andre-santos-${date}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[relatorio/export-xlsx]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
