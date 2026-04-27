import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

const ROLE_LABEL: Record<string, string> = {
  COORD_GERAL: "Coord. Geral", COORD_REGIONAL: "Coord. Regional",
  LIDER_MUNICIPAL: "Líder Municipal", LIDER_BAIRRO: "Líder de Bairro", VOLUNTARIO: "Voluntário",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collaborators = await db.collaborator.findMany({
      where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
      select: { name: true, city: true, neighborhood: true, phone: true, email: true, campaignRole: true, status: true, supportStatus: true, profile: true, contributionTypes: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    const headers = ["Município", "Bairro", "Nome", "Telefone", "E-mail", "Cargo", "Status", "Apoio", "Perfil", "Formas de Contribuição"];
    const rows = collaborators.map((c) => [
      c.city ?? "",
      c.neighborhood ?? "",
      c.name,
      c.phone ?? "",
      c.email ?? "",
      ROLE_LABEL[c.campaignRole] ?? c.campaignRole,
      c.status === "ACTIVE" ? "Ativo" : "Lead",
      c.supportStatus,
      c.profile,
      c.contributionTypes.join("; "),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cobertura-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[relatorio/export]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
