import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import {
  activateFictionalSubscription,
  cancelFictionalSubscription,
  organizerSubscription,
} from "../lib/organizer-subscriptions";
import { activateOrganizer } from "../lib/organizer-identity";
import { randomUUID } from "node:crypto";
import { subscriptionPeriod } from "../lib/organizer-plans";
test("historical month-end subscription dates remain decodable for accounting", () => {
  const p = subscriptionPeriod(
    new Date("2028-01-31T15:30:00Z"),
    new Date("2028-02-29T15:30:00Z"),
  );
  assert.equal(p.end.toISOString(), "2028-03-31T15:30:00.000Z");
});
test("retired subscriptions cannot be activated, renewed or cancelled through obsolete flows", async () => {
  await assert.rejects(
    activateFictionalSubscription("unknown", "PRO"),
    /410:.*retired/,
  );
  await assert.rejects(cancelFictionalSubscription("unknown"), /410:.*retired/);
});
test("free activation preserves an expired real-marked subscription unchanged and never renews it", async () => {
  const id = "retired-" + randomUUID();
  await db.user.create({
    data: {
      id,
      email: id + "@example.test",
      username: id.slice(0, 24),
      name: "TEST Historical account",
      passwordHash: "disabled",
      dob: new Date("1990-01-01"),
      city: "Test",
    },
  });
  const old = await db.organizerSubscription.create({
    data: {
      userId: id,
      plan: "PRO",
      testOnly: false,
      anchorAt: new Date("2026-01-01"),
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-02-01"),
    },
  });
  await activateOrganizer(id);
  assert.equal(await organizerSubscription(id), null);
  assert.deepEqual(
    await db.organizerSubscription.findUnique({ where: { userId: id } }),
    old,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id } })).role,
    "ATTENDEE",
  );
  // Retain this fictional historical record and audit trail in the isolated fixture.
});
