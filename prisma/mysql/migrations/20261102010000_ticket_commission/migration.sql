-- Additive only: old bookings and subscription records stay untouched.
ALTER TABLE `Event` ADD COLUMN `platformFeePolicy` VARCHAR(191) NOT NULL DEFAULT 'ABSORB';
ALTER TABLE `Payment` ADD COLUMN `gatewayFee` INTEGER NULL;
ALTER TABLE `Payment` ADD COLUMN `gatewayFeeSource` VARCHAR(191) NULL;
CREATE TABLE `BookingFeeSnapshot` (
 `bookingId` VARCHAR(191) NOT NULL PRIMARY KEY,
 `modelVersion` INTEGER NOT NULL DEFAULT 1,
 `eventVersion` INTEGER NOT NULL,
 `policy` VARCHAR(191) NOT NULL,
 `rateBps` INTEGER NOT NULL,
 `faceValue` INTEGER NOT NULL,
 `discount` INTEGER NOT NULL,
 `platformFee` INTEGER NOT NULL,
 `customerTotal` INTEGER NOT NULL,
 `organizerBeforeGateway` INTEGER NOT NULL,
 `refundFeePolicy` VARCHAR(191) NOT NULL DEFAULT 'PENDING_APPROVED_TERMS',
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (`bookingId`) REFERENCES `Booking` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CommissionEntry` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY,
 `bookingId` VARCHAR(191) NOT NULL,
 `sourceKey` VARCHAR(191) NOT NULL,
 `kind` VARCHAR(191) NOT NULL,
 `amount` INTEGER NOT NULL,
 `refundAmount` INTEGER NOT NULL DEFAULT 0,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (`bookingId`) REFERENCES `Booking` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE UNIQUE INDEX `CommissionEntry_sourceKey_key` ON `CommissionEntry` (`sourceKey`);
CREATE INDEX `CommissionEntry_bookingId_kind_idx` ON `CommissionEntry` (`bookingId`, `kind`);
