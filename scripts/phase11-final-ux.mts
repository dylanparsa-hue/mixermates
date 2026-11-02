import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db } from "../lib/db";
assert(process.cwd() === "/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview");
assert(process.env.ISOLATED_TEST_DATA === "true" && process.env.TICKET_SALES_MODE === "disabled");
const base = "http://localhost:3061", out = "/Users/parsa/Desktop/EVENT FINDER/docs/phase11";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
await context.addInitScript(() => localStorage.setItem("mixermates-theme", "system"));
await context.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, r => r.abort());
const page = await context.newPage(), measures: any[] = [], errors: string[] = [];
page.on("pageerror", e => errors.push(e.message));
async function capture(name: string) {
  for (const theme of ["light", "dark"] as const) for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.waitForTimeout(80);
    const state = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      theme: document.documentElement.dataset.theme, broken: [...document.images].filter(i => i.complete && !i.naturalWidth).length }));
    assert.equal(state.theme, theme); assert(state.scroll <= state.width); assert.equal(state.broken, 0);
    measures.push({ name, theme, ...state });
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${out}/screenshots/${name}-${theme}-${width}.png`, fullPage: true });
  }
}
for (const role of ["organizer", "admin"]) {
  await page.goto(`${base}/${role}/login`);
  await page.getByLabel("Email address", { exact: true }).waitFor();
  await capture(role + "-login");
}
const p = "p11_" + randomUUID().replaceAll("-", "").slice(0, 12);
await db.event.create({ data: { id: p, slug: p, title: "Fictional public account rehearsal", description: "Local only; no money or real admission.",
  category: "House Party", genre: "House", city: "Test", venue: "Hidden", latitude: 0, longitude: 0, image: "/images/halloween.jpg",
  organizerId: "organizer", status: "PUBLISHED", origin: "REAL", testOnly: true, access: "PUBLIC", capacity: 10,
  configurationStatus: "FICTIONAL_APPROVED", reviewOutcome: "APPROVED", reviewedById: "admin", reviewedAt: new Date(), reviewNotes: "Fictional local account-flow acceptance only; no real verification.", startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 172800000),
  tiers: { create: { name: "General", price: 0, quantity: 10 } } } });
await context.clearCookies(); await page.goto(base + "/join/" + p);
await page.getByRole("button", { name: "Sign in to your event", exact: true }).waitFor();
await capture("customer-login");
await page.getByRole("button", { name: "New account for an open approved event", exact: true }).click();
await capture("customer-account-registration");
await page.getByLabel("Full name", { exact: true }).fill("Fictional Phase11 Guest");
await page.getByLabel("Username", { exact: true }).fill(p);
await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
await page.getByLabel("City", { exact: true }).fill("Test");
await page.getByLabel("Email address", { exact: true }).fill(p + "@example.test");
const password = randomUUID() + "fictional";
await page.getByLabel("Password", { exact: true }).fill(password);
const registered = page.waitForResponse(r => r.url().endsWith("/api/customer/register") && r.request().method() === "POST");
await page.getByRole("button", { name: "Create booking account", exact: true }).click();
assert((await registered).ok(), "The approved fictional public event permits account registration");
await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
await capture("customer-public-event-details");
await page.getByRole("button", { name: "Sign out", exact: true }).click();
await page.waitForURL(/coming-soon$/);
await page.goto(base + "/join/" + p);
await page.getByLabel("Email address", { exact: true }).fill(p + "@example.test");
await page.getByLabel("Password", { exact: true }).fill(password);
await page.getByRole("button", { name: "Sign in to your event", exact: true }).click();
await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
await context.clearCookies();
const response = await context.request.post(base + "/api/preview/login", { headers: { Origin: base }, data: { email: "organizer@vibey.demo", password: "VibeyDemo2026!" } });
assert(response.ok());
const setup = await (await context.request.get(base + "/api/setup")).json();
const e = setup.events.find((e: any) => e.id === "halloween-phase4-test");
assert(e && !e.bookings && e.cancellationImpact);
await page.goto(base + "/organizer?tab=My%20events");
await page.getByRole("heading", { name: "My events", exact: true }).waitFor();
const row = page.locator(".setup-event-row").filter({ hasText: "Halloween Party — Fictional Rehearsal" });
await row.getByText("Cancel event", { exact: true }).click();
await row.getByText(`${e.cancellationImpact.bookings} bookings`, { exact: false }).waitFor();
await capture("organizer-cancellation-impact");
assert.equal(errors.length, 0);
await writeFile(out + "/final-ux.json", JSON.stringify({ measures, errors, checks: ["Fictional public-event account registration, logout and password login completed in browser", "Private organizer cancellation impact renders aggregate counts; no cancellation performed"], eventId: p }, null, 2));
await browser.close(); await db.$disconnect();
console.log(JSON.stringify({ measurements: measures.length, errors }));
