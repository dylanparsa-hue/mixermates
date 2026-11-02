warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- AlterTable
ALTER TABLE `Refund` MODIFY `reason` TEXT NOT NULL DEFAULT '',
    MODIFY `decisionNotes` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `Report` MODIFY `response` TEXT NOT NULL DEFAULT '';

