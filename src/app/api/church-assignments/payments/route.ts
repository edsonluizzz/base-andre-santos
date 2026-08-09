import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getPaymentsReport } from "@/lib/church-payments";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem ver o financeiro" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const payingEntityId = new URL(req.url).searchParams.get("payingEntityId") ?? undefined;
    const report = await getPaymentsReport(db, CID, payingEntityId);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/church-assignments/payments] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar relatório financeiro" }, { status: 500 });
  }
}
