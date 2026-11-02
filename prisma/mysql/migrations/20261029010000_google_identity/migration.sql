CREATE TABLE `OAuthAccount` (
 `id` VARCHAR(191) NOT NULL, `provider` VARCHAR(191) NOT NULL, `subject` VARCHAR(191) NOT NULL,
 `userId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE INDEX `OAuthAccount_provider_subject_key`(`provider`, `subject`),
 UNIQUE INDEX `OAuthAccount_userId_provider_key`(`userId`, `provider`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE `GoogleAuthFlow` (
 `id` VARCHAR(191) NOT NULL, `bindingHash` VARCHAR(191) NOT NULL, `nonceHash` VARCHAR(191) NOT NULL,
 `verifier` VARCHAR(191) NOT NULL, `purpose` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NULL,
 `securityVersion` INTEGER NULL, `status` VARCHAR(191) NOT NULL DEFAULT 'STARTED',
 `subject` VARCHAR(191) NULL, `email` VARCHAR(191) NULL, `name` VARCHAR(191) NULL,
 `expiresAt` DATETIME(3) NOT NULL, INDEX `GoogleAuthFlow_expiresAt_idx`(`expiresAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
