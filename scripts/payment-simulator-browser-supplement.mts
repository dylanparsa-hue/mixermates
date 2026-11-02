import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { simulatorEnvironment } from "../lib/simulator-policy";
import { localDateTime } from "../lib/event-config";
assert(simulatorEnvironment());
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/payment-simulator",
  progress = JSON.parse(await readFile(out + "/browser-progress.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  c = await browser.newContext({
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
function add(s: string) {
  checks.push(s);
  console.log(s);
}
async function capture(name: string) {
  await p.screenshot({ path: out + "/" + name + ".png", fullPage: true });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "No overflow: " + name,
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
async function pay() {
  await p
    .getByRole("button", { name: "Pay with Test Payment", exact: true })
    .click();
  await p.getByRole("button", { name: /Pay RM.*TEST/ }).click();
  await expect(
    p.getByRole("heading", { name: "Test Payment Successful", exact: true }),
  ).toBeVisible();
}
try {
  await p.goto(base + "/");
  await p.waitForURL(/\/explore$/);
  await p.locator(".lab-review-tools > summary").click();
  await p
    .getByRole("button", { name: "Add fresh TEST events", exact: true })
    .click();
  await p.waitForURL(/view=all/);
  const catalogue = await get("events"),
    setup = await get("setup");
  const find = (name: string) =>
    [...catalogue, ...setup.events]
      .filter((e: any) => e.title.includes(name))
      .sort((a: any, b: any) => b.title.localeCompare(a.title))[0];
  const free = await book(find("Sunset Free RSVP").slug);
  await expect(
    p.getByRole("heading", {
      name: "Your free TEST ticket is ready",
      exact: true,
    }),
  ).toBeVisible();
  assert.equal((await get("customer/booking/" + free)).tickets.length, 1);
  add("Free RSVP issues a persistent ticket with payment not required.");
  await capture("free-rsvp-390-light");
  const premium = await book(find("Neon After Dark").slug, 2, 1);
  await pay();
  const pb = await get("customer/booking/" + premium);
  assert.equal(pb.tickets.length, 2);
  assert.equal(pb.tier.name, "Premium");
  assert.equal(pb.total, 10000);
  add(
    "Second ticket tier and quantity two use the correct server-calculated RM100 total.",
  );
  const refundBooking = await book(find("Neon After Dark").slug);
  await pay();
  await p.goto(base + "/bookings/" + refundBooking);
  await p.getByText("Test refunds", { exact: true }).click();
  await p
    .getByRole("button", { name: "Request TEST refund", exact: true })
    .click();
  for (const outcome of ["PENDING", "FAILED", "SUCCESS"]) {
    if (!(await p.locator(".simulator-refund[open]").count()))
      await p.getByText("Test refunds", { exact: true }).click();
    await p
      .getByLabel("Test refund outcome", { exact: true })
      .selectOption(outcome);
    await p
      .getByRole("button", { name: "Simulate TEST refund", exact: true })
      .click();
    if (outcome === "SUCCESS")
      await expect(
        p.getByRole("heading", { name: "Test refund successful", exact: true }),
      ).toBeVisible();
    else
      await expect(
        p.getByText(
          "Refund status: simulated " +
            outcome.toLowerCase() +
            ". No real bank transfer.",
          { exact: true },
        ),
      ).toBeVisible();
  }
  const rb = await get("customer/booking/" + refundBooking);
  assert.equal(rb.paymentState, "REFUNDED");
  assert(rb.tickets.every((t: any) => t.status === "REVOKED"));
  add(
    "Visible refund controls persist pending, failed and successful outcomes; successful refund revokes the tickets.",
  );
  await capture("refund-success-390-light");
  const manual = find("Manual QR Review"),
    manualBooking = await book(manual.slug);
  await p
    .getByRole("button", { name: "Use sample TEST receipt", exact: true })
    .click();
  await expect(
    p.getByText("Payment: proof submitted", { exact: true }),
  ).toBeVisible();
  assert.equal(
    (await get("customer/booking/" + manualBooking)).tickets.length,
    0,
  );
  await reviewer("Independent payment reviewer");
  await p.goto(base + "/organizer?tab=Booking%20reviews&event=" + manual.id);
  const row = p
    .locator(".booking-review-entry")
    .filter({ hasText: manualBooking });
  await row
    .getByLabel("Review notes", { exact: true })
    .fill(
      "Independent fictional receipt and ledger verification. No funds moved.",
    );
  await row
    .getByLabel("Amount independently received (MYR)", { exact: true })
    .fill("18.00");
  await row.getByRole("checkbox").check();
  await row
    .getByRole("button", { name: "Confirm received payment", exact: true })
    .click();
  await expect(row.getByText(/Payment: confirmed/)).toBeVisible();
  await reviewer("Independent registration reviewer");
  await p.goto(base + "/organizer?tab=Booking%20reviews&event=" + manual.id);
  const reg = p
    .locator(".booking-review-entry")
    .filter({ hasText: manualBooking });
  await reg
    .getByLabel("Review notes", { exact: true })
    .fill("Independent fictional registration approval for browser test.");
  await reg
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await expect(reg.getByText(/Registration: approved/)).toBeVisible();
  await workspace("Customer");
  await p.goto(base + "/bookings/" + manualBooking);
  await expect(
    p.getByRole("button", { name: /Open TEST ticket.*active/ }),
  ).toBeVisible();
  add(
    "Manual QR scenario uses a built-in synthetic receipt, independent finance reviewer and separate registration approval; ticket issues only after both checks.",
  );
  const approval = find("Registration Review"),
    approvalBooking = await book(approval.slug);
  await pay();
  assert.equal(
    (await get("customer/booking/" + approvalBooking)).tickets.length,
    0,
  );
  await reviewer("Independent registration reviewer");
  await p.goto(base + "/organizer?tab=Booking%20reviews&event=" + approval.id);
  const gated = p
    .locator(".booking-review-entry")
    .filter({ hasText: approvalBooking });
  await gated
    .getByLabel("Review notes", { exact: true })
    .fill("Independent registration approval after simulator confirmation.");
  await gated
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await expect(gated.getByText(/Registration: approved/)).toBeVisible();
  await workspace("Customer");
  assert.equal(
    (await get("customer/booking/" + approvalBooking)).tickets.length,
    1,
  );
  add(
    "Configured registration gate remains enforced for a simulator-paid booking.",
  );
  const priv = find("Private Invitation"),
    privateBooking = await book(priv.slug);
  await pay();
  assert.equal(
    (await get("customer/booking/" + privateBooking)).tickets.length,
    1,
  );
  add(
    "Private event accepts the account-bound authorized invitation and issues a ticket.",
  );
  await p.goto(base + "/events/" + find("Sold Out").slug);
  await expect(
    p.getByRole("button", { name: "Sold out", exact: true }).first(),
  ).toBeDisabled();
  add("Sold-out event shows an exact unavailable reason.");
  await p.goto(base + "/events/" + find("Cancelled Night").slug);
  await expect(
    p.getByRole("button", { name: "Event cancelled", exact: true }).first(),
  ).toBeDisabled();
  add("Cancelled event cannot be purchased.");
  // Existing reviewed reschedule workflow, driven entirely through the visible forms.
  await workspace("Organizer");
  await p.goto(base + "/organizer?tab=Event%20operations&event=" + pb.event.id);
  await p.getByText("Request event change", { exact: true }).click();
  await p
    .getByLabel("Proposed start", { exact: true })
    .fill(localDateTime(new Date(Date.now() + 12 * 86400000)));
  await p
    .getByLabel("Proposed end", { exact: true })
    .fill(localDateTime(new Date(Date.now() + 12 * 86400000 + 7200000)));
  await p
    .getByLabel("Reason for change", { exact: true })
    .fill("Fictional browser reschedule; no real venue or customers.");
  await p
    .getByRole("button", { name: "Submit change for review", exact: true })
    .click();
  await expect(
    p.getByText("Change pending; new bookings, issuance and entry paused", {
      exact: false,
    }),
  ).toBeVisible();
  await workspace("Admin");
  await p.goto(base + "/admin?tab=Event%20operations&event=" + pb.event.id);
  await p
    .getByLabel("Change review notes", { exact: true })
    .fill(
      "Independent fictional schedule review. Existing tickets and attendance remain recorded.",
    );
  await p.getByRole("button", { name: "Approve change", exact: true }).click();
  await expect(p.getByText(/No pending term change/)).toBeVisible();
  await workspace("Customer");
  await p.goto(base + "/bookings/" + premium);
  await expect(
    p.getByRole("heading", { name: "Event details updated", exact: true }),
  ).toBeVisible();
  assert.equal(
    (await get("customer/booking/" + premium)).tickets[0].status,
    "ACTIVE",
  );
  add(
    "Reviewed reschedule reaches the existing customer ticket and preserves its active identity.",
  );
  await p.goto(base + "/my-bookings");
  await p
    .locator("summary")
    .filter({ hasText: /^Notifications$/ })
    .click();
  await expect(
    p.getByText("Your ticket is ready", { exact: true }).first(),
  ).toBeVisible();
  add("Customer notifications show persisted ticket and event updates.");
  // Cross-user ownership and unauthorized scanner checks in a separate fictional identity.
  const other = await browser.newContext();
  await other.request.post(base + "/api/test-lab/login", {
    headers: { Origin: base },
    data: {},
  });
  await other.request.post(base + "/api/test-lab/switch", {
    headers: { Origin: base },
    data: { role: "Community Friend" },
  });
  assert.equal(
    (
      await other.request.get(base + "/api/customer/booking/" + premium)
    ).status(),
    404,
  );
  assert.equal(
    (
      await other.request.get(base + "/api/customer/ticket/" + pb.tickets[0].id)
    ).status(),
    404,
  );
  assert.equal(
    (
      await other.request.post(base + "/api/entrance/preview", {
        headers: { Origin: base },
        data: {
          eventId: pb.event.id,
          ticketId: pb.tickets[0].id,
          method: "MANUAL",
        },
      })
    ).status(),
    403,
  );
  await other.close();
  add(
    "A second customer cannot read the booking/ticket or use organizer scanner permissions.",
  );
  // Batch mobile/desktop renders in both themes, plus narrow phone and landscape overflow checks.
  await p.goto(base + "/bookings/" + premium);
  for (const theme of ["light", "dark"]) {
    await p
      .locator(".theme-control label:visible")
      .filter({ has: p.locator(`input[value=${theme}]`) })
      .first()
      .click();
    await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [375, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await capture(`checkout-${theme}-${width}`);
    }
  }
  await p.setViewportSize({ width: 844, height: 390 });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  add(
    "Checkout renders without horizontal overflow at 375/390/768/1440px in Light and Dark, plus landscape.",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/browser-supplement-results.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        pageErrors: errors,
        manualBooking,
        free,
        premium,
        privateBooking,
      },
      null,
      2,
    ),
  );
} catch (e) {
  await p.screenshot({ path: out + "/supplement-failure.png", fullPage: true });
  await writeFile(
    out + "/supplement-failure.txt",
    await p.locator("body").innerText(),
  );
  throw e;
} finally {
  await browser.close();
}
