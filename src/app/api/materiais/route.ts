import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import type { MaterialRequestStatus } from "@prisma/client";

const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "";
    const status = VALID_STATUSES.has(statusParam as MaterialRequestStatus) ? (statusParam as MaterialRequestStatus) : undefined;

    const rows = await db.materialRequest.findMany({
      where: { campaignId: cid, ...(status ? { status } : {}) },
      select: {
        id: true, items: true, status: true, pdfUrl: true,
        termSnapshotName: true, termSnapshotCpf: true, termAcceptedAt: true,
        emailStatus: true, whatsappStatus: true,
        deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
        deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
        approvedAt: true, deliveredAt: true, notes: true, createdAt: true,
        collaborator: { select: { id: true, name: true, phone: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        deliveredBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[api/materiais] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
