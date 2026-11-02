-- Additive only: old bookings and subscription records stay untouched.
ALTER TABLE `Event` ADD COLUMN `platformFeePolicy` TEXT NOT NULL DEFAULT 'ABSORB';
ALTER TABLE `Payment` ADD COLUMN `gatewayFee` INTEGER NULL;
ALTER TABLE `Payment` ADD COLUMN `gatewayFeeSource` TEXT NULL;
CREATE TABLE `BookingFeeSnapshot` (
 `bookingId` TEXT NOT NULL PRIMARY KEY,
 `modelVersion` INTEGER NOT NULL DEFAULT 1,
 `eventVersion` INTEGER NOT NULL,
 `policy` TEXT NOT NULL,
 `rateBps` INTEGER NOT NULL,
 `faceValue` INTEGER NOT NULL,
 `discount` INTEGER NOT NULL,
 `platformFee` INTEGER NOT NULL,
 `customerTotal` INTEGER NOT NULL,
 `organizerBeforeGateway` INTEGER NOT NULL,
 `refundFeePolicy` TEXT NOT NULL DEFAULT 'PENDING_APPROVED_TERMS',
 `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (`bookingId`) REFERENCES `Booking` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE `CommissionEntry` (
 `id` TEXT NOT NULL PRIMARY KEY,
 `bookingId` TEXT NOT NULL,
 `sourceKey` TEXT NOT NULL,
 `kind` TEXT NOT NULL,
 `amount` INTEGER NOT NULL,
 `refundAmount` INTEGER NOT NULL DEFAULT 0,
 `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (`bookingId`) REFERENCES `Booking` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX `CommissionEntry_sourceKey_key` ON `CommissionEntry` (`sourceKey`);
CREATE INDEX `CommissionEntry_bookingId_kind_idx` ON `CommissionEntry` (`bookingId`, `kind`);
