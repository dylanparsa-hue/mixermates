ALTER TABLE "Event" ADD COLUMN "coverImage" TEXT NOT NULL DEFAULT '';
CREATE TABLE "OrganizerIdentity" (
 "userId" TEXT NOT NULL PRIMARY KEY,
 "slug" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrganizerIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrganizerIdentity_slug_key" ON "OrganizerIdentity"("slug");
CREATE TABLE "EventCreatorState" (
 "eventId" TEXT NOT NULL PRIMARY KEY,
 "payload" TEXT NOT NULL,
 "validatedThrough" INTEGER NOT NULL DEFAULT -1,
 CONSTRAINT "EventCreatorState_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
