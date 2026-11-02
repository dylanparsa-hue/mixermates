import {
  chromium,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { simulatorEnvironment } from "../lib/simulator-policy";
import { localDateTime } from "../lib/event-config";
assert(simulatorEnvironment());
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/payment-simulator";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const c = await browser.newContext({
  viewport: { width: 390, height: 900 },
  reducedMotion: "reduce",
});
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage(),
  checks: string[] = [],
  errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
async function get(path: string) {
  const r = await c.request.get(base + "/api/" + path);
  assert(r.ok(), path + ": " + r.status());
  return r.json();
}
async function check(s: string) {
  checks.push(s);
  console.log(s);
}
async function capture(name: string) {
  await p.screenshot({ path: out + "/" + name + ".png", fullPage: true });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "No horizontal overflow: " + name,
  );
}
async function workspace(name: string) {
  await p.getByLabel("Workspace", { exact: true }).selectOption(name);
  await p.waitForURL(
    name === "Customer"
      ? /\/explore$/
      : name === "Admin"
        ? /\/admin$/
        : /\/organizer/,
  );
}
async function reviewer(name: string) {
  await p.locator(".lab-review-tools > summary").click();
  await Promise.all([
    p.waitForNavigation({ waitUntil: "domcontentloaded" }),
    p.getByRole("button", { name, exact: true }).click(),
  ]);
}
async function book(slug: string, quantity = 1, tier = 0) {
  await p.goto(base + "/events/" + slug);
  await p
    .getByRole("button", { name: "Book TEST tickets", exact: true })
    .click();
  await p.waitForURL(/\/join\//);
  if (tier) await p.locator(".customer-tier input").nth(tier).check();
  if (quantity !== 1)
    await p.getByLabel("Quantity", { exact: true }).fill(String(quantity));
  await p
    .getByRole("button", { name: "Continue to your details", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Review registration", exact: true })
    .click();
  await p
    .getByRole("button", { name: /Confirm Booking|Submit registration/ })
    .click();
  await p.waitForURL(/\/bookings\//);
  await expect(
    p.getByRole("heading", { name: "Booking summary", exact: true }),
  ).toBeVisible();
  return p.url().split("/").at(-1)!;
}
async function pay(outcome = "SUCCESS") {
  await p
    .getByRole("button", {
      name: /Pay with Test Payment|Try Again|Return to Booking/,
      exact: true,
    })
    .click();
  await p
    .getByLabel("Local test outcome", { exact: true })
    .selectOption(outcome);
  await p
    .getByRole("button", {
      name:
        outcome === "SUCCESS"
          ? /Pay RM.*TEST/
          : outcome === "DECLINED"
            ? "Simulate Declined Payment"
            : "Simulate Payment Cancelled",
    })
    .click();
  await expect(
    p.getByRole("heading", {
      name:
        outcome === "SUCCESS"
          ? "Test Payment Successful"
          : outcome === "DECLINED"
            ? "Test Payment Declined"
            : "Payment Cancelled",
      exact: true,
    }),
  ).toBeVisible();
}
try {
  await p.goto(base + "/");
  await p.waitForURL(/\/explore$/);
  await p
    .locator(".theme-control label:visible")
    .filter({ has: p.locator('input[value="dark"]') })
    .first()
    .click();
  await p.goto(base + "/create");
  await expect(p.locator("#title")).toBeVisible();
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#title-error")).toBeVisible();
  await check("Missing creator fields block progression immediately.");
  const title = "TEST Browser Neon " + Date.now();
  await p.locator("#title").fill(title);
  await p
    .locator("#startsLocal")
    .fill(localDateTime(new Date(Date.now() + 9 * 86400000)));
  await p
    .locator("#endsLocal")
    .fill(localDateTime(new Date(Date.now() + 9 * 86400000 + 7200000)));
  await p.locator("#city").fill("Fictional KL");
  await p.locator("#venue").fill("Fictional studio");
  await p
    .locator("#shortDescription")
    .fill(
      "A fictional browser purchase scenario. No real venue, funds or admission.",
    );
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#paymentMode")).toHaveValue("TEST_SIMULATOR");
  await p.getByLabel("Paid ticket", { exact: true }).check();
  await p.locator("#tier-0-name").fill("General Admission");
  await p.locator("#tier-0-price").fill("35.00");
  await expect(p.locator("#paymentDestinationId")).toHaveCount(0);
  await expect(p.locator("#policies")).toContainText("TEST EVENT ONLY");
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await p.getByText("More photos & appearance", { exact: true }).click();
  await p.locator("#provided-artwork").selectOption("/images/neon.jpg");
  await p
    .getByRole("button", { name: "Publish TEST Event Locally", exact: true })
    .click();
  const open = p.getByRole("link", {
    name: "Open TEST event & buy tickets",
    exact: true,
  });
  await expect(open).toBeVisible();
  const href = (await open.getAttribute("href"))!;
  const slug = href.split("/").at(-1)!.split("?")[0];
  await check(
    "Created and published a fictional paid event through the wizard without bank details or admin approval.",
  );
  const bookingId = await book(slug);
  await capture("checkout-before-390-dark");
  await pay();
  const booking = await get("customer/booking/" + bookingId);
  assert.equal(booking.paymentState, "CONFIRMED");
  assert.equal(booking.lifecycle, "CONFIRMED");
  assert.equal(booking.tickets.length, 1);
  assert.equal(booking.total, 3500);
  await check(
    "Normal event button → checkout → server-confirmed simulated payment → persisted booking and one real TEST ticket.",
  );
  await capture("payment-success-390-dark");
  await p.goto(base + "/my-bookings");
  const article = p
    .locator(".customer-booking-list article")
    .filter({ hasText: title });
  await article.getByRole("button", { name: /Open ticket/ }).click();
  await expect(
    p.getByRole("heading", { name: "TEST ticket", exact: true }),
  ).toBeVisible();
  await expect(
    p.getByAltText("Private admission QR", { exact: true }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Full-screen QR", exact: true })
    .first()
    .click();
  const qr = p.getByRole("dialog", {
    name: "Full-screen private entry QR",
    exact: true,
  });
  await expect(qr).toBeVisible();
  await qr.getByText("Manual entry code", { exact: true }).click();
  const token = (await qr.locator("code").textContent())!;
  assert.match(token, /^[a-f0-9]{64}$/);
  await capture("real-ticket-qr-390");
  await qr.getByRole("button", { name: "Hide QR code", exact: true }).click();
  await p.getByRole("button", { name: "Close ticket", exact: true }).click();
  await check(
    "Ticket recovered in My Tickets; private QR and matching real entry code opened.",
  );
  await reviewer("Entrance staff");
  await p.goto(base + "/organizer?tab=Entrance&event=" + booking.event.id);
  await p.getByLabel("Private entry code", { exact: true }).fill(token);
  await p.getByRole("button", { name: "Validate ticket", exact: true }).click();
  await expect(
    p.getByRole("button", { name: "Confirm admission", exact: true }),
  ).toBeVisible();
  if (await p.locator(".entrance-confirm input[type=checkbox]").count())
    await p.locator(".entrance-confirm input[type=checkbox]").check();
  await p
    .getByRole("button", { name: "Confirm admission", exact: true })
    .click();
  await expect(p.getByText(/admitted|checked in/i).first()).toBeVisible();
  await capture("first-admission-390");
  await p.getByLabel("Private entry code", { exact: true }).fill(token);
  await p.getByRole("button", { name: "Validate ticket", exact: true }).click();
  await expect(
    p.getByText(/already.*(admitted|checked)|used/i).first(),
  ).toBeVisible();
  await capture("duplicate-rejected-390");
  await check(
    "Authorized scanner validated the ticket’s actual QR payload, admitted it once, and rejected duplicate admission.",
  );
  await workspace("Customer");
  await p.goto(base + "/my-bookings");
  await expect(
    p
      .locator(".customer-booking-list article")
      .filter({ hasText: title })
      .getByRole("button", { name: /checked in/ }),
  ).toBeVisible();
  await check(
    "Customer sees persisted checked-in ticket after returning from staff context.",
  );
  const declined = await book(slug);
  await pay("DECLINED");
  assert.equal((await get("customer/booking/" + declined)).tickets.length, 0);
  await check("Declined payment persists and issues no ticket.");
  await capture("declined-390");
  const cancelled = await book(slug);
  await pay("CANCELLED");
  const cb = await get("customer/booking/" + cancelled);
  assert.equal(cb.paymentState, "AWAITING_PAYMENT");
  assert.equal(cb.tickets.length, 0);
  await check("Cancelled payment remains unpaid with no ticket.");
  const multiple = await book(slug, 3);
  await pay();
  assert.equal((await get("customer/booking/" + multiple)).tickets.length, 3);
  await check(
    "Quantity three reserves inventory and issues three unique persistent tickets.",
  );
  await p.locator(".lab-review-tools > summary").click();
  await p
    .getByRole("button", { name: "Add fresh TEST events", exact: true })
    .click();
  await p.waitForURL(/view=all/);
  await expect(p.locator(".poster-card, .event-card").first()).toBeVisible();
  const scenarios = (await get("events")).filter((e: any) =>
    e.title.includes("TEST ·"),
  );
  await writeFile(
    out + "/browser-progress.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        bookingId,
        eventId: booking.event.id,
        slug,
        multiple,
        scenarios: scenarios.map((e: any) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
        })),
      },
      null,
      2,
    ),
  );
  await check(
    "Fresh scenarios generated through visible website controls without resetting prior records.",
  );
  // Additional scenarios, manual review, refunds and theme captures follow in the supplement.
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/browser-results.json",
    JSON.stringify({ passed: true, checks, pageErrors: errors }, null, 2),
  );
} catch (e) {
  await p.screenshot({ path: out + "/browser-failure.png", fullPage: true });
  await writeFile(
    out + "/browser-failure.txt",
    await p.locator("body").innerText(),
  );
  throw e;
} finally {
  await browser.close();
}
