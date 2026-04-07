-- AlterTable: adiciona coluna joinCode na tabela Establishment
ALTER TABLE "Establishment" ADD COLUMN "joinCode" TEXT;

-- CreateIndex: índice único para joinCode
CREATE UNIQUE INDEX "Establishment_joinCode_key" ON "Establishment"("joinCode");
