import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard";
import { db } from "../lib/db";
assert(testLabEnvironment());
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }),
  p = await c.newPage(),
  base = process.env.APP_ORIGIN!;
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
try {
  const code = JSON.parse(
    await readFile(".local/test-lab-access.json", "utf8"),
  );
  assert(
    (
      await c.request.post(base + "/api/test-lab/login", {
        headers: { Origin: base },
        data: { code: code.accessCode },
      })
    ).ok(),
  );
  const suffix = Date.now().toString(36),
    r = await c.request.post(base + "/api/register", {
      headers: { Origin: base },
      data: {
        name: "Fictional first organizer",
        username: "first_" + suffix,
        email: "first_" + suffix + "@example.test",
        password: "FictionalLocal!2026",
        dob: "1995-01-01",
        city: "Kuala Lumpur",
      },
    });
  assert(r.ok(), await r.text());
  const user = await r.json();
  assert.equal(
    await db.organizerIdentity.count({ where: { userId: user.id } }),
    0,
  );
  await p.goto(base + "/explore");
  await p.getByRole("button", { name: "Create Event", exact: true }).click();
  await expect(p.locator("#title")).toBeVisible();
  const me = await (await c.request.get(base + "/api/me")).json();
  assert.equal(me.user.id, user.id);
  assert.equal(me.user.role, "ATTENDEE");
  assert(me.user.capabilities.includes("ORGANIZER"));
  assert.equal(
    await db.organizerIdentity.count({ where: { userId: user.id } }),
    1,
  );
  assert.equal(
    await db.organizerSubscription.count({ where: { userId: user.id } }),
    0,
  );
  assert.equal(
    await p
      .getByRole("heading", { name: "Become an Organizer", exact: true })
      .count(),
    0,
  );
  await writeFile(
    "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1/account-entry-results.json",
    JSON.stringify(
      {
        passed: true,
        normalCustomerSignup: true,
        clickedCreateEvent: true,
        sameUser: true,
        roleUnchanged: true,
        organizerIdentities: 1,
        subscriptions: 0,
        separateOrganizerForm: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Fresh customer clicked Create Event and entered the wizard on the same identity.",
  );
} finally {
  await browser.close();
  await db.$disconnect();
}
