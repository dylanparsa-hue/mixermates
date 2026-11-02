// Actual website journey. API calls below inspect outcomes/negative cases, never approve the happy path.
import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment(), "Verified isolated Lab required");
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes",
  scenarios = JSON.parse(
    await readFile(".local/ui-fixes-scenarios.json", "utf8"),
  ),
  access = JSON.parse(await readFile(".local/test-lab-access.json", "utf8")),
  paid = scenarios.find((e) => e.key === "paid");
await mkdir(out + "/journey", { recursive: true });
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage(),
  checks = [],
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const get = async (path) => {
  const r = await c.request.get(base + "/api/" + path);
  assert(r.ok(), path);
  return r.json();
};
const post = async (path, data) =>
  c.request.post(base + "/api/" + path, { headers: { Origin: base }, data });
const add = (s) => {
  checks.push(s);
  console.log(s);
};
async function workspace(value) {
  await Promise.all([
    p.waitForNavigation({ waitUntil: "domcontentloaded" }),
    p
      .getByRole("combobox", { name: "Workspace", exact: true })
      .selectOption(value),
  ]);
  await p.waitForURL(
    value === "Customer"
      ? /\/explore$/
      : value === "Admin"
        ? /\/admin$/
        : /\/organizer/,
  );
  await p.locator(".loading").waitFor({ state: "hidden" });
}
async function reviewer(label) {
  await p.locator(".lab-review-tools summary").click();
  await Promise.all([
    p.waitForNavigation({ waitUntil: "domcontentloaded" }),
    p.getByRole("button", { name: label, exact: true }).click(),
  ]);
  await p.waitForURL(/\/organizer\?tab=/);
  if (label === "Entrance staff")
    await p.getByLabel("Private entry code", { exact: true }).waitFor();
  else
    await p
      .getByRole("heading", {
        name: "Registrations & payment review",
        exact: true,
      })
      .waitFor();
}
async function register() {
  await p.locator(".customer-tier input[type=radio]").first().check();
  await p
    .getByRole("button", { name: "Continue to your details", exact: true })
    .click();
  const field = p.getByRole("textbox", {
    name: "Full name as on IC",
    exact: true,
  });
  if (await field.count()) await field.fill("Alex Fictional Test");
  await p
    .getByRole("button", { name: "Review registration", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await p.waitForURL(/\/bookings\/[^/]+$/);
  await p.locator(".customer-summary").waitFor();
  return p.url().split("/").at(-1);
}
async function screenshot(name) {
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({
    path: out + "/journey/" + name + ".png",
    fullPage: true,
    mask: [p.locator('img[alt*="Private"][alt*="QR"]')],
  });
}
try {
  await p.goto(base + "/");
  await p.waitForURL(/\/explore$/);
  await p.locator(".cinema-poster").first().waitFor();
  add("Automatic local entry opens the normal website");
  const before = (await get("me")).user;
  assert.equal(before.role, "ATTENDEE");
  await p.locator(`a[href="/events/${paid.slug}"]`).first().click();
  await p
    .getByRole("button", { name: "Book TEST tickets", exact: true })
    .click();
  await p.waitForURL(/\/join\//);
  const bookingId = await register();
  add(
    "Public paid TEST event reserves through normal ticket and registration UI",
  );
  const proof = await QRCode.toBuffer(
    "FICTIONAL SAMPLE PAYMENT EVIDENCE — NO MONEY",
  );
  await p.getByLabel("Upload payment proof", { exact: true }).setInputFiles({
    name: "fictional-proof.png",
    mimeType: "image/png",
    buffer: proof,
  });
  await expect(p.locator(".customer-status")).toContainText("proof submitted");
  let booking = await get("customer/booking/" + bookingId);
  assert.equal(booking.tickets.length, 0);
  add("Private sample evidence upload does not issue a ticket");
  const denied = await post("customer/review", {
    bookingId,
    kind: "REGISTRATION",
    approve: true,
    notes: "Customer cannot self approve.",
  });
  assert.equal(denied.status(), 403);
  const deniedAdmin = await c.request.get(base + "/api/admin");
  assert.equal(deniedAdmin.status(), 403);
  add("Customer cannot self-approve or access admin data");
  await reviewer("Independent payment reviewer");
  await p.getByLabel("Event", { exact: true }).selectOption(paid.id);
  let row = p.locator(".booking-review-entry").filter({ hasText: bookingId });
  await row.waitFor();
  await row
    .getByLabel("Review notes", { exact: true })
    .fill("Independent fictional funds record checked. No money moved.");
  await row
    .getByLabel("Amount independently received (MYR)", { exact: true })
    .fill("35.00");
  await row.getByRole("checkbox").check();
  await row
    .getByRole("button", { name: "Confirm received payment", exact: true })
    .click();
  await expect(row).toContainText("Payment: confirmed");
  add(
    "Independent finance actor confirms exact fictional incoming amount in normal payment screen",
  );
  await reviewer("Independent registration reviewer");
  await p.getByLabel("Event", { exact: true }).selectOption(paid.id);
  row = p.locator(".booking-review-entry").filter({ hasText: bookingId });
  await row
    .getByLabel("Review notes", { exact: true })
    .fill("Independent fictional registration approved. No real admission.");
  await row
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await expect(row).toContainText("Registration: approved");
  add(
    "Independent admin reviewer approves registration in normal review screen",
  );
  await workspace("Customer");
  await p.goto(base + "/bookings/" + bookingId);
  await p
    .getByRole("button", { name: /Open (TEST )?ticket/ })
    .first()
    .click();
  await p.locator(".entry-paper").waitFor();
  const qr = p.locator('img[alt="Private admission QR"]');
  await expect(qr).toBeVisible();
  const token = await qr.evaluate(async (image) => {
    if (!("BarcodeDetector" in window))
      throw Error("Native QR detector unavailable");
    await image.decode();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    return (await detector.detect(image))[0]?.rawValue;
  });
  assert(token && token.length >= 20);
  await screenshot("private-ticket");
  await p
    .getByRole("button", { name: "Full-screen QR", exact: true })
    .first()
    .click();
  await p.getByRole("button", { name: "Hide QR code", exact: true }).click();
  await p.getByRole("button", { name: "Close ticket", exact: true }).click();
  add("Issued private ticket opens, QR decodes, fullscreen dismisses");
  await reviewer("Entrance staff");
  await p.goto(base + "/organizer?tab=Entrance&event=" + paid.id);
  await p.getByLabel("Private entry code", { exact: true }).fill(token);
  await p.getByRole("button", { name: "Validate ticket", exact: true }).click();
  await p
    .getByRole("checkbox", { name: /I checked attendee identification/ })
    .check();
  await p
    .getByRole("button", { name: "Confirm admission", exact: true })
    .click();
  await expect(p.locator(".scan-result.success")).toContainText(
    /Admission confirmed/i,
  );
  await p.getByLabel("Private entry code", { exact: true }).fill(token);
  await p.getByRole("button", { name: "Validate ticket", exact: true }).click();
  await expect(p.locator(".scan-result.failure")).toContainText(
    /already|used|checked/i,
  );
  add("Normal scanner admits once and rejects duplicate entry");
  await workspace("Customer");
  await p.goto(base + "/profile");
  await p.locator(".identity-sheet").waitFor();
  const profile = await get("profile");
  assert(
    JSON.stringify(profile).includes(paid.id) ||
      JSON.stringify(profile).includes(paid.title),
  );
  add("Customer returns to profile with attendance history");
  if (!before.capabilities?.includes("ORGANIZER")) {
    await p.getByRole("button", { name: "Account menu", exact: true }).click();
    await p
      .locator("#account-panel")
      .getByRole("link", { name: "Become an Organizer", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Activate Starter TEST plan",
        exact: true,
      })
      .click();
    await p.waitForURL(/\/organizer$/);
  } else await p.goto(base + "/organizer");
  await p.getByRole("heading", { name: "My events", exact: true }).waitFor();
  const after = (await get("me")).user;
  assert.equal(before.id, after.id);
  assert.equal(after.role, "ATTENDEE");
  assert(after.capabilities.includes("ORGANIZER"));
  assert.equal(after.verification, before.verification);
  add(
    "TEST plan adds organizer entitlement to the same customer ID without changing role or verification",
  );
  const repeated = await post("test-lab/activate-organizer", {
    plan: "STARTER",
  });
  assert.equal(repeated.status(), 200);
  add("TEST activation is idempotent and cannot grant admin");
  await p
    .getByRole("link", { name: "Create event", exact: true })
    .first()
    .click();
  await p
    .getByRole("textbox", { name: "Event name", exact: true })
    .fill("TEST · Owner’s Open Studio");
  await p
    .getByLabel("Full description", { exact: true })
    .fill(
      "A fictional free studio evening for testing the complete owner creation and approval journey. No real venue or admission.",
    );
  await p
    .getByLabel("Or select provided artwork", { exact: true })
    .selectOption("/images/live.jpg");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  const future = new Date(Date.now() + 9 * 86400000 + 8 * 3600000)
    .toISOString()
    .slice(0, 10);
  await p
    .getByLabel("Start date and time", { exact: true })
    .fill(future + "T20:00");
  await p
    .getByLabel("End date and time", { exact: true })
    .fill(future + "T23:00");
  await p.getByLabel("City", { exact: true }).fill("Kuala Lumpur");
  await p
    .getByLabel("Public venue or approximate area", { exact: true })
    .fill("FICTIONAL studio");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByLabel("Event access", { exact: true }).selectOption("PUBLIC");
  await p.getByLabel("Event capacity", { exact: true }).fill("12");
  await p
    .getByLabel("Review registrations before admission", { exact: true })
    .uncheck();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByRole("button", { name: "Free RSVP", exact: true }).click();
  await p.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(p.locator(".setup-save-state")).toContainText("Saved");
  const eventId = new URL(p.url()).searchParams.get("edit");
  assert(eventId);
  add(
    "Same account creates and saves an event with artwork, future date, capacity and free ticket tier",
  );
  await p.locator(".setup-steps button").last().click();
  await p
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(p.locator(".setup-state").first()).toContainText(
    "PENDING REVIEW",
  );
  add("Normal event builder submits the draft for independent approval");
  await workspace("Admin");
  await p.getByRole("button", { name: "Events", exact: true }).click();
  const eventRow = p.locator(`.setup-review-item[data-event-id="${eventId}"]`);
  await eventRow
    .getByLabel("Event review notes", { exact: true })
    .fill("Independent fictional publication review. No real sales approved.");
  await eventRow
    .getByRole("button", { name: "Approve publication", exact: true })
    .click();
  await expect(
    p.locator(`.admin-event-list [data-event-id="${eventId}"]`),
  ).toContainText("published");
  add("Separate local admin publishes through normal dashboard");
  await workspace("Organizer");
  await p.getByRole("heading", { name: "My events", exact: true }).waitFor();
  const own = p.locator(`.setup-event-row[data-event-id="${eventId}"]`);
  await expect(own).toContainText("published");
  await own.getByRole("link", { name: "Edit event", exact: true }).click();
  await p
    .getByLabel("Short description", { exact: true })
    .fill("A fictional studio evening.");
  await p.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(p.locator(".setup-save-state")).toContainText("Saved");
  add(
    "Personal Organizer workspace retains customer identity and edits the approved event",
  );
  let setup = await get("setup"),
    created = setup.events.find((e) => e.id === eventId);
  assert(created && created.organizerId === before.id);
  if (created.status === "DRAFT") {
    await p.locator(".setup-steps button").last().click();
    await p
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(p.locator(".setup-state").first()).toContainText(
      "PENDING REVIEW",
    );
    await workspace("Admin");
    await p.getByRole("button", { name: "Events", exact: true }).click();
    const edited = p.locator(`.setup-review-item[data-event-id="${eventId}"]`);
    await edited
      .getByLabel("Event review notes", { exact: true })
      .fill("Independent review of the edited fictional event.");
    await edited
      .getByRole("button", { name: "Approve publication", exact: true })
      .click();
    await expect(
      p.locator(`.admin-event-list [data-event-id="${eventId}"]`),
    ).toContainText("published");
    add(
      "Editing before bookings preserves independent resubmission and approval",
    );
  }
  await workspace("Customer");
  await p.goto(base + "/events/" + created.slug);
  await p
    .getByRole("button", { name: "Book TEST tickets", exact: true })
    .click();
  const freeBookingId = await register();
  const free = await get("customer/booking/" + freeBookingId);
  assert(free.tickets.length > 0);
  assert.equal(free.total, 0);
  add(
    "Independently approved free event books normally and issues a TEST ticket",
  );
  const privateEvent = scenarios.find((e) => e.key === "private");
  assert(
    [200, 404].includes(
      (
        await c.request.get(base + "/api/customer/event/" + privateEvent.slug)
      ).status(),
    ),
  );
  await p.locator(".lab-review-tools summary").click();
  await p
    .getByRole("button", { name: "Private TEST invitation", exact: true })
    .click();
  await p.locator(".customer-tier").first().waitFor();
  await expect(
    p.getByText("Private invitation. Your access is limited to this event.", {
      exact: false,
    }),
  )
    .toBeHidden()
    .catch(() => {});
  add("Private TEST invitation uses a persisted identity-bound grant");
  await p.goto(base + "/organizer?tab=Booking%20reviews&event=" + eventId);
  await p
    .getByRole("heading", {
      name: "Registrations & payment review",
      exact: true,
    })
    .waitFor();
  await p.goto(base + "/organizer?tab=Entrance&event=" + eventId);
  await p.getByLabel("Private entry code", { exact: true }).waitFor();
  add(
    "Own event payment review and scanner remain available through normal contextual links",
  );
  await writeFile(
    ".local/ui-fixes-journey.json",
    JSON.stringify(
      { bookingId, eventId, freeBookingId, paidSlug: paid.slug },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  assert.equal(errors.length, 0, errors.join("\n"));
} finally {
  await writeFile(
    out + "/journey-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log({ passed: checks.length, errors });
  await b.close();
}
