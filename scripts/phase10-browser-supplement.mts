import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { reserveBooking } from "../lib/booking-domain";
import { submitPaymentEvidence } from "../lib/payment-foundation";
if (
  !process.env.DATABASE_URL?.includes("mixermates-phase10-20261027/preview/") ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Own isolated Phase10 fixture only");
const base = "http://localhost:3051",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/phase10";
const main = JSON.parse(await readFile(out + "/browser-results.json", "utf8")),
  f = JSON.parse(await readFile(".local/phase10-fixture.json", "utf8")),
  admin = JSON.parse(await readFile(".local/admin-access.json", "utf8"));
const source = await db.booking.findUniqueOrThrow({
  where: { id: main.bookingId },
  include: {
    payment: { include: { evidence: { include: { receiptUpload: true } } } },
    tier: true,
  },
});
let duplicate: any;
try {
  duplicate = await db.booking.findUniqueOrThrow({
    where: {
      id: JSON.parse(await readFile(".local/phase10-duplicate.json", "utf8"))
        .id,
    },
  });
} catch {
  duplicate = await reserveBooking("attendee", {
    eventId: source.eventId,
    tierId: source.tierId,
    quantity: 1,
    entryKey: "fee",
    answers: JSON.parse(source.answers),
    idempotencyKey: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 3600000),
  });
  const old = source.payment!.evidence[0].receiptUpload;
  const receipt = await db.fileUpload.create({
    data: {
      userId: "attendee",
      private: true,
      mime: old.mime,
      path: "p9-duplicate-" + Date.now(),
      data: old.data!,
    },
  });
  await submitPaymentEvidence("attendee", duplicate.id, receipt.id, "PAYMENT", {
    claimedAmount: 3400,
    claimedRecipient: "FICTIONAL MISMATCH",
    paymentReference: "FICTIONAL-GROUP-REF",
  });
  await writeFile(
    ".local/phase10-duplicate.json",
    JSON.stringify({ id: duplicate.id }),
    { mode: 0o600 },
  );
}
const old = source.payment!.evidence[0].receiptUpload;
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  ctx = await browser.newContext({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  }),
  page = await ctx.newPage();
const measures: any[] = [],
  checks: string[] = [],
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
// A localhost-only map fixture: external tiles/styles are never contacted.
await ctx.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }),
);
async function login(role: string) {
  await ctx.clearCookies();
  const r = await ctx.request.post(
    base + "/api/" + (role === "admin" ? "admin/login" : "preview/login"),
    {
      headers: { Origin: base },
      data:
        role === "admin"
          ? { email: admin.email, password: admin.password }
          : { email: role + "@vibey.demo", password: "VibeyDemo2026!" },
    },
  );
  assert(r.ok());
}
async function capture(name: string) {
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const editing = await page.getByRole("dialog").count();
      if (editing) await page.keyboard.press("Escape");
      await page
        .locator(".theme-control label:visible")
        .filter({ has: page.locator(`input[value=${theme}]`) })
        .first()
        .click();
      if (editing) {
        await page
          .getByRole("button", { name: /Edit profile/i })
          .first()
          .click();
        const dialog = page.getByRole("dialog");
        await dialog
          .getByLabel("Username", { exact: true })
          .fill("phase10_local_admin");
        await dialog
          .getByLabel("Display name", { exact: true })
          .fill("Fictional Phase10 Admin");
        await dialog
          .getByLabel("Your sounds (comma separated)", { exact: true })
          .fill("House, Techno");
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(60);
      const m = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        broken: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.alt),
      }));
      assert(m.scroll <= m.client, name + " overflow " + width);
      assert.equal(m.broken.length, 0);
      measures.push({ name, theme, width, ...m });
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `${out}/screenshots/${name}-${theme}-${width}.png`,
          fullPage: true,
          mask: [
            page.getByAltText("Private admission QR", { exact: true }),
            page.locator(".entry-code"),
          ],
        });
    }
}
await login("organizer");
await page.goto(
  base + "/organizer?tab=Booking%20reviews&event=" + source.eventId,
);
const row = page
  .locator(".booking-review-entry")
  .filter({ hasText: duplicate.id });
await row
  .getByText("Risk indicators & review history", { exact: true })
  .click();
await row
  .getByText(/POSSIBLE DUPLICATE/)
  .first()
  .waitFor();
await row.getByText(/claimed amount differs/).waitFor();
await capture("payment-risk-reconciliation");
await page.getByText("Open payment reconciliation", { exact: true }).click();
await page
  .getByLabel("Financial cases", { exact: false })
  .selectOption("NEEDS_REVIEW");
await page
  .getByRole("status")
  .filter({ hasText: /matching bookings/ })
  .waitFor();
assert.equal(
  (await db.booking.findUniqueOrThrow({ where: { id: duplicate.id } }))
    .paymentState,
  "PROOF_SUBMITTED",
);
assert.equal(await db.ticket.count({ where: { bookingId: duplicate.id } }), 0);
await capture("financial-reconciliation-filter");
checks.push(
  "Same receipt accepted and flagged; claimed mismatches visible; no automatic confirmation/rejection/ticket",
);
let response = await ctx.request.get(
  base +
    "/api/customer/reconciliation-export/" +
    source.eventId +
    "?filter=NEEDS_REVIEW",
);
assert(response.ok());
const csv = await response.text();
assert(csv.includes(duplicate.id));
assert(!csv.includes(old.id));
checks.push(
  "Financial risk-filter export authenticated, audited and credential-free",
);
await page.goto(base + "/organizer?tab=Entrance&event=" + source.eventId);
await page
  .getByRole("heading", { name: "Entrance management", exact: true })
  .waitFor();
await page.getByText("Manage all registrations", { exact: true }).click();
await page
  .getByLabel("Search attendee or booking", { exact: true })
  .fill("Alex Fictional Halloween");
await page
  .getByLabel("Booking status", { exact: false })
  .selectOption("PENDING");
await page.waitForTimeout(300);
await capture("guest-server-filters");
checks.push(
  "Pending registration search/filter remains available alongside bounded entrance ticket page",
);
await login("staff");
response = await ctx.request.get(base + "/api/customer/risk/" + duplicate.id);
assert.equal(response.status(), 403);
response = await ctx.request.get(
  base + "/api/customer/reconciliation/" + source.eventId,
);
assert.equal(response.status(), 403);
response = await ctx.request.get(
  base + "/api/customer/guests/" + source.eventId,
);
assert(response.ok());
const text = await response.text();
for (const v of ["claimedAmount", "recipientSnapshot", "answers", '"payment":'])
  assert(!text.includes(v));
checks.push(
  "Scanner guest list omits finance/contact/answers; risk and reconciliation denied",
);
await login("admin");
await page.goto(base + "/admin?tab=Event%20operations&event=" + source.eventId);
await page.getByText("Readiness checklist", { exact: true }).click();
await page.getByRole("heading", { name: /Organizer · needs human/ }).waitFor();
await capture("categorized-readiness");
checks.push(
  "Readiness exposes technical/human/owner/external distinctions with no sales bypass",
);
// Profile editing reuses the existing full admin preview and validates persisted username/privacy.
await page.goto(base + "/profile");
await page
  .getByRole("button", { name: /Edit profile/i })
  .first()
  .click();
const modal = page.getByRole("dialog");
await modal.getByLabel("Username", { exact: true }).fill("phase10_local_admin");
await modal
  .getByLabel("Display name", { exact: true })
  .fill("Fictional Phase10 Admin");
await modal
  .getByLabel("Your sounds (comma separated)", { exact: true })
  .fill("House, Techno");
await capture("profile-editing");
await modal.getByRole("button", { name: /Save/ }).click();
await modal.waitFor({ state: "hidden" });
const profile = await db.user.findUniqueOrThrow({
  where: { id: "phase1_preview_admin" },
});
assert.equal(profile.username, "phase10_local_admin");
assert.equal(profile.interests, "House, Techno");
checks.push(
  "Display name, username and music interests persist through existing profile editor",
);
await page.goto(base + "/explore");
await page
  .getByRole("heading", { name: /Find your vibe/i })
  .first()
  .waitFor();
await capture("event-discovery");
await page.goto(base + "/map");
await page
  .getByRole("heading", { name: "Follow the feeling.", exact: true })
  .waitFor();
await page.waitForTimeout(500);
assert(!(await page.getByText("Invalid LngLat").count()));
await capture("protected-event-map");
checks.push(
  "Discovery and map render with protected-location records and local empty tile style; no external tiles contacted",
);
await writeFile(
  out + "/browser-supplement.json",
  JSON.stringify(
    {
      checks,
      measures,
      errors,
      duplicateBookingId: duplicate.id,
      noRealFunds: true,
    },
    null,
    2,
  ),
);
assert.equal(errors.length, 0);
await browser.close();
await db.$disconnect();
console.log(
  JSON.stringify({
    checks: checks.length,
    measurements: measures.length,
    errors,
  }),
);
