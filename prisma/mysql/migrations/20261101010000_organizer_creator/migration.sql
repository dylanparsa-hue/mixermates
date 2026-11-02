ALTER TABLE `Event` ADD COLUMN `coverImage` VARCHAR(500) NOT NULL DEFAULT '';
CREATE TABLE `OrganizerIdentity` (
 `userId` VARCHAR(191) NOT NULL,
 `slug` VARCHAR(191) NOT NULL,
 `name` VARCHAR(191) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`userId`), UNIQUE INDEX `OrganizerIdentity_slug_key` (`slug`),
 CONSTRAINT `OrganizerIdentity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `EventCreatorState` (
 `eventId` VARCHAR(191) NOT NULL,
 `payload` LONGTEXT NOT NULL,
 `validatedThrough` INTEGER NOT NULL DEFAULT -1,
 PRIMARY KEY (`eventId`),
 CONSTRAINT `EventCreatorState_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
