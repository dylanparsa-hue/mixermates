-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
