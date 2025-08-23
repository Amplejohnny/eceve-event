/*
  Warnings:

  - You are about to drop the column `cancelledAt` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `refundedAt` on the `tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "cancelledAt",
DROP COLUMN "refundedAt";
