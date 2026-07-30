import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db as globalDb } from "@/lib/db";
import { getCampaignContext } from "@/lib/campaign-context";
import { cronSecretMatches } from "@/lib/api-auth";

// PDFs de recibo (CPF + valor pago + dados eleitorais) sobem pro Vercel Blob
// como `access: "public"` — necessário porque a Z-API (terceiro) precisa
// buscar a URL diretamente pra enviar como documento no WhatsApp; o Blob não
// oferece signed URL utilizável por um terceiro externo pra esse fluxo. Sem
// expiração nativa, mitigamos com retenção: depois de RECEIPT_RETENTION_DAYS,
// o arquivo é apagado do Blob e o link fica indisponível (achado de auditoria
// 2026-07-30 — "Blob público sem expiração").
const RETENTION_DAYS = Number(process.env.RECEIPT_RETENTION_DAYS ?? 180);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronSecretMatches(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const summary: Array<{ campaignId: string; purged: number; errors: number }> = [];

  try {
    const campaigns = await globalDb.campaign.findMany({
      where: { active: true },
      select: { id: true, dbUrl: true },
    });

    for (const camp of campaigns) {
      let purged = 0;
      let errors = 0;
      try {
        const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });

        const stale = await db.paymentReceipt.findMany({
          where: { createdAt: { lt: cutoff }, pdfUrl: { not: null } },
          select: { id: true, pdfUrl: true },
        });

        for (const receipt of stale) {
          try {
            if (receipt.pdfUrl) await del(receipt.pdfUrl);
            await db.paymentReceipt.update({ where: { id: receipt.id }, data: { pdfUrl: null } });
            purged++;
          } catch (err) {
            errors++;
            console.error(`[cron/purge-old-receipts] falha ao apagar recibo ${receipt.id}:`, err);
          }
        }
      } catch (err) {
        console.error(`[cron/purge-old-receipts] erro na campanha ${camp.id}:`, err);
        errors++;
      }
      summary.push({ campaignId: camp.id, purged, errors });
    }

    console.log(`[cron/purge-old-receipts] retentionDays=${RETENTION_DAYS}`, summary);
    return NextResponse.json({ ok: true, retentionDays: RETENTION_DAYS, campaigns: summary });
  } catch (err) {
    console.error("[cron/purge-old-receipts]", err);
    return NextResponse.json({ error: "Erro ao purgar recibos antigos" }, { status: 500 });
  }
}
