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

    // ── Aba 4: Análise Política ──────────────────────────────────
    const activeAll  = all.filter((c) => c.status === "ACTIVE");
    const leadsAll   = all.filter((c) => c.status === "LEAD");
    const confirmAll = activeAll.filter((c) => c.supportStatus === "CONFIRMADO");
    const pctAct     = all.length > 0 ? ((activeAll.length / all.length) * 100).toFixed(1) : "0";
    const pctConf    = activeAll.length > 0 ? ((confirmAll.length / activeAll.length) * 100).toFixed(1) : "0";

    const now2  = new Date();
    const d30b  = new Date(now2.getTime() - 30 * 86400000);
    const d60b  = new Date(now2.getTime() - 60 * 86400000);
    const new30b  = all.filter((c) => new Date(c.createdAt) >= d30b).length;
    const prev30b = all.filter((c) => new Date(c.createdAt) >= d60b && new Date(c.createdAt) < d30b).length;

    const KEY_PROFILES_XLSX = ["PASTOR", "VEREADOR", "LIDER_POLITICO", "EMPRESARIO", "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA"];
    const crossRows = KEY_PROFILES_XLSX.map((p) => {
      const grp = activeAll.filter((c) => c.profile === p);
      return [
        PROFILE_LABEL[p] ?? p,
        grp.filter((c) => c.supportStatus === "CONFIRMADO").length,
        grp.filter((c) => c.supportStatus === "NEGOCIANDO").length,
        grp.filter((c) => c.supportStatus === "NEUTRO").length,
        grp.filter((c) => c.supportStatus === "ADVERSARIO").length,
        grp.length,
      ];
    }).filter((r) => (r[5] as number) > 0);

    const orphans = cityEntries
      .filter(([, m]) => coverageScore(m.roles) === "Baixa" && m.active > 0)
      .map(([city, m]) => [city, m.active, m.leads, m.total]);

    const top10conf = [...cityEntries]
      .filter(([, m]) => m.confirmados > 0)
      .sort((a, b) => b[1].confirmados - a[1].confirmados)
      .slice(0, 10)
      .map(([city, m]) => [city, m.confirmados, m.active, `${m.active > 0 ? Math.round((m.confirmados / m.active) * 100) : 0}%`]);

    const analiseData: (string | number)[][] = [
      [`Análise Política — Base André Santos 2026`],
      [`Gerado em: ${today}`],
      [],
      ["FUNIL DE CONVERSÃO", "", ""],
      ["Etapa", "Quantidade", "Taxa"],
      ["Total cadastrado",         all.length,          "100%"],
      ["Ativos",                   activeAll.length,    `${pctAct}%`],
      ["Confirmados (apoio ativo)", confirmAll.length,  `${pctConf}% dos ativos`],
      ["Leads não convertidos",    leadsAll.length,     "—"],
      [],
      ["CRESCIMENTO", "", ""],
      ["Últimos 30 dias",          new30b,  "—"],
      ["30 dias anteriores",       prev30b, "—"],
      ["Variação",                 new30b - prev30b, new30b >= prev30b ? "↑ crescendo" : "↓ queda"],
      [],
      ["CAPITAL POLÍTICO POR PERFIL (ativos)", "", "", "", "", ""],
      ["Perfil", "Confirmado", "Negociando", "Neutro", "Adversário", "Total"],
      ...crossRows,
      [],
      ["MUNICÍPIOS SEM LIDERANÇA (com ativos)", "", "", ""],
      ["Município", "Ativos", "Leads", "Total"],
      ...orphans,
      [],
      ["TOP 10 MUNICÍPIOS POR CONFIRMADOS", "", "", ""],
      ["Município", "Confirmados", "Ativos", "% Confirmados"],
      ...top10conf,
    ];

    const wsAnalise = XLSX.utils.aoa_to_sheet(analiseData);
    wsAnalise["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsAnalise, "Análise Política");

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
