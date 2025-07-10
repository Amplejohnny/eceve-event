/*
  Warnings:

  - You are about to drop the column `ticketTypes` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `ticketType` on the `tickets` table. All the data in the column will be lost.
  - Added the required column `ticketTypeId` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "ticketTypes";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "ticketType",
ADD COLUMN     "ticketTypeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_types_eventId_idx" ON "ticket_types"("eventId");

-- CreateIndex
CREATE INDEX "ticket_types_eventId_price_idx" ON "ticket_types"("eventId", "price");

-- CreateIndex
CREATE INDEX "events_date_status_idx" ON "events"("date", "status");

-- CreateIndex
CREATE INDEX "payments_eventId_idx" ON "payments"("eventId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_customerEmail_idx" ON "payments"("customerEmail");

-- CreateIndex
CREATE INDEX "payouts_organizerId_idx" ON "payouts"("organizerId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "tickets_ticketTypeId_idx" ON "tickets"("ticketTypeId");

-- CreateIndex
CREATE INDEX "tickets_ticketTypeId_status_idx" ON "tickets"("ticketTypeId", "status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
