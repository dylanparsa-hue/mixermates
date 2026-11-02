CREATE TABLE "OAuthAccount" (
 "id" TEXT NOT NULL PRIMARY KEY, "provider" TEXT NOT NULL, "subject" TEXT NOT NULL,
 "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OAuthAccount_provider_subject_key" ON "OAuthAccount"("provider", "subject");
CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");
CREATE TABLE "GoogleAuthFlow" (
 "id" TEXT NOT NULL PRIMARY KEY, "bindingHash" TEXT NOT NULL, "nonceHash" TEXT NOT NULL,
 "verifier" TEXT NOT NULL, "purpose" TEXT NOT NULL, "userId" TEXT, "securityVersion" INTEGER,
 "status" TEXT NOT NULL DEFAULT 'STARTED', "subject" TEXT, "email" TEXT, "name" TEXT,
 "expiresAt" DATETIME NOT NULL
);
CREATE INDEX "GoogleAuthFlow_expiresAt_idx" ON "GoogleAuthFlow"("expiresAt");
