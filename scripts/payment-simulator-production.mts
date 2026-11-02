import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { simulatorEnvironment } from "../lib/simulator-policy";
import { db } from "../lib/db";
assert.equal(process.env.NODE_ENV, "production");
assert.equal(simulatorEnvironment(), false);
const base = process.env.APP_ORIGIN!,
  checks: string[] = [];
assert.equal(base, "http://localhost:3084");
assert(
  process.env.DATABASE_URL?.includes(
    "/payment-simulator-regression-20261102/prisma/audit.db",
  ),
);
const before = await db.simulationAttempt.count();
for (const method of ["GET", "POST"])
  for (const route of [
    "customer/simulator/payment",
    "customer/simulator/refund",
    "customer/simulator/receipt",
    "customer/simulator/scenarios",
    "test-lab/login",
    "test-lab/enter",
    "test-lab/state",
  ]) {
    const r = await fetch(base + "/api/" + route, {
      method,
      headers: { Origin: base, "Content-Type": "application/json" },
      ...(method === "POST"
        ? {
            body: JSON.stringify({
              bookingId: "fictional",
              outcome: "SUCCESS",
              idempotencyKey: crypto.randomUUID(),
              paymentSuccessful: true,
            }),
          }
        : {}),
    });
    assert.equal(r.status, 404, method + " " + route);
    checks.push(method + " /api/" + route + " → 404");
  }
const page = await fetch(base + "/", { redirect: "manual" });
assert.equal(page.status, 307);
assert.match(page.headers.get("location")!, /coming-soon/);
assert.equal(await db.simulationAttempt.count(), before);
await writeFile(
  "/Users/parsa/Desktop/EVENT FINDER/docs/payment-simulator/production-refusal-results.json",
  JSON.stringify(
    {
      passed: true,
      checks,
      noSimulatorWrites: true,
      comingSoonPreserved: true,
      environment:
        "Optimized production build on loopback with all simulator enable flags deliberately set; fictional regression DB only.",
    },
    null,
    2,
  ),
);
console.log(
  "14 production simulator/Test Lab requests returned 404; no simulator writes; Coming Soon preserved.",
);
await db.$disconnect();
