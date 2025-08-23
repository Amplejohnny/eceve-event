-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "refundedAt" TIMESTAMP(3);
