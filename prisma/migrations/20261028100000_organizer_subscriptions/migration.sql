-- CreateTable
CREATE TABLE "OrganizerSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "testOnly" BOOLEAN NOT NULL DEFAULT true,
    "anchorAt" DATETIME NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlan" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizerSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizerPublication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizerPublication_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizerSubscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizerPublication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerSubscription_userId_key" ON "OrganizerSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerPublication_eventId_key" ON "OrganizerPublication"("eventId");

-- CreateIndex
CREATE INDEX "OrganizerPublication_subscriptionId_periodStart_idx" ON "OrganizerPublication"("subscriptionId", "periodStart");

