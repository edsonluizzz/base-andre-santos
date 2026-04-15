-- AlterTable
ALTER TABLE "Member" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");
