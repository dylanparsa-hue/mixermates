import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
assert(
  process.cwd() ===
    "/Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview",
);
const base = "http://localhost:3051",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/phase10";
const f = JSON.parse(await readFile(".local/phase10-fixture.json", "utf8")),
  admin = JSON.parse(await readFile(".local/admin-access.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  page = await ctx.newPage();
await ctx.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }),
);
await ctx.addInitScript({ content: "window.__name = (target) => target;" });
const results: any[] = [];
for (const role of ["admin", "organizer", "customer"]) {
  await ctx.clearCookies();
  const response = await ctx.request.post(
    base +
      "/api/" +
      (role === "admin"
        ? "admin/login"
        : role === "customer"
          ? "customer/login"
          : "preview/login"),
    {
      headers: { Origin: base },
      data:
        role === "admin"
          ? { email: admin.email, password: admin.password }
          : {
              email: (role === "customer" ? "attendee" : role) + "@vibey.demo",
              password: "VibeyDemo2026!",
              ...(role === "customer"
                ? { context: { bookingId: f.reschedule.bookingId } }
                : {}),
            },
    },
  );
  assert(response.ok());
  const routes =
    role === "admin"
      ? [
          "/explore",
          "/events/halloween-house-party",
          "/profile",
          "/admin?tab=Operations",
          "/admin?tab=Support",
        ]
      : role === "organizer"
        ? [
            "/organizer",
            "/organizer?tab=Booking%20reviews&event=" + f.halloween.eventId,
            "/organizer?tab=Guest%20list&event=" + f.halloween.eventId,
            "/organizer?tab=Entrance&event=" + f.halloween.eventId,
            "/organizer?tab=Refunds",
            "/organizer?tab=Notifications",
          ]
        : ["/my-bookings", "/bookings/" + f.reschedule.bookingId];
  for (const route of routes) {
    console.log(JSON.stringify({ role, route }));
    await page.goto(base + route);
    await page.waitForLoadState("networkidle");
    const info = await page.evaluate(() => {
      const visible = (e: Element) =>
        !!(e as HTMLElement).offsetParent &&
        getComputedStyle(e).visibility !== "hidden";
      const name = (e: Element) =>
        e.getAttribute("aria-label") ||
        (e.getAttribute("aria-labelledby") || "")
          .split(" ")
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
          .trim() ||
        (e as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
        e.getAttribute("title") ||
        (e instanceof HTMLButtonElement || e instanceof HTMLAnchorElement
          ? e.textContent?.trim()
          : "") ||
        "";
      const controls = Array.from(
        document.querySelectorAll(
          "button,input:not([type=hidden]),textarea,select,a[href]",
        ),
      ).filter(visible);
      const unnamed = controls
        .filter((e) => !name(e))
        .map((e) => ({
          tag: e.tagName,
          type: e.getAttribute("type"),
          class: e.className,
        }));
      const tiny = controls
        .filter(
          (e) =>
            !["checkbox", "radio"].includes(e.getAttribute("type") || "") &&
            !(e instanceof HTMLAnchorElement),
        )
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width < 24 || b.height < 24;
        })
        .map((e) => ({
          name: name(e).slice(0, 80),
          width: e.getBoundingClientRect().width,
          height: e.getBoundingClientRect().height,
        }));
      return {
        unnamed,
        tiny,
        controls: controls.length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        lang: document.documentElement.lang,
        liveRegions: document.querySelectorAll(
          "[role=alert],[role=status],[aria-live]",
        ).length,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
    results.push({ role, route, ...info });
  }
}
await ctx.clearCookies();
await page.goto(base + "/organizer/login");
await page.keyboard.press("Tab");
const focus = await page.evaluate(() => {
  const e = document.activeElement!;
  const s = getComputedStyle(e);
  return {
    tag: e.tagName,
    name: e.textContent?.trim().slice(0, 60),
    outlineStyle: s.outlineStyle,
    outlineWidth: s.outlineWidth,
  };
});
// A safe simulated server outage is rendered as an announced customer error, with no mutation.
await ctx.request.post(base + "/api/customer/login", {
  headers: { Origin: base },
  data: {
    email: "attendee@vibey.demo",
    password: "VibeyDemo2026!",
    context: { bookingId: f.reschedule.bookingId },
  },
});
await ctx.route("**/api/customer/bookings", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      error:
        "The service cannot verify this request right now. Refresh your saved status before retrying.",
    }),
  }),
);
await page.goto(base + "/my-bookings");
await page
  .getByRole("alert")
  .filter({ hasText: "Refresh your saved status" })
  .waitFor();
await writeFile(
  out + "/accessibility.json",
  JSON.stringify(
    {
      method:
        "Chrome DOM semantics, keyboard and reduced-motion checks; no physical screen reader or WCAG certification",
      results,
      keyboardFocus: focus,
      announcedOutageError: true,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    surfaces: results.length,
    unnamed: results.flatMap((r) => r.unnamed),
    tiny: results.flatMap((r) => r.tiny),
    overflows: results.filter((r) => r.overflow).length,
    announcedOutageError: true,
  }),
);
await browser.close();
