import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL, STATUS_LABEL, SUPPORT_LABEL, PROFILE_LABEL, CONTRIB_LABEL } from "@/lib/labels";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collaborators = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: {
        name: true, city: true, neighborhood: true, phone: true, email: true,
        campaignRole: true, status: true, supportStatus: true, profile: true,
        contributionTypes: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    const headers = [
      "Município", "Bairro", "Nome", "Telefone", "E-mail",
      "Cargo", "Status", "Apoio", "Perfil", "Formas de Contribuição",
    ];

    const rows = collaborators.map((c) => [
      c.city ?? "",
      c.neighborhood ?? "",
      c.name,
      c.phone ?? "",
      c.email ?? "",
      ROLE_LABEL[c.campaignRole]    ?? c.campaignRole,
      STATUS_LABEL[c.status]        ?? c.status,
      SUPPORT_LABEL[c.supportStatus] ?? c.supportStatus,
      PROFILE_LABEL[c.profile]      ?? c.profile,
      c.contributionTypes.map((t) => CONTRIB_LABEL[t] ?? t).join("; "),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const date = new Date().toISOString().split("T")[0];
    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cobertura-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[relatorio/export]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
