-- Add nurturingStep to Establishment
ALTER TABLE "Establishment" ADD COLUMN "nurturingStep" INTEGER NOT NULL DEFAULT 0;

-- Create Broadcast table
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Broadcast_establishmentId_idx" ON "Broadcast"("establishmentId");

ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_establishmentId_fkey"
    FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
