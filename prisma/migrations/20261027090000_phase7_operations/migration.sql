ALTER TABLE `Event` ADD COLUMN `termsVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN `pendingChangeId` TEXT ;
ALTER TABLE `Event` ADD COLUMN `refundPolicy` TEXT NOT NULL DEFAULT '{}';
ALTER TABLE `Event` ADD COLUMN `entryInstructions` TEXT NOT NULL DEFAULT '';
ALTER TABLE `Booking` ADD COLUMN `eventTermsSnapshot` TEXT NOT NULL DEFAULT '{}';
ALTER TABLE `Booking` ADD COLUMN `refundPolicySnapshot` TEXT NOT NULL DEFAULT '{}';
CREATE TABLE `EventChange` (
 `id` TEXT NOT NULL PRIMARY KEY,
 `eventId` TEXT NOT NULL,
 `requesterId` TEXT NOT NULL,
 `reviewerId` TEXT,
 `kind` TEXT NOT NULL DEFAULT 'DETAILS',
 `status` TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
 `baseTermsVersion` INTEGER NOT NULL,
 `previousPaused` BOOLEAN NOT NULL,
 `reason` TEXT NOT NULL,
 `reviewNotes` TEXT NOT NULL DEFAULT '',
 `previousValues` TEXT NOT NULL,
 `proposedValues` TEXT NOT NULL,
 `affectedBookingIds` TEXT NOT NULL,
 `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `reviewedAt` DATETIME,
 `effectiveAt` DATETIME,
 `notifiedAt` DATETIME,
 CONSTRAINT `EventChange_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX `EventChange_eventId_createdAt_idx` ON `EventChange`(`eventId`,`createdAt`);
CREATE INDEX `EventChange_status_createdAt_idx` ON `EventChange`(`status`,`createdAt`);
CREATE TABLE `new_Notification` (
 `id` TEXT NOT NULL PRIMARY KEY, `userId` TEXT NOT NULL, `title` TEXT NOT NULL, `body` TEXT NOT NULL,
 `link` TEXT NOT NULL DEFAULT '/tickets', `read` BOOLEAN NOT NULL DEFAULT false, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `deliveryChannel` TEXT NOT NULL DEFAULT 'IN_APP', `deliveryStatus` TEXT NOT NULL DEFAULT 'AVAILABLE', `dedupeKey` TEXT,
 `category` TEXT NOT NULL DEFAULT 'TRANSACTIONAL', `jobStatus` TEXT NOT NULL DEFAULT 'PENDING', `attempts` INTEGER NOT NULL DEFAULT 0,
 `retryCycles` INTEGER NOT NULL DEFAULT 0, `nextAttemptAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `leaseUntil` DATETIME, `workerToken` TEXT, `lastAttemptAt` DATETIME, `lastError` TEXT,
 CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO `new_Notification` (`id`,`userId`,`title`,`body`,`link`,`read`,`createdAt`,`deliveryChannel`,`deliveryStatus`,`dedupeKey`) SELECT `id`,`userId`,`title`,`body`,`link`,`read`,`createdAt`,`deliveryChannel`,`deliveryStatus`,`dedupeKey` FROM `Notification`;
DROP TABLE `Notification`;
ALTER TABLE `new_Notification` RENAME TO `Notification`;
CREATE UNIQUE INDEX `Notification_dedupeKey_key` ON `Notification`(`dedupeKey`);
CREATE INDEX `Notification_userId_read_idx` ON `Notification`(`userId`,`read`);
CREATE INDEX `Notification_jobStatus_nextAttemptAt_idx` ON `Notification`(`jobStatus`,`nextAttemptAt`);
