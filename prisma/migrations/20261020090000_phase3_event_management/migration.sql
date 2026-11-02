-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "creationKey" TEXT,
    "subcategory" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "supportingImages" TEXT NOT NULL DEFAULT '[]',
    "locationVisibility" TEXT NOT NULL DEFAULT 'HIDDEN',
    "guestListVisibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "idCheckRequired" BOOLEAN NOT NULL DEFAULT true,
    "entryOptions" TEXT NOT NULL DEFAULT '[]',
    "reviewOutcome" TEXT NOT NULL DEFAULT 'NONE',
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
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
INSERT INTO "new_Event" ("access", "age", "approvalRequired", "atmosphere", "capacity", "category", "city", "configurationStatus", "createdAt", "description", "endsAt", "genre", "id", "image", "invitationsEnabled", "latitude", "longitude", "organizerId", "origin", "paymentDestinationId", "policies", "privateVenue", "reservedCount", "salesPaused", "slug", "sourceConfiguration", "startsAt", "stateVersion", "status", "testOnly", "theme", "timezone", "title", "venue") SELECT "access", "age", "approvalRequired", "atmosphere", "capacity", "category", "city", "configurationStatus", "createdAt", "description", "endsAt", "genre", "id", "image", "invitationsEnabled", "latitude", "longitude", "organizerId", "origin", "paymentDestinationId", "policies", "privateVenue", "reservedCount", "salesPaused", "slug", "sourceConfiguration", "startsAt", "stateVersion", "status", "testOnly", "theme", "timezone", "title", "venue" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_creationKey_key" ON "Event"("creationKey");
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_city_status_startsAt_idx" ON "Event"("city", "status", "startsAt");
CREATE TABLE "new_EventTicketTier" (
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "minPerOrder" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "maxPerOrder" INTEGER NOT NULL DEFAULT 4,
    "saleStart" DATETIME,
    "saleEnd" DATETIME,
    CONSTRAINT "EventTicketTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventTicketTier" ("description", "eventId", "id", "maxPerOrder", "name", "price", "quantity", "saleEnd", "saleStart", "sold") SELECT "description", "eventId", "id", "maxPerOrder", "name", "price", "quantity", "saleEnd", "saleStart", "sold" FROM "EventTicketTier";
DROP TABLE "EventTicketTier";
ALTER TABLE "new_EventTicketTier" RENAME TO "EventTicketTier";
CREATE TABLE "new_EventRegistrationField" (
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "EventRegistrationField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventRegistrationField" ("eventId", "id", "label", "options", "required", "type") SELECT "eventId", "id", "label", "options", "required", "type" FROM "EventRegistrationField";
DROP TABLE "EventRegistrationField";
ALTER TABLE "new_EventRegistrationField" RENAME TO "EventRegistrationField";
CREATE TABLE "new_OrganizerVerification" (
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizerVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrganizerVerification" ("createdAt", "id", "note", "status", "userId") SELECT "createdAt", "id", "note", "status", "userId" FROM "OrganizerVerification";
DROP TABLE "OrganizerVerification";
ALTER TABLE "new_OrganizerVerification" RENAME TO "OrganizerVerification";
CREATE TABLE "new_PaymentDestination" (
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_PaymentDestination" ("activeVersionId", "createdAt", "id", "label", "methodType", "organizerId", "status", "updatedAt") SELECT "activeVersionId", "createdAt", "id", "label", "methodType", "organizerId", "status", "updatedAt" FROM "PaymentDestination";
DROP TABLE "PaymentDestination";
ALTER TABLE "new_PaymentDestination" RENAME TO "PaymentDestination";
CREATE TABLE "new_PaymentRecipientVersion" (
    "instructions" TEXT NOT NULL DEFAULT '',
    "organizerReference" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL DEFAULT '',
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "verificationProcedure" TEXT NOT NULL DEFAULT '',
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
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
INSERT INTO "new_PaymentRecipientVersion" ("approvedAt", "approvedById", "createdAt", "destinationId", "disabledAt", "id", "qrAssetId", "recipientName", "recipientReference", "status", "version") SELECT "approvedAt", "approvedById", "createdAt", "destinationId", "disabledAt", "id", "qrAssetId", "recipientName", "recipientReference", "status", "version" FROM "PaymentRecipientVersion";
DROP TABLE "PaymentRecipientVersion";
ALTER TABLE "new_PaymentRecipientVersion" RENAME TO "PaymentRecipientVersion";
CREATE UNIQUE INDEX "PaymentRecipientVersion_destinationId_version_key" ON "PaymentRecipientVersion"("destinationId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Preserve prior public locations; private legacy records remain hidden.
UPDATE Event SET locationVisibility = 'PUBLIC' WHERE access = 'PUBLIC';
