// Read-only rendering / reversible interaction QA in the verified fictional Test Lab.
import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
if (!testLabEnvironment()) throw Error("Owned disposable Test Lab required.");
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-correction";
const access = JSON.parse(
  await readFile(".local/test-lab-access.json", "utf8"),
);
const b = await chromium.launch({ channel: "chrome", headless: true });
const c = await b.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
await c.route(/^https?:\/\//, (r) => {
  const host = new URL(r.request().url()).hostname;
  return [
    "localhost",
    "127.0.0.1",
    "tiles.openfreemap.org",
    "fonts.openmaptiles.org",
  ].includes(host)
    ? r.continue()
    : r.abort();
});
assert(
  (
    await c.request.post(base + "/api/test-lab/login", {
      headers: { Origin: base },
      data: { code: access.accessCode },
    })
  ).ok(),
);
const post = async (action, data) => {
  const r = await c.request.post(base + "/api/test-lab/" + action, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), action);
  return r.json();
};
let s = await (await c.request.get(base + "/api/test-lab/state")).json();
const e = s.events.find((e) => e.status === "PUBLISHED");
assert(e);
await post("select", { eventId: e.id });
s = await (await c.request.get(base + "/api/test-lab/state")).json();
const booking = s.booking?.id;
const routes = [
  ["discovery", "Customer", "/explore", ".event-card"],
  ["map", "Customer", "/map", ".map-event"],
  ["event-detail", "Customer", "/events/" + e.slug, ".detail-cover"],
  ["checkout", "Customer", "/join/" + e.slug, ".customer-tier"],
  ["booking", "Customer", "/bookings/" + booking, ".customer-summary"],
  ["my-tickets", "Customer", "/my-bookings", ".customer-booking-list"],
  ["wallet", "Customer", "/tickets", ".tickets-page"],
  ["profile", "Customer", "/profile", ".identity-sheet"],
  ["community", "Customer", "/friends", ".mm-person"],
  ["test-lab", "Customer", "/test-lab", ".mm-lab-context"],
  ["organizer", "Organizer", "/organizer", ".setup-panel"],
  ["event-builder", "Organizer", "/create?edit=" + e.id, "input[name=title]"],
  [
    "finance",
    "Finance Reviewer",
    "/organizer?tab=Booking%20reviews",
    ".booking-review-entry",
  ],
  [
    "admin",
    "Administrator",
    "/admin",
    ".ops-metrics,.ops-grid,.metrics-grid,.operations",
  ],
  [
    "admin-event-setup",
    "Administrator",
    "/admin?tab=Event%20setup",
    ".setup-panel",
  ],
  [
    "entrance",
    "Entrance Staff",
    "/organizer?tab=Entrance&event=" + e.id,
    ".entrance-counts",
  ],
];
const p = await c.newPage(),
  errors = [],
  measures = [],
  issues = [],
  interactions = [];
p.on("pageerror", (err) => errors.push({ url: p.url(), message: err.message }));
await mkdir(out + "/screenshots", { recursive: true });
for (const [name, role, url, ready] of routes) {
  await post("switch", { role });
  await p.goto(base + url);
  await p.locator(ready).first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(250);
  await p
    .locator("img[loading=lazy]")
    .evaluateAll((imgs) => imgs.forEach((i) => (i.loading = "eager")));
  await p.evaluate(() =>
    Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
  );
  for (const theme of ["light", "dark"])
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await p
        .getByRole("radio", {
          name: theme === "light" ? "Light" : "Dark",
          exact: true,
        })
        .first()
        .check();
      await p.evaluate(() => {
        scrollTo(0, 0);
        return document.fonts.ready;
      });
      if (name === "map" && width >= 768) await p.waitForTimeout(1600);
      const geometry = await p.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        theme: document.documentElement.dataset.theme,
        broken: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.alt),
        wraps: [...document.querySelectorAll(".mm-person-actions .button")]
          .filter((e) => e.getBoundingClientRect().height > 60)
          .map((e) => e.textContent.trim()),
        unnamed: [
          ...document.querySelectorAll("button,input,select,textarea"),
        ].filter(
          (e) =>
            e.getBoundingClientRect().width &&
            !e.getAttribute("aria-label") &&
            !e.textContent.trim() &&
            !e.labels?.length &&
            !e.getAttribute("title") &&
            e.type !== "hidden",
        ).length,
      }));
      measures.push({ name, ...geometry });
      if (
        geometry.scroll > width ||
        geometry.broken.length ||
        geometry.wraps.length
      )
        issues.push({ name, ...geometry });
      if ([390, 1440].includes(width))
        await p.screenshot({
          path: `${out}/screenshots/${name}-${theme}-${width}.png`,
          fullPage: true,
          mask: [p.locator('img[alt="Private admission QR"]')],
        });
      if (name === "discovery" && [390, 1440].includes(width)) {
        for (const cls of ["mm-opening", "mm-halloween", "mm-invitations"])
          await p.locator("." + cls).screenshot({
            path: `${out}/screenshots/${cls}-${theme}-${width}.png`,
          });
      }
    }
  console.log(
    name +
      ": " +
      measures.filter((m) => m.name === name).length +
      " width/theme executions",
  );
}
await post("switch", { role: "Customer" });
await p.goto(base + "/explore");
await p
  .getByRole("textbox", { name: "Search events", exact: true })
  .fill("no-such-fictional-night");
await expect(
  p.getByText("A different vibe is out there.", { exact: true }),
).toBeVisible();
await p.getByRole("button", { name: "Clear search", exact: true }).click();
await p.getByRole("button", { name: "Filters", exact: true }).click();
await expect(
  p.getByRole("button", { name: "Reset filters", exact: true }),
).toBeVisible();
await p.getByRole("button", { name: "Reset filters", exact: true }).click();
interactions.push("Search empty state, clear and filter reset work");
await p.goto(base + "/friends");
await p.getByRole("tab", { name: "Discover", exact: true }).click();
await p.getByRole("tab", { name: "Discover", exact: true }).focus();
await p.keyboard.press("ArrowRight");
await expect(
  p.getByRole("tab", { name: "Friends", exact: true }),
).toHaveAttribute("aria-selected", "true");
await p.keyboard.press("End");
await expect(
  p.getByRole("tab", { name: "Messages", exact: true }),
).toHaveAttribute("aria-selected", "true");
await p.keyboard.press("Home");
await expect(
  p.getByRole("tab", { name: "Discover", exact: true }),
).toHaveAttribute("aria-selected", "true");
await p.getByLabel("Search people", { exact: true }).fill("not-a-person");
await expect(
  p.getByRole("heading", { name: "No matching people", exact: true }),
).toBeVisible();
interactions.push(
  "Community arrow/End/Home keyboard tabs and search empty state work",
);
await p.goto(base + "/map");
await p.getByLabel("Event period", { exact: true }).selectOption("past");
await expect(
  p.getByText("No past events match this category.", { exact: false }),
).toBeVisible();
await p.getByLabel("Event period", { exact: true }).selectOption("upcoming");
await p.setViewportSize({ width: 390, height: 844 });
await p.getByRole("button", { name: "Map", exact: true }).click();
await expect(p.locator(".map-container")).toBeVisible();
await p.getByRole("button", { name: "Event list", exact: true }).click();
await expect(p.locator(".map-list")).toBeVisible();
interactions.push("Map history/upcoming and mobile list/map switch work");
await p.emulateMedia({ reducedMotion: "reduce" });
await p.goto(base + "/explore");
await p.locator(".mm-opening h1").waitFor();
assert.equal(
  await p
    .locator(".mm-opening h1")
    .evaluate((e) => getComputedStyle(e).animationName),
  "none",
);
assert.equal(
  await p.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.effect?.target?.closest(".mm-opening,.event-grid"))
        .length,
  ),
  0,
);
interactions.push("Reduced motion stops the hero; cards are static");
await writeFile(
  out + "/responsive-results.json",
  JSON.stringify(
    {
      executions: measures.length,
      measures,
      issues,
      pageErrors: errors,
      interactions,
    },
    null,
    2,
  ),
);
await writeFile("../lab-storage.json", JSON.stringify(await c.storageState()), {
  mode: 0o600,
});
await b.close();
console.log(
  JSON.stringify({
    executions: measures.length,
    issues,
    pageErrors: errors,
    interactions,
  }),
);
