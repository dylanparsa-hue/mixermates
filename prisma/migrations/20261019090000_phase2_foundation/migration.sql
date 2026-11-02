-- CreateTable
CREATE TABLE "UserCapability" (
    "userId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "capability"),
    CONSTRAINT "UserCapability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "inviteeEmail" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvitationGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "InvitationGrant_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "EventInvitation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvitationGrant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvitationGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizerId" TEXT NOT NULL,
    "methodType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "activeVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentDestination_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentDestination_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "PaymentRecipientVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentRecipientVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientReference" TEXT NOT NULL,
    "qrAssetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "disabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecipientVersion_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "PaymentDestination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecipientVersion_qrAssetId_fkey" FOREIGN KEY ("qrAssetId") REFERENCES "FileUpload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecipientVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "receiptUploadId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "recipientVersionId" TEXT,
    "expectedAmount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PAYMENT',
    "status" TEXT NOT NULL DEFAULT 'PROOF_SUBMITTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvidence_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentEvidence_receiptUploadId_fkey" FOREIGN KEY ("receiptUploadId") REFERENCES "FileUpload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentEvidence_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentEvidence_recipientVersionId_fkey" FOREIGN KEY ("recipientVersionId") REFERENCES "PaymentRecipientVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "fundsVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReview_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentReview_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "PaymentEvidence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "securityVersion" INTEGER NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "city" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ATTENDEE',
    "photo" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '/images/profile-cover.png',
    "socialNotifications" BOOLEAN NOT NULL DEFAULT true,
    "promotionalNotifications" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "instagramPublic" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT NOT NULL DEFAULT 'House,Electronic',
    "attendancePublic" BOOLEAN NOT NULL DEFAULT false,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "achievementsPublic" BOOLEAN NOT NULL DEFAULT false,
    "verification" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("achievementsPublic", "active", "attendancePublic", "bio", "city", "cover", "createdAt", "discoverable", "dob", "email", "id", "instagram", "instagramPublic", "interests", "name", "passwordHash", "photo", "promotionalNotifications", "role", "socialNotifications", "username", "verification", "website") SELECT "achievementsPublic", "active", "attendancePublic", "bio", "city", "cover", "createdAt", "discoverable", "dob", "email", "id", "instagram", "instagramPublic", "interests", "name", "passwordHash", "photo", "promotionalNotifications", "role", "socialNotifications", "username", "verification", "website" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_Session" (
    "securityVersion" INTEGER NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("expires", "id", "userId") SELECT "expires", "id", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE TABLE "new_Event" (
    "origin" TEXT NOT NULL DEFAULT 'LEGACY_DEMO',
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
    "invitationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reservedCount" INTEGER NOT NULL DEFAULT 0,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "configurationStatus" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
    "sourceConfiguration" TEXT NOT NULL DEFAULT '{}',
    "paymentDestinationId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "atmosphere" TEXT NOT NULL DEFAULT 'Electric',
    "image" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "privateVenue" TEXT NOT NULL DEFAULT '',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 18,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "access" TEXT NOT NULL DEFAULT 'PUBLIC',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "salesPaused" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'Electric',
    "policies" TEXT NOT NULL DEFAULT 'Government-issued photo ID required. No prohibited items. Tickets are non-transferable. Contact the organizer for demo refunds.',
    "organizerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_paymentDestinationId_fkey" FOREIGN KEY ("paymentDestinationId") REFERENCES "PaymentDestination" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("access", "age", "approvalRequired", "atmosphere", "capacity", "category", "city", "createdAt", "description", "endsAt", "genre", "id", "image", "latitude", "longitude", "organizerId", "policies", "privateVenue", "salesPaused", "slug", "startsAt", "status", "theme", "title", "venue") SELECT "access", "age", "approvalRequired", "atmosphere", "capacity", "category", "city", "createdAt", "description", "endsAt", "genre", "id", "image", "latitude", "longitude", "organizerId", "policies", "privateVenue", "salesPaused", "slug", "startsAt", "status", "theme", "title", "venue" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_city_status_startsAt_idx" ON "Event"("city", "status", "startsAt");
CREATE TABLE "new_Booking" (
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
INSERT INTO "new_Booking" ("answers", "attendancePublic", "createdAt", "eventId", "id", "idempotencyKey", "paymentStatus", "quantity", "receiptPath", "status", "tierId", "total", "userId") SELECT "answers", "attendancePublic", "createdAt", "eventId", "id", "idempotencyKey", "paymentStatus", "quantity", "receiptPath", "status", "tierId", "total", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE INDEX "Booking_userId_eventId_idx" ON "Booking"("userId", "eventId");
CREATE INDEX "Booking_eventId_status_idx" ON "Booking"("eventId", "status");
CREATE TABLE "new_Ticket" (
    "origin" TEXT NOT NULL DEFAULT 'LEGACY_DEMO',
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER,
    "issuedAt" DATETIME,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("bookingId", "createdAt", "id", "status", "token") SELECT "bookingId", "createdAt", "id", "status", "token" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_token_key" ON "Ticket"("token");
CREATE UNIQUE INDEX "Ticket_bookingId_sequence_key" ON "Ticket"("bookingId", "sequence");
CREATE TABLE "new_Payment" (
    "origin" TEXT NOT NULL DEFAULT 'LEGACY_DEMO',
    "workflowState" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "confirmedAt" DATETIME,
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "provider" TEXT NOT NULL DEFAULT 'DEMO_TOUCH_N_GO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutId" TEXT,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "bookingId", "createdAt", "fee", "id", "payoutId", "provider", "status") SELECT "amount", "bookingId", "createdAt", "fee", "id", "payoutId", "provider", "status" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");
CREATE TABLE "new_Notification" (
    "deliveryChannel" TEXT NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "dedupeKey" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '/tickets',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("body", "createdAt", "id", "link", "read", "title", "userId") SELECT "body", "createdAt", "id", "link", "read", "title", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE TABLE "new_EventStaff" (
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canViewGuests" BOOLEAN NOT NULL DEFAULT true,
    "canCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "canReviewPayments" BOOLEAN NOT NULL DEFAULT false,
    "canApproveRegistrations" BOOLEAN NOT NULL DEFAULT false,
    "canViewLocation" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("eventId", "userId"),
    CONSTRAINT "EventStaff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventStaff" ("eventId", "userId") SELECT "eventId", "userId" FROM "EventStaff";
DROP TABLE "EventStaff";
ALTER TABLE "new_EventStaff" RENAME TO "EventStaff";
CREATE TABLE "new_AdminAuditLog" (
    "actorRole" TEXT NOT NULL DEFAULT 'LEGACY',
    "eventId" TEXT,
    "entityType" TEXT NOT NULL DEFAULT 'LEGACY',
    "previousState" TEXT,
    "newState" TEXT,
    "reasonCode" TEXT,
    "correlationId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AdminAuditLog" ("action", "createdAt", "id", "targetId", "userId") SELECT "action", "createdAt", "id", "targetId", "userId" FROM "AdminAuditLog";
DROP TABLE "AdminAuditLog";
ALTER TABLE "new_AdminAuditLog" RENAME TO "AdminAuditLog";
CREATE INDEX "AdminAuditLog_eventId_createdAt_idx" ON "AdminAuditLog"("eventId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_tokenHash_key" ON "EventInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "EventInvitation_eventId_status_idx" ON "EventInvitation"("eventId", "status");

-- CreateIndex
CREATE INDEX "InvitationGrant_eventId_userId_status_idx" ON "InvitationGrant"("eventId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationGrant_invitationId_userId_key" ON "InvitationGrant"("invitationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecipientVersion_destinationId_version_key" ON "PaymentRecipientVersion"("destinationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvidence_paymentId_receiptUploadId_key" ON "PaymentEvidence"("paymentId", "receiptUploadId");


-- Quarantine all legacy origins. Backfill state labels, not financial legitimacy.
UPDATE "Booking" SET "lifecycle"=CASE WHEN "status"='APPROVED' THEN 'CONFIRMED' WHEN "status"='PENDING_REVIEW' THEN 'PENDING' ELSE 'CANCELLED' END, "paymentRequired"=("total">0), "approvalRequired"=1, "paymentState"=CASE WHEN "total"=0 THEN 'NOT_REQUIRED' WHEN "paymentStatus"='SUCCEEDED' THEN 'CONFIRMED' WHEN "paymentStatus"='REFUNDED' THEN 'REFUNDED' ELSE 'AWAITING_PAYMENT' END, "registrationState"=CASE WHEN "status"='APPROVED' THEN 'APPROVED' WHEN "status"='REJECTED' THEN 'REJECTED' WHEN "status"='CANCELLED' THEN 'CANCELLED' ELSE 'PENDING' END WHERE "origin"='LEGACY_DEMO' AND "lifecycle"='DRAFT';
UPDATE "Payment" SET "workflowState"=CASE WHEN "status"='SUCCEEDED' THEN 'CONFIRMED' WHEN "status"='REFUNDED' THEN 'REFUNDED' ELSE 'AWAITING_PAYMENT' END WHERE "origin"='LEGACY_DEMO';
UPDATE "Event" SET "reservedCount"=COALESCE((SELECT SUM("sold") FROM "EventTicketTier" WHERE "EventTicketTier"."eventId"="Event"."id"),0);
