-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `reviewHold` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PaymentReview` ADD COLUMN `receivedAmount` INTEGER NULL,
    ADD COLUMN `recipientVersionId` VARCHAR(191) NULL;

