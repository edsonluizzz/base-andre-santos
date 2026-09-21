import type { PrismaClient } from "@prisma/client";
import type { SendStore, ClaimedRow } from "./sender";
import type { Recipient } from "./recipients";

type Status = "PENDING" | "SENDING" | "SENT" | "FAILED";

export function createPrismaSendStore(db: PrismaClient, cid: string, emailCampaignId: string) {
  const store: SendStore & { stats(): Promise<Record<Status, number>> } = {
    async seed(recipients: Recipient[]) {
      for (let i = 0; i < recipients.length; i += 1000) {
        await db.emailCampaignSend.createMany({
          data: recipients.slice(i, i + 1000).map((r) => ({
            campaignId: cid, emailCampaignId, email: r.email, name: r.name,
          })),
          skipDuplicates: true,
        });
      }
    },
    async claim(limit: number) {
      // UPDATE ... SKIP LOCKED: duas requisições simultâneas nunca pegam a mesma linha.
      // Quem pediu descadastro depois do seed permanece PENDING e nunca é enviado.
      return db.$queryRaw<ClaimedRow[]>`
        UPDATE "EmailCampaignSend" SET status = 'SENDING'
        WHERE id IN (
          SELECT id FROM "EmailCampaignSend"
          WHERE "emailCampaignId" = ${emailCampaignId} AND status = 'PENDING'
            AND NOT EXISTS (
              SELECT 1 FROM "EmailSuppression" s
              WHERE s."campaignId" = "EmailCampaignSend"."campaignId"
                AND s.email = "EmailCampaignSend".email
            )
          ORDER BY "createdAt", id
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, email, name`;
    },
    async markSent(id, providerId) {
      await db.emailCampaignSend.update({
        where: { id }, data: { status: "SENT", providerId, sentAt: new Date() },
      });
    },
    async markFailed(id, error) {
      await db.emailCampaignSend.update({
        where: { id }, data: { status: "FAILED", error: error.slice(0, 2000) },
      });
    },
    async countSentSince(since) {
      return db.emailCampaignSend.count({
        where: { campaignId: cid, status: "SENT", sentAt: { gte: since } },
      });
    },
    async stats() {
      const groups = await db.emailCampaignSend.groupBy({
        by: ["status"], where: { emailCampaignId }, _count: true,
      });
      const out: Record<Status, number> = { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0 };
      for (const g of groups) out[g.status as Status] = g._count;
      return out;
    },
  };
  return store;
}
