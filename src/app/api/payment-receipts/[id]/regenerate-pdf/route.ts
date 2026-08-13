import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { regenerateReceiptPdf } from "@/lib/receipts";

export const maxDuration = 30;

/** Recupera recibos com pdfUrl null (ex: gerados durante o bug de bundling do pdfkit). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem regenerar recibos" }, { status: 403 });
    }
    const { db, cid: CID } = getCampaignContext(session);

    const receipt = await db.paymentReceipt.findUnique({
      where: { id: params.id },
      select: { collaborator: { select: { campaignId: true } } },
    });
    if (!receipt || receipt.collaborator.campaignId !== CID) {
      return NextResponse.json({ error: "Recibo não encontrado" }, { status: 404 });
    }

    const pdfUrl = await regenerateReceiptPdf(db, params.id, CID);
    return NextResponse.json({ ok: true, pdfUrl });
  } catch (err) {
    console.error("[api/payment-receipts/:id/regenerate-pdf] erro:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao regenerar PDF" }, { status: 500 });
  }
}
