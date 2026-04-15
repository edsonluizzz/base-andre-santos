-- AlterTable: adiciona bankAccountId em Offering
ALTER TABLE "Offering" ADD COLUMN "bankAccountId" TEXT;

-- AlterTable: adiciona bankAccountId em Expense
ALTER TABLE "Expense" ADD COLUMN "bankAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Offering_bankAccountId_idx" ON "Offering"("bankAccountId");

-- CreateIndex
CREATE INDEX "Expense_bankAccountId_idx" ON "Expense"("bankAccountId");
