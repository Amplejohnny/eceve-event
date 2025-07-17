/*
  Warnings:

  - Added the required column `startTime` to the `events` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "startTime" TEXT NOT NULL,
ALTER COLUMN "category" SET NOT NULL;
