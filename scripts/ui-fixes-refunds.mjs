import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment());
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes";
const a = JSON.parse(await readFile(".local/test-lab-access.json", "utf8")),
  scenarios = JSON.parse(
    await readFile(".local/ui-fixes-scenarios.json", "utf8"),
  ),
  paid = scenarios.find((e) => e.key === "paid");
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
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
const add = (s) => {
  checks.push(s);
  console.log(s);
};
const get = async (path) => (await c.request.get(base + "/api/" + path)).json();
const post = async (path, data) =>
  c.request.post(base + "/api/" + path, { headers: { Origin: base }, data });
await post("test-lab/login", { code: a.accessCode });
const bookings = await get("customer/bookings"),
  booking = bookings.find(
    (e) =>
      e.event.id === paid.id &&
      e.tickets.some((t) => t.status === "ACTIVE") &&
      e.lifecycle === "CONFIRMED",
  );
assert(booking, "An unadmitted paid fixture booking is required");
async function workspace(value) {
  await Promise.all([
    p.waitForNavigation({ waitUntil: "domcontentloaded" }),
    p
      .getByRole("combobox", { name: "Workspace", exact: true })
      .selectOption(value),
  ]);
}
try {
  await p.goto(base + "/my-bookings");
  await p.getByText("Refund requests", { exact: true }).click();
  let section = p.locator('.operations[aria-label="Refunds"]');
  await section.locator("input[name=bookingId]").fill(booking.id);
  await section
    .locator("textarea[name=reason]")
    .fill("Fictional local refund rehearsal. No real funds.");
  await section
    .getByRole("button", { name: "Request refund review", exact: true })
    .click();
  let row = section.locator(".ops-record").filter({ hasText: booking.id });
  await expect(row).toContainText("requested");
  add("Customer requests a refund through normal ticket history");
  await workspace("Admin");
  await p.goto(base + "/admin?tab=Refunds");
  section = p.locator('.operations[aria-label="Refunds"]');
  row = section.locator(".ops-record").filter({ hasText: booking.id });
  for (const status of [
    "APPROVED",
    "AWAITING_ORGANIZER_TRANSFER",
    "TRANSFER_REPORTED",
  ]) {
    await row.locator("select[name=status]").selectOption(status);
    await row
      .locator("textarea[name=notes]")
      .fill(
        "Fictional independent " +
          status.toLowerCase().replaceAll("_", " ") +
          ". No actual money moves.",
      );
    if (status === "TRANSFER_REPORTED")
      await row
        .locator("input[name=transferReference]")
        .fill("FICTIONAL-TRANSFER-RECORD-NO-MONEY");
    if (status === "APPROVED") p.once("dialog", (d) => d.accept());
    const r = p.waitForResponse(
      (r) =>
        r.url().endsWith("/api/operations/refund-review") &&
        r.request().method() === "POST",
    );
    await row
      .getByRole("button", { name: "Update refund request", exact: true })
      .click();
    assert((await r).ok());
    await expect(row).toContainText(status.toLowerCase().replaceAll("_", " "));
    add(
      "Independent admin records " +
        status.toLowerCase().replaceAll("_", " ") +
        " in normal refund screen",
    );
  }
  const revoked = await get("operations");
  assert(
    revoked.refunds.some(
      (r) =>
        r.payment.booking.id === booking.id && r.status === "TRANSFER_REPORTED",
    ),
  );
  await workspace("Customer");
  await p.goto(base + "/my-bookings");
  await p.getByText("Refund requests", { exact: true }).click();
  section = p.locator('.operations[aria-label="Refunds"]');
  row = section.locator(".ops-record").filter({ hasText: booking.id });
  await row
    .locator("textarea[name=notes]")
    .fill(
      "Fictional recipient record checked. No real refund or bank transfer.",
    );
  await row.getByRole("checkbox").check();
  await row
    .getByRole("button", { name: "Confirm refund received", exact: true })
    .click();
  await expect(row).toContainText("refund confirmed");
  const refunded = await get("customer/booking/" + booking.id);
  assert(refunded.tickets.every((t) => t.status === "REVOKED"));
  add(
    "Customer alone acknowledges fictional refund receipt; ticket stays revoked",
  );
  await p.screenshot({
    path: out + "/journey/refund-mobile.png",
    fullPage: true,
  });
  const denied = await post("test-lab/activate-organizer", {
    plan: "STARTER",
    role: "ADMIN",
  });
  assert.equal(denied.status(), 400);
  const cross = await c.request.post(base + "/api/test-lab/workspace", {
    headers: { Origin: "https://invalid.example" },
    data: { workspace: "Admin" },
  });
  assert.equal(cross.status(), 404);
  add(
    "Forged activation fields and cross-origin workspace mutations fail closed",
  );
  assert.equal(errors.length, 0);
  await writeFile(
    ".local/ui-fixes-session.json",
    JSON.stringify(await c.storageState()),
    { mode: 0o600 },
  );
} finally {
  await writeFile(
    out + "/refund-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  await b.close();
}
