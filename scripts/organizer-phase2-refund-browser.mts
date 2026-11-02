import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { simulatorEnvironment } from "../lib/simulator-policy";
assert(simulatorEnvironment());
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase2";
const f = JSON.parse(await readFile(out + "/browser-results.json", "utf8"));
let bookingId = f.bookingId;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const c = await browser.newContext({
  viewport: { width: 390, height: 900 },
  reducedMotion: "reduce",
});
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage();
const errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
async function booking() {
  const r = await c.request.get(base + "/api/customer/booking/" + bookingId);
  assert(r.ok());
  return r.json();
}
try {
  await p.goto(base + "/");
  await p.waitForURL(/\/explore$/);
  const setup = await (await c.request.get(base + "/api/setup")).json();
  const e = setup.events.find((e: any) => e.slug === f.slug);
  const reserved = await c.request.post(base + "/api/customer/reserve", {
    headers: { Origin: base },
    data: {
      eventId: e.id,
      tierId: e.tiers[0].id,
      quantity: 2,
      answers: {},
      idempotencyKey: crypto.randomUUID(),
    },
  });
  assert(reserved.ok());
  bookingId = (await reserved.json()).id;
  const payment = await c.request.post(
    base + "/api/customer/simulator/payment",
    {
      headers: { Origin: base },
      data: {
        bookingId,
        outcome: "SUCCESS",
        idempotencyKey: crypto.randomUUID(),
      },
    },
  );
  assert(payment.ok());
  await p.goto(base + "/bookings/" + bookingId);
  await expect(
    p.getByRole("heading", { name: "Test Payment Successful", exact: true }),
  ).toBeVisible();
  await p.locator("details.simulator-refund > summary").click();
  await p
    .getByLabel("Refund amount (MYR, leave blank for remaining balance)", {
      exact: true,
    })
    .fill("50.00");
  await p
    .getByRole("button", { name: "Request TEST refund", exact: true })
    .click();
  await expect(
    p.getByRole("button", { name: "Simulate TEST refund", exact: true }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Simulate TEST refund", exact: true })
    .click();
  await expect(
    p.getByRole("heading", {
      name: "Partial test refund confirmed",
      exact: true,
    }),
  ).toBeVisible();
  let b = await booking();
  assert.equal(b.paymentState, "PARTIALLY_REFUNDED");
  assert.equal(b.refunds[0].amount, 5000);
  assert(b.tickets.every((t: any) => t.status === "REVOKED"));
  await p.screenshot({ path: out + "/partial-refund-390.png", fullPage: true });
  const details = p.locator("details.simulator-refund");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  await p
    .getByRole("button", { name: "Request TEST refund", exact: true })
    .click();
  await expect(
    p.getByRole("button", { name: "Simulate TEST refund", exact: true }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Simulate TEST refund", exact: true })
    .click();
  await expect(
    p.getByRole("heading", { name: "Test refund successful", exact: true }),
  ).toBeVisible();
  b = await booking();
  assert.equal(b.paymentState, "REFUNDED");
  assert.equal(
    b.refunds
      .filter((r: any) => r.status === "REFUND_CONFIRMED")
      .reduce((n: number, r: any) => n + r.amount, 0),
    21000,
  );
  await expect(p.locator(".simulator-summary")).toContainText("Total refunded");
  await p.screenshot({
    path: out + "/full-refund-after-partial-390.png",
    fullPage: true,
  });
  const r = await c.request.get(base + "/api/financial-summary"),
    s = await r.json();
  assert.equal(s.sandbox.collected, 0);
  assert(s.sandbox.refundFeeReview >= 1000);
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/refund-browser-results.json",
    JSON.stringify(
      {
        checks: [
          "Partial RM50 refund from the normal booking form records exact cash and revokes both unused tickets.",
          "Remaining RM160 refund completes the original RM210 payment without over-refund.",
          "Refunded amounts are visible; commission stays under fee-policy review and collected remains zero.",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("3 refund browser checks passed");
} finally {
  await browser.close();
}
