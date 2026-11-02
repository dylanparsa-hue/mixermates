-- Stored organizer discount; never a client-supplied checkout reduction.
ALTER TABLE `EventTicketTier` ADD COLUMN `discount` INTEGER NOT NULL DEFAULT 0;
