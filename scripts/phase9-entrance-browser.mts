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
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "../lib/db";
if (
  !process.env.DATABASE_URL?.includes("mixermates-phase9-20261027/preview/") ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Own isolated preview only");
const base = "http://localhost:3041",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/phase9",
  f = JSON.parse(await readFile(".local/phase9-fixture.json", "utf8")),
  admin = JSON.parse(await readFile(".local/admin-access.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  ctx = await browser.newContext({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  }),
  page = await ctx.newPage(),
  measures: any[] = [],
  errors: string[] = [],
  checks: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
async function login(role: string, bookingId?: string) {
  await ctx.clearCookies();
  const path =
    role === "admin"
      ? "admin/login"
      : role === "customer"
        ? "customer/login"
        : "preview/login";
  const data =
    role === "admin"
      ? admin
      : role === "customer"
        ? {
            email: "attendee@vibey.demo",
            password: "VibeyDemo2026!",
            context: bookingId ? { bookingId } : { history: true },
          }
        : { email: role + "@vibey.demo", password: "VibeyDemo2026!" };
  const r = await ctx.request.post(base + "/api/" + path, {
    headers: { Origin: base },
    data: {
      email: data.email,
      password: data.password,
      ...("context" in data ? { context: data.context } : {}),
    },
  });
  assert(r.ok(), "Login " + role);
}
async function capture(name: string, identity = false) {
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .locator(`.theme-control label:visible`)
        .filter({ has: page.locator(`input[value=${theme}]`) })
        .first()
        .click();
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        return document.fonts.ready;
      });
      const info = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        broken: [...document.images].filter(
          (i) => !i.complete || !i.naturalWidth,
        ).length,
      }));
      assert(info.scroll <= info.width, name + " overflow");
      assert.equal(info.broken, 0);
      let acknowledgement;
      if (identity) {
        acknowledgement = await page
          .locator(".entrance-confirm .checkbox")
          .evaluate((label: any) => ({
            width: label.clientWidth,
            height: label.clientHeight,
            inputWidth: label.querySelector("input").clientWidth,
            textWidth: label.querySelector("span").clientWidth,
          }));
        assert(acknowledgement.textWidth > 150);
        assert(acknowledgement.height < 160);
        assert(acknowledgement.inputWidth <= 28);
      }
      measures.push({ name, theme, viewport: width, ...info, acknowledgement });
      if ([390, 1440].includes(width))
        await page.screenshot({
          path:
            out + "/screenshots/" + name + "-" + theme + "-" + width + ".png",
          fullPage: true,
          mask: [page.getByLabel("Private entry code", { exact: true })],
        });
    }
}
await login("organizer");
for (const [name, tab, heading] of [
  ["organizer-overview", "Overview", ""],
  ["guest-list", "Guest list", ""],
  ["refunds", "Refunds", ""],
  ["support", "Support", ""],
  ["notifications", "Notifications", ""],
]) {
  await page.goto(
    base +
      "/organizer?tab=" +
      encodeURIComponent(tab) +
      "&event=" +
      f.halloween.eventId,
  );
  await page.locator(".setup-panel,.panel").first().waitFor();
  await capture(name);
}
await login("admin");
await page.goto(base + "/admin");
await page
  .getByRole("heading", { name: "Behind the good nights.", exact: true })
  .waitFor();
await capture("admin-overview");
await login("customer");
await page.goto(base + "/my-bookings");
await page.getByText("Support cases", { exact: true }).click();
await capture("customer-support");
const t = await db.ticket.findFirstOrThrow({
  where: {
    status: "ACTIVE",
    booking: { eventId: f.halloween.eventId, userId: "attendee" },
  },
});
await login("customer", t.bookingId);
const response = await ctx.request.get(base + "/api/customer/ticket/" + t.id);
assert(response.ok());
const owned = await response.json();
await page.goto(base + "/bookings/" + t.bookingId);
await page
  .getByRole("button", { name: /Open.*ticket|View.*ticket/i })
  .first()
  .click();
await page
  .getByRole("dialog", { name: "Your digital ticket", exact: true })
  .waitFor();
// The real decoder reads the owner's rendered QR privately; no image or credential is stored.
await page.evaluate(() => {
  const el = document.createElement("div");
  el.id = "p9b-qr-decoder";
  el.style.display = "none";
  document.body.append(el);
});
await page.addScriptTag({
  path: "node_modules/html5-qrcode/html5-qrcode.min.js",
});
const decoded = await page.evaluate(async () => {
  const img = document.querySelector<HTMLImageElement>(
    'img[alt="Private admission QR"]',
  )!;
  const blob = await (await fetch(img.src)).blob();
  const scanner = new (window as any).Html5Qrcode("p9b-qr-decoder");
  try {
    return await scanner.scanFile(
      new File([blob], "ticket.png", { type: "image/png" }),
      false,
    );
  } finally {
    scanner.clear();
  }
});
assert(
  decoded === owned.token,
  "Rendered owner QR matches authorized credential",
);
checks.push(
  "Owner rendered QR decoded to correct private credential; result kept only in memory",
);
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 844 });
  await page
    .getByRole("button", { name: "Full-screen QR", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Full-screen private entry QR",
    exact: true,
  });
  await dialog.waitFor();
  const box = await dialog.locator(".entry-qr-image").boundingBox();
  assert(
    box &&
      box.width > 180 &&
      box.x >= 0 &&
      box.x + box.width <= width &&
      box.y >= 0 &&
      box.y + box.height <= 844,
  );
  await page.keyboard.press("Tab");
  assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert(
    await page
      .getByRole("dialog", { name: "Your digital ticket", exact: true })
      .isVisible(),
  );
}
await page.keyboard.press("Escape");
checks.push(
  "Seven full-screen QR sizes fit; keyboard focus stays inside, Escape returns to ticket then booking",
);
await login("staff");
await page.goto(base + "/organizer?tab=Entrance&event=" + f.halloween.eventId);
await page.getByLabel("Private entry code", { exact: true }).fill(owned.token);
await page
  .getByRole("button", { name: "Validate ticket", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Verify this guest", exact: true })
  .waitFor();
await page.getByLabel("Private entry code", { exact: true }).fill("");
await capture("staff-id-acknowledgement", true);
assert(
  await page
    .getByRole("button", { name: "Confirm admission", exact: true })
    .isDisabled(),
);
await page
  .getByLabel("I checked attendee identification", { exact: false })
  .check();
assert(
  await page
    .getByRole("button", { name: "Confirm admission", exact: true })
    .isEnabled(),
);
await page.getByRole("button", { name: "Cancel", exact: true }).click();
checks.push(
  "Readable mobile ID acknowledgement and required confirmation gate; preview cancelled without using ticket",
);
await writeFile(
  out + "/browser-entrance.json",
  JSON.stringify({ measures, errors, checks }, null, 2),
);
await browser.close();
await db.$disconnect();
assert.equal(errors.length, 0);
console.log(JSON.stringify({ measurements: measures.length, checks, errors }));
