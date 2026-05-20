import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import ExcelJS from "exceljs";
import {
  ROLE_LABEL, STATUS_LABEL, SUPPORT_LABEL, PROFILE_LABEL,
  CONTRIB_LABEL, ROLE_ORDER, PROFILE_ORDER, SUPPORT_ORDER,
} from "@/lib/labels";


// ─── Paleta ────────────────────────────────────────────────────────────────
const C = {
  gold:       "FFD4AF37",
  goldDark:   "FF1A160B",
  slate900:   "FF0F172A",
  white:      "FFFFFFFF",
  green:      "FF22C55E",
  greenBg:    "FF052E16",
  amber:      "FFF59E0B",
  amberBg:    "FF451A03",
  red:        "FFEF4444",
  redBg:      "FF450A0A",
  slate:      "FF94A3B8",
  slateBg:    "FF0F172A",
  rowAlt:     "FF111827",
  rowNormal:  "FF0D1117",
  border:     "FF1E293B",
};

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function border(): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style: "thin", color: { argb: C.border } };
  return { top: s, bottom: s, left: s, right: s };
}

// ─── Status colors ─────────────────────────────────────────────────────────
const STATUS_FILL: Record<string, [string, string]> = {
  ACTIVE:   [C.green, C.greenBg],
  LEAD:     [C.amber, C.amberBg],
  INACTIVE: [C.red,   C.redBg],
};
const SUPPORT_FILL: Record<string, [string, string]> = {
  CONFIRMADO: [C.green, C.greenBg],
  NEGOCIANDO: [C.amber, C.amberBg],
  NEUTRO:     [C.slate, C.slateBg],
  ADVERSARIO: [C.red,   C.redBg],
};
const COVERAGE_FILL: Record<string, [string, string]> = {
  Alta:  [C.green, C.greenBg],
  Média: [C.amber, C.amberBg],
  Baixa: [C.red,   C.redBg],
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = fill(C.gold);
    cell.font = { bold: true, color: { argb: C.slate900 }, size: 10 };
    cell.border = border();
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  row.height = 20;
}

function styleTitle(row: ExcelJS.Row, text: string, ws: ExcelJS.Worksheet, lastCol: number) {
  row.getCell(1).value = text;
  row.getCell(1).fill = fill(C.goldDark);
  row.getCell(1).font = { bold: true, color: { argb: C.gold }, size: 10 };
  row.getCell(1).border = border();
  row.height = 18;
  ws.mergeCells(row.number, 1, row.number, lastCol);
}

function styleData(row: ExcelJS.Row, alt: boolean) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill   = fill(alt ? C.rowAlt : C.rowNormal);
    cell.font   = { color: { argb: C.white }, size: 10 };
    cell.border = border();
    cell.alignment = { vertical: "middle" };
  });
  row.height = 18;
}

function coverageScore(roles: Record<string, number>): "Alta" | "Média" | "Baixa" {
  if (roles.COORD_GERAL > 0 || roles.COORD_REGIONAL > 0 || roles.LIDER_MUNICIPAL > 0) return "Alta";
  if (roles.LIDER_BAIRRO > 0) return "Média";
  return "Baixa";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const all = await db.collaborator.findMany({
      where: { campaignId: CID },
      select: {
        name: true, city: true, neighborhood: true, phone: true, email: true,
        campaignRole: true, status: true, supportStatus: true, profile: true,
        contributionTypes: true, createdAt: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator  = "Base André Santos";
    wb.created  = new Date();
    const today = new Date().toLocaleDateString("pt-BR");

    // ── Aba 1: Resumo ────────────────────────────────────────────
    const active   = all.filter((c) => c.status === "ACTIVE").length;
    const leads    = all.filter((c) => c.status === "LEAD").length;
    const inactive = all.filter((c) => c.status === "INACTIVE").length;
    const confirm  = all.filter((c) => c.supportStatus === "CONFIRMADO" && c.status === "ACTIVE").length;
    const cityCount = new Set(all.map((c) => c.city).filter(Boolean)).size;

    const wsR = wb.addWorksheet("Resumo", { properties: { tabColor: { argb: C.gold } } });
    wsR.columns = [{ width: 30 }, { width: 14 }];

    // Título principal
    const rTitulo = wsR.addRow([`Relatório — Base André Santos 2026`]);
    wsR.mergeCells(rTitulo.number, 1, rTitulo.number, 2);
    rTitulo.getCell(1).fill = fill(C.gold);
    rTitulo.getCell(1).font = { bold: true, size: 13, color: { argb: C.slate900 } };
    rTitulo.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    rTitulo.height = 28;

    const rDate = wsR.addRow([`Gerado em: ${today}`]);
    rDate.getCell(1).font = { italic: true, color: { argb: C.slate }, size: 9 };
    wsR.mergeCells(rDate.number, 1, rDate.number, 2);
    wsR.addRow([]);

    const sections: Array<{ title: string; rows: [string, string | number][] }> = [
      {
        title: "VISÃO GERAL",
        rows: [
          ["Municípios com presença", cityCount],
          ["Total de pessoas",        all.length],
          ["Ativas",                  active],
          ["Leads",                   leads],
          ["Inativas",                inactive],
          ["Confirmadas (apoio)",     confirm],
        ],
      },
      {
        title: "POR CARGO (ativos)",
        rows: ROLE_ORDER.map((r) => [
          ROLE_LABEL[r],
          all.filter((c) => c.status === "ACTIVE" && c.campaignRole === r).length,
        ] as [string, number]),
      },
      {
        title: "POR PERFIL (total)",
        rows: PROFILE_ORDER
          .map((p) => [PROFILE_LABEL[p], all.filter((c) => c.profile === p).length] as [string, number])
          .filter(([, n]) => n > 0),
      },
      {
        title: "STATUS DE APOIO (ativos)",
        rows: SUPPORT_ORDER.map((s) => [
          SUPPORT_LABEL[s],
          all.filter((c) => c.supportStatus === s && c.status === "ACTIVE").length,
        ] as [string, number]),
      },
    ];

    for (const sec of sections) {
      const rSec = wsR.addRow([sec.title, ""]);
      rSec.getCell(1).fill = fill(C.goldDark);
      rSec.getCell(1).font = { bold: true, color: { argb: C.gold }, size: 10 };
      rSec.getCell(2).fill = fill(C.goldDark);
      rSec.height = 18;

      let alt = false;
      for (const [label, val] of sec.rows) {
        const r = wsR.addRow([label, val]);
        r.getCell(1).fill   = fill(alt ? C.rowAlt : C.rowNormal);
        r.getCell(1).font   = { color: { argb: C.white }, size: 10 };
        r.getCell(2).fill   = fill(alt ? C.rowAlt : C.rowNormal);
        r.getCell(2).font   = { color: { argb: C.gold }, bold: true, size: 10 };
        r.getCell(2).alignment = { horizontal: "center" };
        r.height = 18;
        alt = !alt;
      }
      wsR.addRow([]);
    }

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

    const wsCov = wb.addWorksheet("Cobertura", { properties: { tabColor: { argb: C.gold } } });
    wsCov.columns = [
      { width: 24 }, { width: 11 }, { width: 10 }, { width: 12 },
      { width: 13 }, { width: 11 }, { width: 12 }, { width: 9 },
      { width: 8 }, { width: 13 }, { width: 8 },
    ];
    wsCov.views = [{ state: "frozen", ySplit: 1 }];

    const covHeaderRow = wsCov.addRow([
      "Município", "Cobertura", "C. Geral", "C. Regional",
      "L. Municipal", "L. Bairro", "Voluntários", "Ativos", "Leads", "Confirmados", "Total",
    ]);
    styleHeader(covHeaderRow);

    let altCov = false;
    for (const [city, m] of cityEntries) {
      const cov = coverageScore(m.roles);
      const r = wsCov.addRow([
        city, cov,
        m.roles["COORD_GERAL"]     ?? 0,
        m.roles["COORD_REGIONAL"]  ?? 0,
        m.roles["LIDER_MUNICIPAL"] ?? 0,
        m.roles["LIDER_BAIRRO"]    ?? 0,
        m.roles["VOLUNTARIO"]      ?? 0,
        m.active, m.leads, m.confirmados, m.total,
      ]);
      styleData(r, altCov);
      // Color cobertura cell
      const [fg, bg] = COVERAGE_FILL[cov] ?? [C.white, C.rowNormal];
      r.getCell(2).fill = fill(bg);
      r.getCell(2).font = { color: { argb: fg }, bold: true, size: 10 };
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      altCov = !altCov;
    }

    // Totals row
    const covTotalRow = wsCov.addRow([
      "TOTAL", "",
      ...ROLE_ORDER.map((ro) => cityEntries.reduce((s, [, m]) => s + (m.roles[ro] ?? 0), 0)),
      cityEntries.reduce((s, [, m]) => s + m.active, 0),
      cityEntries.reduce((s, [, m]) => s + m.leads, 0),
      cityEntries.reduce((s, [, m]) => s + m.confirmados, 0),
      cityEntries.reduce((s, [, m]) => s + m.total, 0),
    ]);
    covTotalRow.eachCell((cell) => {
      cell.fill   = fill(C.goldDark);
      cell.font   = { bold: true, color: { argb: C.gold }, size: 10 };
      cell.border = border();
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    covTotalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    covTotalRow.height = 20;

    // ── Aba 3: Lista Completa ────────────────────────────────────
    const wsList = wb.addWorksheet("Colaboradores", { properties: { tabColor: { argb: C.gold } } });
    wsList.columns = [
      { width: 30 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 28 },
      { width: 18 }, { width: 12 }, { width: 16 }, { width: 24 }, { width: 34 }, { width: 15 },
    ];
    wsList.views = [{ state: "frozen", ySplit: 1 }];

    const listHeaderRow = wsList.addRow([
      "Nome", "Município", "Bairro", "Telefone", "E-mail",
      "Cargo", "Status", "Apoio", "Perfil", "Formas de Contribuição", "Cadastrado em",
    ]);
    styleHeader(listHeaderRow);

    let altList = false;
    for (const c of all) {
      const statusLabel  = STATUS_LABEL[c.status]          ?? c.status;
      const supportLabel = SUPPORT_LABEL[c.supportStatus]  ?? c.supportStatus;
      const r = wsList.addRow([
        c.name,
        c.city         ?? "",
        c.neighborhood ?? "",
        c.phone        ?? "",
        c.email        ?? "",
        ROLE_LABEL[c.campaignRole]    ?? c.campaignRole,
        statusLabel,
        supportLabel,
        PROFILE_LABEL[c.profile]      ?? c.profile,
        c.contributionTypes.map((t) => CONTRIB_LABEL[t] ?? t).join("; "),
        new Date(c.createdAt).toLocaleDateString("pt-BR"),
      ]);
      styleData(r, altList);

      // Color Status cell (col 7)
      if (STATUS_FILL[c.status]) {
        const [fg, bg] = STATUS_FILL[c.status];
        r.getCell(7).fill = fill(bg);
        r.getCell(7).font = { color: { argb: fg }, bold: true, size: 10 };
        r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      }

      // Color Apoio cell (col 8)
      if (SUPPORT_FILL[c.supportStatus]) {
        const [fg, bg] = SUPPORT_FILL[c.supportStatus];
        r.getCell(8).fill = fill(bg);
        r.getCell(8).font = { color: { argb: fg }, bold: true, size: 10 };
        r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      }

      altList = !altList;
    }

    // ── Aba 4: Análise Política ──────────────────────────────────
    const activeAll  = all.filter((c) => c.status === "ACTIVE");
    const leadsAll   = all.filter((c) => c.status === "LEAD");
    const confirmAll = activeAll.filter((c) => c.supportStatus === "CONFIRMADO");
    const pctAct     = all.length > 0 ? ((activeAll.length / all.length) * 100).toFixed(1) : "0";
    const pctConf    = activeAll.length > 0 ? ((confirmAll.length / activeAll.length) * 100).toFixed(1) : "0";

    const now2   = new Date();
    const d30b   = new Date(now2.getTime() - 30 * 86400000);
    const d60b   = new Date(now2.getTime() - 60 * 86400000);
    const new30b  = all.filter((c) => new Date(c.createdAt) >= d30b).length;
    const prev30b = all.filter((c) => new Date(c.createdAt) >= d60b && new Date(c.createdAt) < d30b).length;

    const KEY_PROFILES_XLSX = ["PASTOR", "VEREADOR", "LIDER_POLITICO", "EMPRESARIO", "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA"];
    const crossRows = KEY_PROFILES_XLSX
      .map((p) => {
        const grp = activeAll.filter((c) => c.profile === p);
        return {
          profile: PROFILE_LABEL[p] ?? p,
          confirm: grp.filter((c) => c.supportStatus === "CONFIRMADO").length,
          negoc:   grp.filter((c) => c.supportStatus === "NEGOCIANDO").length,
          neutro:  grp.filter((c) => c.supportStatus === "NEUTRO").length,
          adv:     grp.filter((c) => c.supportStatus === "ADVERSARIO").length,
          total:   grp.length,
        };
      })
      .filter((r) => r.total > 0);

    const orphans = cityEntries
      .filter(([, m]) => coverageScore(m.roles) === "Baixa" && m.active > 0)
      .map(([city, m]) => [city, m.active, m.leads, m.total]);

    const top10conf = [...cityEntries]
      .filter(([, m]) => m.confirmados > 0)
      .sort((a, b) => b[1].confirmados - a[1].confirmados)
      .slice(0, 10)
      .map(([city, m]) => [
        city, m.confirmados, m.active,
        `${m.active > 0 ? Math.round((m.confirmados / m.active) * 100) : 0}%`,
      ]);

    const wsA = wb.addWorksheet("Análise Política", { properties: { tabColor: { argb: C.gold } } });
    wsA.columns = [{ width: 34 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];

    // Título
    const aTitulo = wsA.addRow([`Análise Política — Base André Santos 2026`]);
    wsA.mergeCells(aTitulo.number, 1, aTitulo.number, 6);
    aTitulo.getCell(1).fill = fill(C.gold);
    aTitulo.getCell(1).font = { bold: true, size: 13, color: { argb: C.slate900 } };
    aTitulo.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    aTitulo.height = 28;
    wsA.addRow([`Gerado em: ${today}`]).getCell(1).font = { italic: true, color: { argb: C.slate }, size: 9 };
    wsA.addRow([]);

    // Funil
    styleTitle(wsA.addRow([]), "FUNIL DE CONVERSÃO", wsA, 3);
    const funilHeader = wsA.addRow(["Etapa", "Quantidade", "Taxa"]);
    styleHeader(funilHeader);
    const funilData: [string, number | string, string][] = [
      ["Total cadastrado",           all.length,          "100%"],
      ["Ativos",                     activeAll.length,    `${pctAct}%`],
      ["Confirmados (apoio ativo)",  confirmAll.length,   `${pctConf}% dos ativos`],
      ["Leads não convertidos",      leadsAll.length,     "—"],
    ];
    funilData.forEach(([label, qty, taxa], i) => {
      const r = wsA.addRow([label, qty, taxa]);
      styleData(r, i % 2 !== 0);
    });
    wsA.addRow([]);

    // Crescimento
    styleTitle(wsA.addRow([]), "CRESCIMENTO (últimos 30 dias vs. 30 anteriores)", wsA, 3);
    const crescHeader = wsA.addRow(["Período", "Cadastros", "Variação"]);
    styleHeader(crescHeader);
    const varRow = wsA.addRow(["Variação", new30b - prev30b, new30b >= prev30b ? "↑ crescendo" : "↓ queda"]);
    [
      wsA.addRow(["Últimos 30 dias",  new30b,  "—"]),
      wsA.addRow(["30 dias anteriores", prev30b, "—"]),
      varRow,
    ].forEach((r, i) => styleData(r, i % 2 !== 0));
    wsA.addRow([]);

    // Capital político
    styleTitle(wsA.addRow([]), "CAPITAL POLÍTICO POR PERFIL (ativos)", wsA, 6);
    const crossHeader = wsA.addRow(["Perfil", "Confirmado", "Negociando", "Neutro", "Adversário", "Total"]);
    styleHeader(crossHeader);
    crossRows.forEach((cr, i) => {
      const r = wsA.addRow([cr.profile, cr.confirm, cr.negoc, cr.neutro, cr.adv, cr.total]);
      styleData(r, i % 2 !== 0);
      if (cr.confirm > 0)  { r.getCell(2).fill = fill(C.greenBg); r.getCell(2).font = { color: { argb: C.green }, bold: true, size: 10 }; }
      if (cr.negoc > 0)    { r.getCell(3).fill = fill(C.amberBg); r.getCell(3).font = { color: { argb: C.amber }, bold: true, size: 10 }; }
      if (cr.adv > 0)      { r.getCell(5).fill = fill(C.redBg);   r.getCell(5).font = { color: { argb: C.red },   bold: true, size: 10 }; }
    });
    wsA.addRow([]);

    // Municípios sem liderança
    if (orphans.length > 0) {
      styleTitle(wsA.addRow([]), "MUNICÍPIOS SEM LIDERANÇA (com ativos)", wsA, 4);
      const orphHeader = wsA.addRow(["Município", "Ativos", "Leads", "Total"]);
      styleHeader(orphHeader);
      orphans.forEach((o, i) => {
        const r = wsA.addRow(o);
        styleData(r, i % 2 !== 0);
        r.getCell(1).font = { color: { argb: C.amber }, size: 10 };
      });
      wsA.addRow([]);
    }

    // Top 10 confirmados
    if (top10conf.length > 0) {
      styleTitle(wsA.addRow([]), "TOP 10 MUNICÍPIOS POR CONFIRMADOS", wsA, 4);
      const top10Header = wsA.addRow(["Município", "Confirmados", "Ativos", "% Confirmados"]);
      styleHeader(top10Header);
      top10conf.forEach((t, i) => {
        const r = wsA.addRow(t);
        styleData(r, i % 2 !== 0);
        r.getCell(2).fill = fill(C.greenBg);
        r.getCell(2).font = { color: { argb: C.green }, bold: true, size: 10 };
      });
    }

    // ── Gerar buffer ─────────────────────────────────────────────
    const buf = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];

    return new Response(buf as unknown as BodyInit, {
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
