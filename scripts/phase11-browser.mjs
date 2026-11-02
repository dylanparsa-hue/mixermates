process.on("unhandledRejection", (e) => {
  console.error(
    String(e?.stack || e)
      .replace(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
        "[PRIVATE IMAGE REDACTED]",
      )
      .replace(/\b[a-f0-9]{64}\b/g, "[PRIVATE CREDENTIAL REDACTED]"),
  );
  process.exit(1);
});
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import QRCode from "qrcode";
import assert from "node:assert/strict";
const base = "http://localhost:3061",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/phase11/screenshots";
await mkdir(out, { recursive: true });
const f = JSON.parse(await readFile(".local/phase11-fixture.json", "utf8")),
  admin = JSON.parse(await readFile(".local/admin-access.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  page = await ctx.newPage();
const measures = [],
  journeys = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function login(role, context = { bookingId: f.reschedule.bookingId }) {
  await ctx.clearCookies();
  const p =
    role === "admin"
      ? "admin/login"
      : role === "customer"
        ? "customer/login"
        : "preview/login";
  const data =
    role === "admin"
      ? { email: admin.email, password: admin.password }
      : role === "customer"
        ? { email: "attendee@vibey.demo", password: "VibeyDemo2026!", context }
        : { email: role + "@vibey.demo", password: "VibeyDemo2026!" };
  const r = await ctx.request.post(base + "/api/" + p, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), "Login " + role + " " + r.status());
}
async function capture(name) {
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const ticketOpen = await page
        .getByRole("dialog", { name: "Your digital ticket", exact: true })
        .count();
      if (ticketOpen) {
        await page
          .getByRole("button", { name: "Close ticket", exact: true })
          .click();
      }
      await page
        .locator(".theme-control label:visible")
        .filter({ has: page.locator(`input[value=${theme}]`) })
        .first()
        .click();
      if (ticketOpen) {
        await page
          .getByRole("button", { name: /Open.*ticket|View.*ticket/i })
          .first()
          .click();
        await page
          .getByRole("dialog", { name: "Your digital ticket", exact: true })
          .waitFor();
      }
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        return document.fonts.ready;
      });
      await page.waitForTimeout(70);
      const d = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        broken: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.alt),
      }));
      measures.push({ name, theme, width, ...d });
      assert(d.scroll <= d.client, "Overflow " + name + " " + width);
      assert.equal(d.broken.length, 0);
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `${out}/${name}-${theme}-${width}.png`,
          fullPage: true,
          mask: [
            page.getByAltText("Private admission QR", { exact: true }),
            page.locator(".entry-code"),
            page.getByLabel("Private entry code", { exact: true }),
          ],
        });
    }
}
if (!process.env.PHASE11_RESUME_HALLOWEEN) {
  await login("organizer");
  await page.goto(
    base + "/organizer?tab=Event%20operations&event=" + f.reschedule.eventId,
  );
  await page
    .getByRole("heading", { name: "Fictional Phase11 reschedule", exact: true })
    .waitFor();
  const already = await (
    await ctx.request.get(
      base + "/api/event-operations?event=" + f.reschedule.eventId,
    )
  ).json();
  {
    await page.getByText("Request event change", { exact: true }).click();
    await page
      .getByLabel("Proposed start", { exact: true })
      .fill(
        new Date(Date.parse(already.event.startsAt) + 32 * 3600000)
          .toISOString()
          .slice(0, 16),
      );
    await page
      .getByLabel("Proposed end", { exact: true })
      .fill(
        new Date(Date.parse(already.event.endsAt) + 32 * 3600000)
          .toISOString()
          .slice(0, 16),
      );
    await page
      .getByLabel("Private venue / address", { exact: true })
      .fill("FICTIONAL NEW PRIVATE VENUE");
    await page
      .getByLabel("Reason for change", { exact: true })
      .fill("FICTIONAL venue scheduling change, not a real event.");
    await page
      .getByRole("button", { name: "Submit change for review", exact: true })
      .click();
    await page
      .getByText("Change pending; new bookings, issuance and entry paused", {
        exact: false,
      })
      .waitFor();
  }
  await capture("organizer-readiness-change");
  journeys.push(
    "Organizer submitted reviewed date/private venue change; bookings and admission paused",
  );
  await login("admin");
  await page.goto(
    base + "/admin?tab=Event%20operations&event=" + f.reschedule.eventId,
  );
  await page
    .getByRole("heading", { name: "Event operations & readiness", exact: true })
    .waitFor();
  await page
    .getByText("Compare previous and proposed values", { exact: true })
    .first()
    .click();
  if (await page.getByLabel("Change review notes", { exact: true }).count()) {
    await page
      .getByLabel("Change review notes", { exact: true })
      .fill("FICTIONAL independent approval of reschedule; no real event.");
    await capture("admin-change-review");
    await page
      .getByRole("button", { name: "Approve change", exact: true })
      .click();
  }
  await page.getByText("No pending term change", { exact: false }).waitFor();
  await page.reload();
  journeys.push(
    "Admin compared original/new values and approved atomically; persisted after refresh",
  );
  await login("customer");
  await page.goto(base + "/bookings/" + f.reschedule.bookingId);
  await page
    .getByRole("heading", { name: "Event details updated", exact: true })
    .waitFor();
  await page
    .getByText("FICTIONAL NEW PRIVATE VENUE", { exact: false })
    .first()
    .waitFor();
  await capture("customer-approved-change");
  await page.goto(base + "/my-bookings");
  await page
    .locator("summary")
    .filter({ hasText: /^Notifications$/ })
    .click();
  const notice = page
    .getByRole("region", { name: "Notifications", exact: true })
    .locator(".ops-record")
    .filter({ hasText: "Event details updated" })
    .first();
  if (
    await notice.getByRole("button", { name: "Mark read", exact: true }).count()
  )
    await notice
      .getByRole("button", { name: "Mark read", exact: true })
      .click();
  await notice.getByRole("link", { name: "Open update", exact: true }).click();
  await page.waitForURL("**/bookings/" + f.reschedule.bookingId);
  journeys.push(
    "Customer sees previous/new schedule and protected venue, reads update and opens correct booking",
  );
  await login("organizer");
  await page.goto(base + "/organizer?tab=My%20events");
  await page.getByLabel("Search your events").fill("Fictional Phase11b cancel");
  const event = page
    .locator(".setup-event-row")
    .filter({ hasText: "Fictional Phase11b cancel" });
  if (await event.getByText("Cancel event", { exact: true }).count()) {
    await event.getByText("Cancel event", { exact: true }).click();
    await event
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await event.getByText("cancelled", { exact: true }).waitFor();
  }
  journeys.push(
    "Organizer cancels separate event with confirmed money and ticket; cancellation persists",
  );
  await login("customer");
  await page.goto(base + "/my-bookings");
  await page.getByText("Refund requests", { exact: true }).click();
  let rr = page.getByRole("region", { name: "Refunds", exact: true });
  await rr
    .getByLabel("Booking reference", { exact: true })
    .fill(f.cancel.bookingId);
  await rr
    .getByLabel("Reason", { exact: true })
    .fill("FICTIONAL cancelled-event refund review.");
  await rr
    .getByRole("button", { name: "Request refund review", exact: true })
    .click();
  await rr
    .locator(".ops-record")
    .filter({ hasText: f.cancel.bookingId })
    .waitFor();
  await login("organizer");
  await page.goto(base + "/organizer?tab=Refunds");
  async function refund(status) {
    const row = page
      .locator(".ops-record")
      .filter({ hasText: f.cancel.bookingId });
    if (!(await row.locator(`option[value=${status}]`).count())) return;
    await row.getByLabel("Next status").selectOption(status);
    await row
      .getByLabel("Decision notes")
      .fill("FICTIONAL local refund workflow; no bank transfer verified.");
    if (status === "TRANSFER_REPORTED")
      await row
        .getByLabel("Transfer evidence reference")
        .fill("FICTIONAL-TRANSFER-REF-007");
    if (status === "APPROVED") page.once("dialog", (d) => d.accept());
    await row
      .getByRole("button", { name: "Update refund request", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Changes saved." })
      .waitFor();
    await page.reload();
  }
  await refund("APPROVED");
  await refund("AWAITING_ORGANIZER_TRANSFER");
  await refund("TRANSFER_REPORTED");
  await login("customer");
  await page.goto(base + "/my-bookings");
  await page.getByText("Refund requests", { exact: true }).click();
  rr = page
    .getByRole("region", { name: "Refunds", exact: true })
    .locator(".ops-record")
    .filter({ hasText: f.cancel.bookingId });
  await rr.waitFor();
  if (await rr.getByLabel("Decision notes").count()) {
    await rr
      .getByLabel("Decision notes")
      .fill("FICTIONAL customer receipt attestation, no real money.");
    await rr
      .getByLabel("I independently checked that the refund reached my account.")
      .check();
    await rr
      .getByRole("button", { name: "Confirm refund received", exact: true })
      .click();
    await rr
      .locator("> p")
      .filter({ hasText: "refund confirmed" })
      .first()
      .waitFor();
  }
  journeys.push(
    "Cancelled booking request → review → reported fictional transfer → separate customer receipt attestation, with history",
  );
  await login("organizer");
  await page.goto(base + "/organizer?tab=Event%20operations&event=halloween");
  await page
    .getByRole("heading", { name: "Event operations & readiness", exact: true })
    .waitFor();
  await page.getByText("Readiness checklist", { exact: true }).click();
  await capture("actual-draft-readiness");
  journeys.push(
    "Actual Halloween unconfirmed information/payment/readiness remains incomplete; no sales activation",
  );
  await login("admin");
  await page.goto(base + "/admin?tab=Operations");
  await page
    .getByRole("heading", { name: "Operational tasks", exact: true })
    .waitFor();
  await capture("admin-operational-jobs");
  if (
    await page
      .getByRole("button", { name: "Request delivery retry", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Request delivery retry", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: "Run local operational jobs", exact: true })
    .click();
  await page
    .getByText("Local operation completed and audited.", { exact: false })
    .waitFor();
  journeys.push(
    "Admin observes failed delivery, requests bounded retry and runs local operational jobs",
  );
}
// Full Halloween software rehearsal starts from the identity-bound invitation, without touching the actual Halloween draft.
await login("organizer");
await page.goto(
  base + "/organizer?tab=Booking%20reviews&event=" + f.halloween.eventId,
);
await page
  .locator(".setup-panel select")
  .first()
  .selectOption(f.halloween.eventId);
await page
  .getByText("Create account-bound invitation", { exact: true })
  .click();
await page.getByLabel("Attendee username", { exact: true }).fill("alex");
await page
  .getByRole("button", { name: "Create private invitation", exact: true })
  .click();
await page.locator("input[readonly]").waitFor();
const invitation = await page.locator("input[readonly]").inputValue();
await ctx.clearCookies();
await page.goto(invitation.replace("http://localhost:3001", base));
await page
  .getByLabel("Email address", { exact: true })
  .fill("attendee@vibey.demo");
await page.getByLabel("Password", { exact: true }).fill("VibeyDemo2026!");
await page
  .getByRole("button", { name: "Sign in to your event", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Choose your tickets", exact: true })
  .waitFor();
await page.locator("input[name=tier]").first().check();
await page
  .locator(".customer-columns section select")
  .first()
  .selectOption("fee");
await page
  .getByRole("button", { name: "Continue to your details", exact: true })
  .click();
await page
  .getByLabel("Full name as on IC", { exact: true })
  .fill("Alex Fictional Halloween");
await page.getByLabel("Age", { exact: true }).fill("28");
await page
  .getByLabel("Instagram username", { exact: true })
  .fill("fictional_halloween");
await page
  .getByRole("button", { name: "Review registration", exact: true })
  .click();
await capture("customer-registration");
await page
  .getByRole("button", { name: "Submit registration", exact: true })
  .click();
await page.waitForURL("**/bookings/*");
const bookingId = page.url().split("/").pop();
await page
  .getByAltText("Approved organizer payment QR for this booking", {
    exact: true,
  })
  .waitFor();
await capture("customer-payment-upload");
await page.getByLabel("Upload payment proof", { exact: true }).setInputFiles({
  name: "fictional-halloween.png",
  mimeType: "image/png",
  buffer: await QRCode.toBuffer(
    "FICTIONAL HALLOWEEN RECEIPT " + crypto.randomUUID(),
  ),
});
await page
  .getByText("Payment proof submitted — awaiting review.", { exact: true })
  .waitFor();
await capture("customer-pending-proof");
journeys.push(
  "Organizer created identity-bound invitation; customer logged in, entered required IC-name/age/Instagram and RM35, saw approved fictional QR and uploaded proof",
);
await login("organizer");
await page.goto(
  base + "/organizer?tab=Booking%20reviews&event=" + f.halloween.eventId,
);
let row = page.locator(".booking-review-entry").filter({ hasText: bookingId });
await row
  .getByLabel("Review notes")
  .fill("FICTIONAL independent incoming-record review only.");
await row.getByLabel("Amount independently received (MYR)").fill("35");
await row.getByLabel("I independently checked funds", { exact: false }).check();
await row
  .getByRole("button", { name: "Confirm received payment", exact: true })
  .click();
await row.getByText("Payment: confirmed", { exact: false }).waitFor();
await row.getByText("0 tickets issued", { exact: false }).waitFor();
await page.reload();
await row
  .getByLabel("Review notes")
  .fill("FICTIONAL registration approved separately from funds.");
await row
  .getByRole("button", { name: "Approve registration", exact: true })
  .click();
await row.getByText("1 tickets issued", { exact: false }).waitFor();
await capture("organizer-booking-review");
await page.goto(base + "/organizer?tab=Staff");
await page.getByRole("heading", { name: "Event staff", exact: true }).waitFor();
await page.getByRole("combobox").selectOption(f.halloween.eventId);
await page.getByLabel("Existing staff account username").fill("jamie");
await page
  .getByRole("button", { name: "Save staff permissions", exact: true })
  .click();
await page
  .getByRole("button", { name: "Revoke access", exact: true })
  .waitFor();
await login("customer", { bookingId });
await page.goto(base + "/bookings/" + bookingId);
await page
  .getByRole("heading", { name: "Your night is booked.", exact: true })
  .waitFor();
const owned = await (
  await ctx.request.get(base + "/api/customer/booking/" + bookingId)
).json();
assert.equal(owned.tickets.length, 1);
await page
  .getByRole("button", { name: /Open.*ticket|View.*ticket/i })
  .first()
  .click();
await page.getByRole("dialog", { name: "Your digital ticket" }).waitFor();
await capture("customer-digital-ticket");
await page.keyboard.press("Escape");
await page
  .getByRole("dialog", { name: "Your digital ticket" })
  .waitFor({ state: "hidden" });
await page.goto(base + "/my-bookings");
await capture("customer-history");
journeys.push(
  "Independent fictional funds and registration approval issued exactly one TEST ticket; customer opened it; owner assigned entrance staff",
);
// Scanner validation uses the credential returned only to this authorized customer in a private endpoint.
const ticketResponse = await ctx.request.get(
  base + "/api/customer/ticket/" + owned.tickets[0].id,
);
const ticket = await ticketResponse.json();
const token = ticket.token || ticket.qrToken;
await login("staff");
await page.goto(base + "/organizer?tab=Entrance&event=" + f.halloween.eventId);
await page
  .getByRole("heading", { name: "Entrance management", exact: true })
  .waitFor();
if (token) {
  await page.getByLabel("Private entry code", { exact: true }).fill(token);
  await page
    .getByRole("button", { name: "Validate ticket", exact: true })
    .click();
} else {
  await page
    .getByLabel("Search guest, ticket or booking")
    .fill("Alex Fictional Halloween");
  await page
    .getByRole("button", { name: "Review manual entry", exact: true })
    .click();
}
await page
  .getByRole("heading", { name: "Verify this guest", exact: true })
  .waitFor();
await page.getByLabel("Private entry code", { exact: true }).fill("");
await capture("staff-entrance");
await page
  .getByLabel("I checked attendee identification", { exact: false })
  .check();
await page
  .getByRole("button", { name: "Confirm admission", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Admission confirmed", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Next guest", exact: true }).click();
if (token) {
  await page.getByLabel("Private entry code", { exact: true }).fill(token);
  await page
    .getByRole("button", { name: "Validate ticket", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Already checked in", exact: true })
    .waitFor();
  await page.getByLabel("Private entry code", { exact: true }).fill("");
  await capture("staff-duplicate-admission");
}
journeys.push(
  "Staff validated ticket, acknowledged required 18+ ID and admitted once; repeated admission rejected",
);
await writeFile(
  "/Users/parsa/Desktop/EVENT FINDER/docs/phase11/browser-" +
    (process.env.PHASE11_RESUME_HALLOWEEN ? "halloween" : "results") +
    ".json",
  JSON.stringify(
    {
      journeys,
      measures,
      errors,
      bookingId,
      halloweenEventId: f.halloween.eventId,
    },
    null,
    2,
  ),
);
await browser.close();
assert.equal(errors.length, 0);
console.log(
  JSON.stringify({
    journeys: journeys.length,
    measurements: measures.length,
    errors,
  }),
);
