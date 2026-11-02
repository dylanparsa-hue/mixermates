import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment());
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes",
  storageState = JSON.parse(
    await readFile(".local/ui-fixes-session.json", "utf8"),
  ),
  scenarios = JSON.parse(
    await readFile(".local/ui-fixes-scenarios.json", "utf8"),
  );
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
    storageState,
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage(),
  checks = [],
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  for (const e of scenarios.filter((e) => e.key !== "paid")) {
    if (e.key === "private") {
      await p.goto(base + "/explore");
      await p.locator(".lab-review-tools summary").click();
      await p
        .getByRole("button", { name: "Private TEST invitation", exact: true })
        .click();
    } else {
      await p.goto(base + "/events/" + e.slug);
      await p
        .getByRole("button", { name: "Book TEST tickets", exact: true })
        .click();
    }
    await p.locator(".customer-tier input").first().waitFor();
    const tier = p
      .locator(".customer-tier input")
      .nth(e.key === "tiers" ? 1 : 0);
    await tier.check();
    await p
      .getByRole("button", { name: "Continue to your details", exact: true })
      .click();
    await p
      .getByLabel("Full name as on IC", { exact: true })
      .fill("Alex Fictional Test");
    await p
      .getByRole("button", { name: "Review registration", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Submit registration", exact: true })
      .click();
    await p.waitForURL(/\/bookings\/[^/]+$/);
    const id = p.url().split("/").at(-1),
      r = await c.request.get(base + "/api/customer/booking/" + id);
    assert(r.ok());
    const booked = await r.json();
    assert.equal(booked.event.id, e.id);
    if (e.key === "tiers") {
      assert.equal(booked.total, 6500);
      assert.equal(booked.tier.name, "Balcony");
    }
    if (e.key === "free") {
      assert.equal(booked.total, 0);
      assert(booked.tickets.length);
    } else assert.equal(booked.tickets.length, 0);
    checks.push(
      e.key +
        ": normal UI reservation, correct pricing and authorized ticket state",
    );
    console.log(checks.at(-1));
  }
  assert.equal(errors.length, 0);
} finally {
  await writeFile(
    out + "/scenario-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  await b.close();
}
