-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMPTZ(6),
ALTER COLUMN "emailVerified" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "events_isPublic_idx" ON "events"("isPublic");

-- CreateIndex
CREATE INDEX "events_status_isPublic_idx" ON "events"("status", "isPublic");

-- CreateIndex
CREATE INDEX "tickets_eventId_idx" ON "tickets"("eventId");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_attendeeEmail_idx" ON "tickets"("attendeeEmail");

-- CreateIndex
CREATE INDEX "tickets_eventId_status_idx" ON "tickets"("eventId", "status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_resetTokenExpiry_idx" ON "users"("resetTokenExpiry");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
