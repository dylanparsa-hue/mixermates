ALTER TABLE "Event" ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'ORGANIZER_QR';
CREATE TABLE "SimulationAttempt" ("id" TEXT NOT NULL PRIMARY KEY,"idempotencyKey" TEXT NOT NULL,"reference" TEXT NOT NULL,"paymentId" TEXT NOT NULL,"refundId" TEXT,"kind" TEXT NOT NULL,"outcome" TEXT NOT NULL,"testOnly" BOOLEAN NOT NULL DEFAULT true,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "SimulationAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "SimulationAttempt_idempotencyKey_key" ON "SimulationAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "SimulationAttempt_reference_key" ON "SimulationAttempt"("reference");
CREATE INDEX "SimulationAttempt_paymentId_kind_outcome_idx" ON "SimulationAttempt"("paymentId","kind","outcome");
