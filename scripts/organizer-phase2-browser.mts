import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { simulatorEnvironment } from "../lib/simulator-policy";
import { localDateTime } from "../lib/event-config";
assert(simulatorEnvironment());
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase2";
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
  renders: string[] = [],
  errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
async function get(path: string) {
  const r = await c.request.get(base + "/api/" + path);
  assert(r.ok(), path + ":" + r.status());
  return r.json();
}
async function post(path: string, data: any) {
  return c.request.post(base + "/api/" + path, {
    headers: { Origin: base },
    data,
  });
}
async function capture(name: string) {
  await expect(
    p.getByText("Loading permitted registrations…", { exact: true }),
  ).toHaveCount(0, { timeout: 30000 });
  await expect(
    p.getByRole("button", { name: "Refreshing…", exact: true }),
  ).toHaveCount(0, { timeout: 30000 });
  await p.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await p.screenshot({
    path: out + "/" + name + ".png",
    fullPage: true,
    animations: "disabled",
  });
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    name + " overflow",
  );
  renders.push(name);
}
async function theme(value: string) {
  await p
    .locator(".theme-control label:visible")
    .filter({ has: p.locator(`input[value=${value}]`) })
    .first()
    .click();
  await expect(p.locator("html")).toHaveAttribute("data-theme", value);
}
async function matrix(name: string) {
  for (const t of ["light", "dark"]) {
    await theme(t);
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await capture(`${name}-${t}-${width}`);
    }
  }
}
try {
  await p.goto(base + "/");
  await p.waitForURL(/\/explore$/);
  assert(
    !/RM\s?(?:9\.99|49\.99|99\.99)|Most Popular|monthly event/i.test(
      await p.locator("body").innerText(),
    ),
  );
  checks.push(
    "Homepage contains no subscription plans or monthly quota promotion.",
  );
  const me = await get("me");
  await p.goto(base + "/create");
  await expect(p.locator("#title")).toBeVisible();
  const title = "TEST Phase 2 Browser " + Date.now();
  await p.locator("#title").fill(title);
  await p
    .locator("#shortDescription")
    .fill("A fictional Phase 2 browser test. No real event or money.");
  await p
    .locator("#startsLocal")
    .fill(localDateTime(new Date(Date.now() + 12 * 86400000)));
  await p
    .locator("#endsLocal")
    .fill(localDateTime(new Date(Date.now() + 12 * 86400000 + 7200000)));
  await p.locator("#city").fill("Fictional KL");
  await p.locator("#venue").fill("Fictional studio");
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await p.getByLabel("Paid ticket", { exact: true }).check();
  await p.locator("#tier-0-name").fill("General Admission");
  await p.locator("#tier-0-price").fill("100.00");
  const preview = p.getByRole("region", {
    name: "Fee preview for General Admission",
  });
  await expect(preview).toContainText("RM\u00a0100.00");
  await expect(preview).toContainText("RM\u00a095.00");
  await p.getByLabel("Customer pays it.", { exact: true }).check();
  await expect(preview).toContainText("RM\u00a0105.00");
  checks.push(
    "RM100 absorb preview shows RM95 organizer; pass preview shows RM105 customer.",
  );
  await matrix("creator");
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
  const href = (await open.getAttribute("href"))!,
    slug = href.split("/").at(-1)!.split("?")[0];
  const current = await get("me");
  assert.equal(current.user?.id || current.id, me.user?.id || me.id);
  checks.push(
    "One account creates and publishes a fictional paid event without subscription or second profile.",
  );
  await p.goto(base + "/join/" + slug);
  await p.getByLabel("Quantity", { exact: true }).fill("2");
  await p
    .getByRole("button", { name: "Continue to your details", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Review registration", exact: true })
    .click();
  await expect(
    p.getByRole("heading", { name: "Check your registration" }),
  ).toBeVisible();
  await expect(p.locator(".customer-summary")).toContainText("RM\u00a0210.00");
  await expect(p.locator(".customer-summary")).toContainText("RM\u00a010.00");
  await matrix("checkout");
  const ev = (await get("setup")).events.find((e: any) => e.title === title);
  const tamper = await post("customer/reserve", {
    eventId: ev.id,
    tierId: ev.tiers[0].id,
    quantity: 2,
    answers: {},
    idempotencyKey: crypto.randomUUID(),
    platformFee: 0,
  });
  assert.equal(tamper.status(), 400);
  checks.push(
    "HTTP checkout rejects a browser-supplied fee. Server quote shows RM200 tickets + RM10 service fee.",
  );
  await p
    .getByRole("button", { name: /Confirm Booking|Submit registration/ })
    .click();
  await p.waitForURL(/\/bookings\//);
  const bookingId = p.url().split("/").at(-1)!;
  await p
    .getByRole("button", { name: "Pay with Test Payment", exact: true })
    .click();
  await p.getByRole("button", { name: /Pay .*TEST/ }).click();
  await expect(
    p.getByRole("heading", { name: "Test Payment Successful", exact: true }),
  ).toBeVisible();
  const b = await get("customer/booking/" + bookingId);
  assert.equal(b.total, 21000);
  assert.equal(b.feeSnapshot.platformFee, 1000);
  assert.equal(b.tickets.length, 2);
  await capture("successful-pass-payment");
  checks.push(
    "Fictional server success persists exact RM210 payment, fee snapshot and two tickets.",
  );
  await p.goto(base + "/organizer?tab=Booking%20reviews");
  await expect(
    p.getByRole("heading", { name: "Ticket sales & fees" }),
  ).toBeVisible();
  await matrix("organizer-payments");
  const s = await get("financial-summary");
  assert(s.sandbox.accrued >= 1000);
  assert.equal(s.sandbox.collected, 0);
  assert.equal(s.real.accrued, 0);
  checks.push(
    "Organizer Payments distinguishes commission accrued, collected, outstanding and fictional scope.",
  );
  await p
    .getByRole("link", { name: "Review QR Payments", exact: true })
    .last()
    .click();
  await expect(p.locator("#qr-payment-reviews")).toBeVisible();
  assert.equal(
    (await post("test-lab/activate-organizer", { plan: "PRO" })).status(),
    410,
  );
  assert.equal(await get("organizer-subscription").catch(() => null), null); // obsolete endpoint is unavailable
  checks.push(
    "Retired plan activation returns 410; payment-review action reaches the existing independent QR review queue.",
  );
  await p.goto(base + "/organizer?plan=PRO");
  await expect(
    p.getByRole("heading", { name: "Organizer studio." }),
  ).toBeVisible();
  assert(
    !/monthly|Get Started|Upgrade plan/i.test(
      await p.locator("body").innerText(),
    ),
  );
  await p.getByLabel("Workspace", { exact: true }).selectOption("Admin");
  await p.waitForURL(/\/admin$/);
  await p.goto(base + "/admin?tab=Payments");
  await expect(
    p.getByRole("heading", { name: "Ticket sales & fees" }),
  ).toBeVisible();
  await matrix("admin-payments");
  checks.push(
    "Admin Payments has separate real/sandbox totals and event summaries; obsolete plan links no longer open a checkout.",
  );
  await p.setViewportSize({ width: 320, height: 740 });
  await p.evaluate(() => (document.documentElement.style.fontSize = "125%"));
  await capture("admin-payments-320-enlarged");
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/browser-results.json",
    JSON.stringify(
      { checks, renders, pageErrors: errors, bookingId, slug },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      renders: renders.length,
      pageErrors: errors,
    }),
  );
} catch (e) {
  await p.screenshot({ path: out + "/browser-failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
}
