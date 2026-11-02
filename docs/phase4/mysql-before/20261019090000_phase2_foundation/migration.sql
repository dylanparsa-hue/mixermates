-- AlterTable
ALTER TABLE `User` ADD COLUMN `securityVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `securityVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Event` ADD COLUMN `configurationStatus` VARCHAR(191) NOT NULL DEFAULT 'UNCONFIRMED',
    ADD COLUMN `invitationsEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `origin` VARCHAR(191) NOT NULL DEFAULT 'LEGACY_DEMO',
    ADD COLUMN `paymentDestinationId` VARCHAR(191) NULL,
    ADD COLUMN `reservedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sourceConfiguration` TEXT NOT NULL DEFAULT '{}',
    ADD COLUMN `stateVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `testOnly` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kuala_Lumpur';

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `approvalRequired` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `evidenceRequired` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `inventoryHeld` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `inventoryReleasedAt` DATETIME(3) NULL,
    ADD COLUMN `invitationGrantId` VARCHAR(191) NULL,
    ADD COLUMN `lifecycle` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `origin` VARCHAR(191) NOT NULL DEFAULT 'LEGACY_DEMO',
    ADD COLUMN `paymentRequired` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `paymentState` VARCHAR(191) NOT NULL DEFAULT 'AWAITING_PAYMENT',
    ADD COLUMN `recipientSnapshot` TEXT NULL,
    ADD COLUMN `recipientVersionId` VARCHAR(191) NULL,
    ADD COLUMN `registrationState` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `reservationCreatedAt` DATETIME(3) NULL,
    ADD COLUMN `reservationExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `testOnly` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `issuedAt` DATETIME(3) NULL,
    ADD COLUMN `origin` VARCHAR(191) NOT NULL DEFAULT 'LEGACY_DEMO',
    ADD COLUMN `revocationReason` VARCHAR(191) NULL,
    ADD COLUMN `revokedAt` DATETIME(3) NULL,
    ADD COLUMN `sequence` INTEGER NULL,
    ADD COLUMN `testOnly` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `confirmedAt` DATETIME(3) NULL,
    ADD COLUMN `origin` VARCHAR(191) NOT NULL DEFAULT 'LEGACY_DEMO',
    ADD COLUMN `workflowState` VARCHAR(191) NOT NULL DEFAULT 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `dedupeKey` VARCHAR(191) NULL,
    ADD COLUMN `deliveryChannel` VARCHAR(191) NOT NULL DEFAULT 'IN_APP',
    ADD COLUMN `deliveryStatus` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE `EventStaff` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canApproveRegistrations` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canCheckIn` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canReviewPayments` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canViewGuests` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canViewLocation` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `AdminAuditLog` ADD COLUMN `actorRole` VARCHAR(191) NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN `correlationId` VARCHAR(191) NULL,
    ADD COLUMN `entityType` VARCHAR(191) NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN `eventId` VARCHAR(191) NULL,
    ADD COLUMN `newState` VARCHAR(191) NULL,
    ADD COLUMN `previousState` VARCHAR(191) NULL,
    ADD COLUMN `reasonCode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `UserCapability` (
    `userId` VARCHAR(191) NOT NULL,
    `capability` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `capability`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `id` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RateLimitBucket_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `inviterId` VARCHAR(191) NOT NULL,
    `inviteeId` VARCHAR(191) NULL,
    `inviteeEmail` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `usageLimit` INTEGER NOT NULL DEFAULT 1,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EventInvitation_tokenHash_key`(`tokenHash`),
    INDEX `EventInvitation_eventId_status_idx`(`eventId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvitationGrant` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    INDEX `InvitationGrant_eventId_userId_status_idx`(`eventId`, `userId`, `status`),
    UNIQUE INDEX `InvitationGrant_invitationId_userId_key`(`invitationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentDestination` (
    `id` VARCHAR(191) NOT NULL,
    `organizerId` VARCHAR(191) NOT NULL,
    `methodType` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
    `activeVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRecipientVersion` (
    `id` VARCHAR(191) NOT NULL,
    `destinationId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `recipientName` VARCHAR(191) NOT NULL,
    `recipientReference` VARCHAR(191) NOT NULL,
    `qrAssetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `disabledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentRecipientVersion_destinationId_version_key`(`destinationId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `receiptUploadId` VARCHAR(191) NOT NULL,
    `submittedById` VARCHAR(191) NOT NULL,
    `recipientVersionId` VARCHAR(191) NULL,
    `expectedAmount` INTEGER NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'PAYMENT',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PROOF_SUBMITTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentEvidence_paymentId_receiptUploadId_key`(`paymentId`, `receiptUploadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentReview` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `evidenceId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `decision` VARCHAR(191) NOT NULL,
    `fundsVerified` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Ticket_bookingId_sequence_key` ON `Ticket`(`bookingId`, `sequence`);

-- CreateIndex
CREATE UNIQUE INDEX `Notification_dedupeKey_key` ON `Notification`(`dedupeKey`);

-- CreateIndex
CREATE INDEX `AdminAuditLog_eventId_createdAt_idx` ON `AdminAuditLog`(`eventId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_paymentDestinationId_fkey` FOREIGN KEY (`paymentDestinationId`) REFERENCES `PaymentDestination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_recipientVersionId_fkey` FOREIGN KEY (`recipientVersionId`) REFERENCES `PaymentRecipientVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_invitationGrantId_fkey` FOREIGN KEY (`invitationGrantId`) REFERENCES `InvitationGrant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCapability` ADD CONSTRAINT `UserCapability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_inviterId_fkey` FOREIGN KEY (`inviterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventInvitation` ADD CONSTRAINT `EventInvitation_inviteeId_fkey` FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationGrant` ADD CONSTRAINT `InvitationGrant_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `EventInvitation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationGrant` ADD CONSTRAINT `InvitationGrant_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationGrant` ADD CONSTRAINT `InvitationGrant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentDestination` ADD CONSTRAINT `PaymentDestination_organizerId_fkey` FOREIGN KEY (`organizerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentDestination` ADD CONSTRAINT `PaymentDestination_activeVersionId_fkey` FOREIGN KEY (`activeVersionId`) REFERENCES `PaymentRecipientVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecipientVersion` ADD CONSTRAINT `PaymentRecipientVersion_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `PaymentDestination`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecipientVersion` ADD CONSTRAINT `PaymentRecipientVersion_qrAssetId_fkey` FOREIGN KEY (`qrAssetId`) REFERENCES `FileUpload`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRecipientVersion` ADD CONSTRAINT `PaymentRecipientVersion_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvidence` ADD CONSTRAINT `PaymentEvidence_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvidence` ADD CONSTRAINT `PaymentEvidence_receiptUploadId_fkey` FOREIGN KEY (`receiptUploadId`) REFERENCES `FileUpload`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvidence` ADD CONSTRAINT `PaymentEvidence_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvidence` ADD CONSTRAINT `PaymentEvidence_recipientVersionId_fkey` FOREIGN KEY (`recipientVersionId`) REFERENCES `PaymentRecipientVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentReview` ADD CONSTRAINT `PaymentReview_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentReview` ADD CONSTRAINT `PaymentReview_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `PaymentEvidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentReview` ADD CONSTRAINT `PaymentReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Quarantine all legacy origins. Backfill state labels, not financial legitimacy.
UPDATE `Booking` SET `lifecycle`=CASE WHEN `status`='APPROVED' THEN 'CONFIRMED' WHEN `status`='PENDING_REVIEW' THEN 'PENDING' ELSE 'CANCELLED' END, `paymentRequired`=(`total`>0), `approvalRequired`=1, `paymentState`=CASE WHEN `total`=0 THEN 'NOT_REQUIRED' WHEN `paymentStatus`='SUCCEEDED' THEN 'CONFIRMED' WHEN `paymentStatus`='REFUNDED' THEN 'REFUNDED' ELSE 'AWAITING_PAYMENT' END, `registrationState`=CASE WHEN `status`='APPROVED' THEN 'APPROVED' WHEN `status`='REJECTED' THEN 'REJECTED' WHEN `status`='CANCELLED' THEN 'CANCELLED' ELSE 'PENDING' END WHERE `origin`='LEGACY_DEMO' AND `lifecycle`='DRAFT';
UPDATE `Payment` SET `workflowState`=CASE WHEN `status`='SUCCEEDED' THEN 'CONFIRMED' WHEN `status`='REFUNDED' THEN 'REFUNDED' ELSE 'AWAITING_PAYMENT' END WHERE `origin`='LEGACY_DEMO';
UPDATE `Event` SET `reservedCount`=COALESCE((SELECT SUM(`sold`) FROM `EventTicketTier` WHERE `EventTicketTier`.`eventId`=`Event`.`id`),0);
