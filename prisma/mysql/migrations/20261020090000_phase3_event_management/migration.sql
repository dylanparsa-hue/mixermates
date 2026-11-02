-- AlterTable
ALTER TABLE `Event` ADD COLUMN `creationKey` VARCHAR(191) NULL,
    ADD COLUMN `entryOptions` TEXT NOT NULL DEFAULT ('[]'),
    ADD COLUMN `guestListVisibility` VARCHAR(191) NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN `idCheckRequired` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `locationVisibility` VARCHAR(191) NOT NULL DEFAULT 'HIDDEN',
    ADD COLUMN `reviewNotes` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `reviewOutcome` VARCHAR(191) NOT NULL DEFAULT 'NONE',
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL,
    ADD COLUMN `shortDescription` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `subcategory` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `submittedAt` DATETIME(3) NULL,
    ADD COLUMN `supportingImages` TEXT NOT NULL DEFAULT ('[]');

-- AlterTable
ALTER TABLE `EventTicketTier` ADD COLUMN `availability` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'MYR',
    ADD COLUMN `minPerOrder` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `EventRegistrationField` ADD COLUMN `condition` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `OrganizerVerification` ADD COLUMN `reviewNotes` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL,
    ADD COLUMN `testOnly` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `PaymentDestination` ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PaymentRecipientVersion` ADD COLUMN `displayName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `instructions` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `organizerReference` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `reviewNotes` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `testOnly` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `verificationProcedure` TEXT NOT NULL DEFAULT ('');

-- CreateIndex
CREATE UNIQUE INDEX `Event_creationKey_key` ON `Event`(`creationKey`);


UPDATE Event SET locationVisibility = 'PUBLIC' WHERE access = 'PUBLIC';
