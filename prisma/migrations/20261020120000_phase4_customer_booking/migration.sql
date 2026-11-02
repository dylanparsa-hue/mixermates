-- AlterTable
ALTER TABLE "PaymentReview" ADD COLUMN "receivedAmount" INTEGER;
ALTER TABLE "PaymentReview" ADD COLUMN "recipientVersionId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "reviewHold" BOOLEAN NOT NULL DEFAULT false,
    "entryPath" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
    "byobRequired" BOOLEAN NOT NULL DEFAULT false,
    "byobState" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "origin" TEXT NOT NULL DEFAULT 'LEGACY_DEMO',
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
    "lifecycle" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentState" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "registrationState" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "reservationCreatedAt" DATETIME,
    "reservationExpiresAt" DATETIME,
    "inventoryHeld" BOOLEAN NOT NULL DEFAULT false,
    "inventoryReleasedAt" DATETIME,
    "recipientVersionId" TEXT,
    "recipientSnapshot" TEXT,
    "invitationGrantId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "paymentStatus" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "answers" TEXT NOT NULL DEFAULT '{}',
    "receiptPath" TEXT,
    "attendancePublic" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_recipientVersionId_fkey" FOREIGN KEY ("recipientVersionId") REFERENCES "PaymentRecipientVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_invitationGrantId_fkey" FOREIGN KEY ("invitationGrantId") REFERENCES "InvitationGrant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "EventTicketTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("answers", "approvalRequired", "attendancePublic", "byobRequired", "byobState", "createdAt", "entryPath", "eventId", "evidenceRequired", "id", "idempotencyKey", "inventoryHeld", "inventoryReleasedAt", "invitationGrantId", "lifecycle", "origin", "paymentRequired", "paymentState", "paymentStatus", "quantity", "receiptPath", "recipientSnapshot", "recipientVersionId", "registrationState", "reservationCreatedAt", "reservationExpiresAt", "status", "testOnly", "tierId", "total", "userId", "version") SELECT "answers", "approvalRequired", "attendancePublic", "byobRequired", "byobState", "createdAt", "entryPath", "eventId", "evidenceRequired", "id", "idempotencyKey", "inventoryHeld", "inventoryReleasedAt", "invitationGrantId", "lifecycle", "origin", "paymentRequired", "paymentState", "paymentStatus", "quantity", "receiptPath", "recipientSnapshot", "recipientVersionId", "registrationState", "reservationCreatedAt", "reservationExpiresAt", "status", "testOnly", "tierId", "total", "userId", "version" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE INDEX "Booking_userId_eventId_idx" ON "Booking"("userId", "eventId");
CREATE INDEX "Booking_eventId_status_idx" ON "Booking"("eventId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

