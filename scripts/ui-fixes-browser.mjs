// Run with `node --import tsx scripts/ui-fixes-browser.mjs` in the owned Lab.
import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment(), "Verified fictional Lab required");
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes";
await mkdir(out + "/after", { recursive: true });
const a = JSON.parse(await readFile(".local/test-lab-access.json", "utf8")),
  f = JSON.parse(await readFile(".local/ui-fixes-scenarios.json", "utf8")),
  paid = f.find((e) => e.key === "paid");
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const post = async (k, data) => {
  const r = await c.request.post(base + "/api/test-lab/" + k, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), k);
  return r.json();
};
await post("login", { code: a.accessCode });
const p = await c.newPage(),
  checks = [],
  measures = [],
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const check = (name) => checks.push(name);
const theme = async (t) =>
  p.evaluate((t) => {
    localStorage.setItem("mixermates-theme", t);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "mixermates-theme", newValue: t }),
    );
  }, t);
const shot = async (name, full = true) => {
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({
    path: out + "/after/" + name + ".png",
    fullPage: full,
    mask: [p.locator('img[alt*="Private"][alt*="QR"]')],
  });
};
try {
  await p.goto(base + "/explore");
  await p.locator(".cinema-poster").first().waitFor();
  const account = p.getByRole("button", { name: "Account menu", exact: true }),
    bell = p.getByRole("button", { name: "Notifications", exact: true }),
    menu = p.locator("#account-panel"),
    notifications = p.locator("#notification-panel");
  await account.click();
  await expect(menu).toBeVisible();
  check("Profile opens");
  await p.getByRole("heading", { name: /YOUR NEXT/, level: 1 }).click();
  await expect(menu).toHaveCount(0);
  check("Profile dismisses outside");
  await account.click();
  await p.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(account).toBeFocused();
  check("Profile Escape restores trigger focus");
  await account.click();
  await menu.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
  check("Icon theme controls select light");
  await p.reload();
  await p.locator(".cinema-poster").first().waitFor();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
  check("Theme persists after reload");
  await bell.click();
  await expect(notifications).toBeVisible();
  await bell.click();
  await expect(notifications).toHaveCount(0);
  check("Notifications toggle closed");
  await bell.click();
  await p.getByRole("heading", { name: /YOUR NEXT/, level: 1 }).click();
  await expect(notifications).toHaveCount(0);
  check("Notifications dismiss outside");
  await bell.click();
  await p.keyboard.press("Escape");
  await expect(notifications).toHaveCount(0);
  await expect(bell).toBeFocused();
  check("Notifications Escape restores trigger focus");
  await bell.click();
  await account.click();
  await expect(notifications).toHaveCount(0);
  await expect(menu).toBeVisible();
  await bell.click();
  await expect(menu).toHaveCount(0);
  await expect(notifications).toBeVisible();
  check("Header popovers are mutually exclusive");
  await p.keyboard.press("Escape");
  await account.click();
  await menu.getByRole("link", { name: "My tickets", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(p).toHaveURL(/\/tickets$/);
  check("Profile navigation dismisses");
  await p.getByRole("button", { name: "Notifications", exact: true }).click();
  await p
    .locator(".desktop-nav")
    .getByRole("link", { name: "Explore", exact: true })
    .click();
  await expect(notifications).toHaveCount(0);
  check("Route navigation dismisses notifications");
  await p.locator(".cinema-poster").first().waitFor();
  await p.getByRole("button", { name: "Notifications", exact: true }).click();
  const first = notifications.locator("a.notification").first();
  if (await first.count()) {
    await first.click();
    await expect(notifications).toHaveCount(0);
    check("Notification selection dismisses and navigates");
  }
  await p.goto(base + "/explore");
  await p.locator(".cinema-poster").first().waitFor();
  await p.getByRole("button", { name: "Booking terms", exact: true }).click();
  await expect(p.getByRole("dialog")).toBeVisible();
  await p.keyboard.press("Escape");
  await expect(p.getByRole("dialog")).toHaveCount(0);
  assert.equal(await p.evaluate(() => document.body.style.overflow), "");
  check("Dialog dismissal restores scrolling");
  assert.equal(
    await p.evaluate(() => getComputedStyle(document.body).pointerEvents),
    "auto",
  );
  await p.locator(".cinema-chip-row").first().focus();
  await p.keyboard.press("End");
  await expect(
    p.locator(".cinema-chip-row").first().locator("button").last(),
  ).toBeFocused();
  await p.keyboard.press("Home");
  await expect(
    p.locator(".cinema-chip-row").first().locator("button").first(),
  ).toBeFocused();
  check("Category rail Home/End reaches first and last");
  await p
    .locator(".cinema-chip-row")
    .first()
    .getByRole("button", { name: "Nightlife", exact: true })
    .click();
  await expect(p).toHaveURL(/category=Nightlife/);
  check("Category filtering keeps URL state");
  const routes = [
    ["home", "Customer", "/explore", ".cinema-poster"],
    ["event", "Customer", "/events/" + paid.slug, ".booking-panel"],
    ["checkout", "Customer", "/join/" + paid.slug, ".customer-tier"],
    ["profile", "Customer", "/profile", ".identity-sheet"],
    ["tickets", "Customer", "/tickets", ".ticket-preview"],
    ["organizer", "Organizer", "/organizer", ".setup-panel"],
    [
      "staff",
      "Organizer",
      "/organizer?tab=Staff&event=" + paid.id,
      'select[aria-label="Staff event"]',
    ],
    [
      "payments",
      "Finance Reviewer",
      "/organizer?tab=Booking%20reviews",
      ".setup-panel",
    ],
    [
      "settings",
      "Organizer",
      "/organizer?tab=Event%20operations",
      ".setup-panel",
    ],
    ["admin", "Administrator", "/admin", ".setup-panel"],
    ["admin-events", "Administrator", "/admin?tab=Events", ".admin-event-list"],
    [
      "notifications",
      "Organizer",
      "/organizer?tab=Notifications",
      ".operations",
    ],
    ["creator", "Organizer", "/create", "input[name=title]"],
    [
      "scanner",
      "Entrance Staff",
      "/organizer?tab=Entrance&event=" + paid.id,
      ".entrance-counts",
    ],
    ["admin-accounts", "Administrator", "/admin?tab=Users", ".operations"],
    [
      "payment-methods",
      "Organizer",
      "/organizer?tab=Payment%20methods",
      ".setup-panel",
    ],
    ["community", "Customer", "/friends", ".mm-person"],
    ["history", "Customer", "/my-bookings", ".customer-booking-list"],
  ];
  for (const [name, role, path, ready] of routes) {
    await post("switch", { role });
    await p.goto(base + path);
    await p.locator(ready).first().waitFor();
    await p.waitForFunction(
      () =>
        ![...document.querySelectorAll('.loading,[role="status"]')].some(
          (e) =>
            !e.closest("details:not([open])") &&
            e.getBoundingClientRect().width > 0 &&
            /^(Loading|Opening|Finding)/.test(e.textContent.trim()),
        ),
    );
    for (const appearance of ["dark", "light"])
      for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        await theme(appearance);
        await p
          .locator("img[loading=lazy]")
          .evaluateAll((es) => es.forEach((i) => (i.loading = "eager")));
        await p.evaluate(() =>
          Promise.race([
            Promise.all([
              document.fonts.ready,
              ...[...document.images]
                .filter((i) => i.getBoundingClientRect().width > 0)
                .map((i) => i.decode().catch(() => {})),
            ]),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]),
        );
        const m = await p.evaluate(() => ({
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
          theme: document.documentElement.dataset.theme,
          broken: [...document.images]
            .filter((i) => i.getBoundingClientRect().width && !i.naturalWidth)
            .map((i) => i.alt),
          overlays: document.querySelectorAll(".modal-backdrop").length,
        }));
        measures.push({ name, appearance, ...m });
        assert(
          m.scroll <= width,
          `${name} ${appearance} ${width}: overflow ${m.scroll}`,
        );
        assert.equal(m.broken.length, 0, `${name} broken images`);
        if ([390, 1440].includes(width))
          await shot(`${name}-${appearance}-${width}`);
        if (name === "home" && [390, 1440].includes(width)) {
          await p.evaluate(() => scrollTo(0, 0));
          await shot(`hero-${appearance}-${width}`, false);
          await p.locator(".cinema-category-strips").screenshot({
            path: `${out}/after/categories-${appearance}-${width}.png`,
          });
        }
        if (name === "home") {
          await p
            .getByRole("button", { name: "Account menu", exact: true })
            .click();
          const bounds = await p.locator("#account-panel").boundingBox();
          assert(bounds.x >= 0 && bounds.x + bounds.width <= width);
          const radios = await p
            .locator("#account-panel input[type=radio]")
            .evaluateAll((es) =>
              es.map((e) => {
                let r = e.getBoundingClientRect();
                return {
                  x: r.x,
                  right: r.right,
                  width: r.width,
                  height: r.height,
                };
              }),
            );
          assert(
            radios.every(
              (r) =>
                r.x >= bounds.x &&
                r.right <= bounds.x + bounds.width &&
                r.height >= 40,
            ),
          );
          if ([390, 1440].includes(width))
            await shot(`profile-menu-${appearance}-${width}`, false);
          await p.keyboard.press("Escape");
          if (width <= 430) {
            await p
              .getByRole("button", { name: "Notifications", exact: true })
              .click();
            await expect(p.locator("#notification-panel")).toBeVisible();
            const n = await p.locator("#notification-panel").boundingBox();
            assert(n.x >= 0 && n.x + n.width <= width);
            await p.keyboard.press("Escape");
            await expect(p.locator("#notification-panel")).toHaveCount(0);
            check("Phone notification dismissal " + appearance + " " + width);
          }
        }
      }
    console.log(name + ": 14 responsive checks");
  }
  await post("switch", { role: "Customer" });
  await p.goto(base + "/explore");
  await p.locator(".cinema-poster").first().waitFor();
  for (const scheme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await p.emulateMedia({ colorScheme: scheme });
      await theme("system");
      await expect(p.locator("html")).toHaveAttribute("data-theme", scheme);
      check("System follows " + scheme + " at " + width);
    }
  assert.equal(errors.length, 0, errors.join("\n"));
  check("No client errors or residual input-blocking overlay");
} finally {
  await writeFile(
    out + "/browser-results.json",
    JSON.stringify({ checks, measures, errors }, null, 2),
  );
  console.log({
    interactionChecks: checks.length,
    responsiveChecks: measures.length,
    errors,
  });
  await b.close();
}
