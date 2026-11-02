// Read-only visual/motion QA against one owned, fictional loopback workspace.
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
const workspace = await realpath(process.cwd());
assert.equal(
  workspace,
  "/Users/parsa/.codex/tmp/mixermates-phase11-20261027/ui-preview",
);
assert.equal(process.env.ISOLATED_TEST_DATA, "true");
assert.equal(process.env.TICKET_SALES_MODE, "disabled");
assert.equal(
  process.env.DATABASE_URL,
  "file:" + path.join(workspace, "prisma/audit.db"),
);
const base = "http://localhost:3071";
const out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-redesign";
await mkdir(out + "/screenshots", { recursive: true });
const admin = JSON.parse(await readFile(".local/admin-access.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ reducedMotion: "reduce" });
await ctx.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const page = await ctx.newPage(),
  errors = [],
  measures = [],
  motions = [];
page.on("pageerror", (e) => errors.push(e.message));
assert(
  (
    await ctx.request.post(base + "/api/admin/login", {
      headers: { Origin: base, "X-Forwarded-For": "198.51.100.41" },
      data: { email: admin.email, password: admin.password },
    })
  ).ok(),
);
const routes = [
  ["discovery", "/explore"],
  ["event-detail", "/events/neon-after-dark"],
  ["profile", "/profile"],
  ["friends", "/friends"],
  ["tickets", "/tickets"],
  ["create", "/create"],
  ["organizer-overview", "/organizer"],
  ["organizer-events", "/organizer?tab=My%20events"],
  ["admin-overview", "/admin"],
  ["admin-event-setup", "/admin?tab=Event%20setup"],
];
for (const [name, url] of routes) {
  await page.goto(base + url);
  await page.waitForLoadState("networkidle");
  await page
    .locator("img[loading=lazy]")
    .evaluateAll((imgs) => imgs.forEach((i) => (i.loading = "eager")));
  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
  );
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .locator(".theme-control label:visible")
        .filter({ has: page.locator("input[value=" + theme + "]") })
        .last()
        .click();
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
      });
      const state = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        theme: document.documentElement.dataset.theme,
        broken: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.alt),
        heading: document.querySelector("h1")?.textContent,
      }));
      assert.equal(state.theme, theme);
      assert(state.scroll <= width, `${name} overflow ${width}`);
      assert.equal(state.broken.length, 0, `${name} broken image`);
      assert(state.heading, `${name} missing heading`);
      measures.push({ name, ...state });
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `${out}/screenshots/${name}-${theme}-${width}.png`,
          fullPage: true,
        });
    }
}
await page.goto(base + "/explore");
await page.locator(".mm-feature").waitFor();
await page.setViewportSize({ width: 1440, height: 900 });
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.reload();
await page.locator(".mm-feature").waitFor();
await page.waitForTimeout(950);
const band = page.locator(".mm-band-track");
const moving = await band.evaluate((e) => getComputedStyle(e).transform);
await page.waitForTimeout(160);
assert.notEqual(
  await band.evaluate((e) => getComputedStyle(e).transform),
  moving,
);
await page
  .getByRole("button", { name: "Pause moving text", exact: true })
  .click();
await page.waitForFunction(
  () =>
    getComputedStyle(document.querySelector(".mm-band-track"))
      .animationPlayState === "paused",
);
await page.waitForTimeout(70);
const paused = await band.evaluate((e) => getComputedStyle(e).transform);
await page.waitForTimeout(160);
assert.equal(await band.evaluate((e) => getComputedStyle(e).transform), paused);
motions.push("Marquee moves and its accessible pause control stops it");
await page.mouse.move(0, 0);
await page.evaluate(() => scrollTo(0, 240));
await page.waitForTimeout(100);
assert.notEqual(
  await page
    .locator(".mm-cinematic-hero")
    .evaluate((e) => e.style.getPropertyValue("--hero-shift")),
  "0px",
);
motions.push("Hero background responds to scroll");
await page.locator(".event-card").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator(".event-card").first().hover();
await page.waitForTimeout(700);
assert.notEqual(
  await page
    .locator(".card-image img")
    .first()
    .evaluate((e) => getComputedStyle(e).transform),
  "none",
);
motions.push("Fine-pointer card image zoom responds to hover");
await page.emulateMedia({ reducedMotion: "reduce" });
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(100);
assert.equal(
  await band.evaluate((e) => getComputedStyle(e).animationName),
  "none",
);
assert.equal(
  await page
    .locator(".mm-hero-image")
    .evaluate((e) => getComputedStyle(e).transform),
  "none",
);
motions.push("Reduced motion stops ticker, hero parallax and CSS animation");
await page
  .getByLabel("Search events", { exact: true })
  .fill("NO_SUCH_FICTIONAL_EVENT_2026");
await page
  .getByRole("heading", { name: "A different vibe is out there." })
  .waitFor();
motions.push("Empty search state is actionable");
await page.getByRole("button", { name: "Clear search", exact: true }).click();
await page.getByRole("button", { name: "Filters", exact: true }).click();
await page.getByLabel("Filter city", { exact: true }).selectOption("Penang");
await page.getByRole("button", { name: "Reset filters", exact: true }).click();
motions.push("Expanded filters and reset retain their behavior");
await page.getByRole("button", { name: "Account menu", exact: true }).click();
await page
  .getByRole("link", { name: "Admin dashboard", exact: true })
  .waitFor();
motions.push("Account navigation opens and retains authorized destinations");
assert.equal(errors.length, 0, JSON.stringify(errors));
await writeFile(
  out + "/core-ui-results.json",
  JSON.stringify({ measures, motions, errors }, null, 2),
);
await browser.close();
console.log(JSON.stringify({ executions: measures.length, motions, errors }));
