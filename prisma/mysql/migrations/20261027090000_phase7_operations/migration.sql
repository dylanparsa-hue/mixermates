ALTER TABLE `Event` ADD COLUMN `termsVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Event` ADD COLUMN `pendingChangeId` VARCHAR(191) ;
ALTER TABLE `Event` ADD COLUMN `refundPolicy` TEXT NOT NULL DEFAULT ('{}');
ALTER TABLE `Event` ADD COLUMN `entryInstructions` TEXT NOT NULL DEFAULT ('');
ALTER TABLE `Booking` ADD COLUMN `eventTermsSnapshot` TEXT NOT NULL DEFAULT ('{}');
ALTER TABLE `Booking` ADD COLUMN `refundPolicySnapshot` TEXT NOT NULL DEFAULT ('{}');
ALTER TABLE `Notification` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'TRANSACTIONAL';
ALTER TABLE `Notification` ADD COLUMN `jobStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING';
ALTER TABLE `Notification` ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Notification` ADD COLUMN `retryCycles` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Notification` ADD COLUMN `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
ALTER TABLE `Notification` ADD COLUMN `leaseUntil` DATETIME(3) ;
ALTER TABLE `Notification` ADD COLUMN `workerToken` VARCHAR(191) ;
ALTER TABLE `Notification` ADD COLUMN `lastAttemptAt` DATETIME(3) ;
ALTER TABLE `Notification` ADD COLUMN `lastError` VARCHAR(191) ;
CREATE INDEX `Notification_jobStatus_nextAttemptAt_idx` ON `Notification`(`jobStatus`,`nextAttemptAt`);
CREATE TABLE `EventChange` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY,
 `eventId` VARCHAR(191) NOT NULL,
 `requesterId` VARCHAR(191) NOT NULL,
 `reviewerId` VARCHAR(191),
 `kind` VARCHAR(191) NOT NULL DEFAULT 'DETAILS',
 `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
 `baseTermsVersion` INTEGER NOT NULL,
 `previousPaused` BOOLEAN NOT NULL,
 `reason` VARCHAR(191) NOT NULL,
 `reviewNotes` VARCHAR(191) NOT NULL DEFAULT '',
 `previousValues` TEXT NOT NULL,
 `proposedValues` TEXT NOT NULL,
 `affectedBookingIds` TEXT NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `reviewedAt` DATETIME(3),
 `effectiveAt` DATETIME(3),
 `notifiedAt` DATETIME(3),
 CONSTRAINT `EventChange_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE INDEX `EventChange_eventId_createdAt_idx` ON `EventChange`(`eventId`,`createdAt`);
CREATE INDEX `EventChange_status_createdAt_idx` ON `EventChange`(`status`,`createdAt`);
