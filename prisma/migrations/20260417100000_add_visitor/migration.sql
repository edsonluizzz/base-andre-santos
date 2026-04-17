-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "eventId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_establishmentId_idx" ON "Visitor"("establishmentId");

-- CreateIndex
CREATE INDEX "Visitor_eventId_idx" ON "Visitor"("eventId");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
