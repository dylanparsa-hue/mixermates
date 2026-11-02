import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { reserveBooking } from "../lib/booking-domain";
import { simulatorEnvironment } from "../lib/simulator-policy";
assert.equal(process.env.NODE_ENV, "production");
assert.equal(
  process.cwd(),
  "/Users/parsa/.codex/tmp/mixermates-phase2-20261102/build",
);
assert.equal(process.env.APP_ORIGIN, "http://localhost:3086");
assert.equal(simulatorEnvironment(), false);
const before = [
  await db.booking.count(),
  await db.bookingFeeSnapshot.count(),
  await db.commissionEntry.count(),
  await db.simulationAttempt.count(),
];
const checks: string[] = [];
await assert.rejects(
  reserveBooking("fictional", {
    eventId: "fictional",
    tierId: "fictional",
    quantity: 1,
    idempotencyKey: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 3600000),
  }),
  /503:Real ticket sales remain disabled/,
);
for (const method of ["GET", "POST"])
  for (const path of [
    "customer/simulator/payment",
    "customer/simulator/refund",
    "customer/simulator/receipt",
    "customer/simulator/scenarios",
    "test-lab/login",
    "test-lab/enter",
    "test-lab/activate-organizer",
  ]) {
    const r = await fetch(process.env.APP_ORIGIN + "/api/" + path, {
      method,
      headers: {
        Origin: process.env.APP_ORIGIN,
        "Content-Type": "application/json",
      },
      ...(method === "POST"
        ? {
            body: JSON.stringify({
              bookingId: "fictional",
              outcome: "SUCCESS",
              idempotencyKey: crypto.randomUUID(),
              platformFee: 0,
              plan: "PRO",
            }),
          }
        : {}),
    });
    assert.equal(r.status, 404, method + " " + path);
    checks.push(method + " " + path + " → 404");
  }
const summary = await fetch(process.env.APP_ORIGIN + "/api/financial-summary");
assert.equal(summary.status, 401);
const home = await fetch(process.env.APP_ORIGIN, { redirect: "manual" });
assert.equal(home.status, 307);
assert.match(home.headers.get("location")!, /coming-soon/);
assert.deepEqual(
  [
    await db.booking.count(),
    await db.bookingFeeSnapshot.count(),
    await db.commissionEntry.count(),
    await db.simulationAttempt.count(),
  ],
  before,
);
await writeFile(
  "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase2/production-refusal-results.json",
  JSON.stringify(
    {
      localOnly: true,
      checks,
      unauthenticatedFinanceDenied: true,
      domainRealSalesDenied: true,
      noBookingSnapshotCommissionOrSimulatorWrites: true,
      comingSoonPreserved: true,
    },
    null,
    2,
  ),
);
console.log(
  "14 loopback production-mode adapter refusals; finance authorization and real-sales guard pass; zero financial writes.",
);
await db.$disconnect();
