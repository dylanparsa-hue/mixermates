import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { testLabEnvironment } from "../lib/test-lab-guard";
import { localDateTime } from "../lib/event-config";
import { db } from "../lib/db";
import sharp from "sharp";
assert(testLabEnvironment(), "Owned fictional Lab required");
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1";
await mkdir(out + "/screenshots", { recursive: true });
const access = JSON.parse(
  await readFile(".local/test-lab-access.json", "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
await context.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const page = await context.newPage(),
  pageErrors: string[] = [],
  checks: any[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
async function post(route: string, data: any = {}) {
  const r = await context.request.post(base + "/api/" + route, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), route + ": " + (await r.text()));
  return r.json();
}
async function capture(name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((i) => i.decode().catch(() => {})),
    );
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.screenshot({
    path: out + "/screenshots/" + name + ".png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert(!overflow, name + " overflow");
  checks.push({ name, overflow });
}
try {
  await post("test-lab/login", { code: access.accessCode });
  await post("test-lab/switch", { role: "Customer" });
  const before = (await (await context.request.get(base + "/api/me")).json())
    .user;
  await page.goto(base + "/create?step=3");
  await expect(page.locator("#title")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Event Details", exact: true }),
  ).toBeVisible();
  const after = (await (await context.request.get(base + "/api/me")).json())
    .user;
  assert.equal(after.id, before.id);
  assert.equal(after.role, before.role);
  assert(after.capabilities.includes("ORGANIZER"));
  assert.equal(await page.getByLabel("Your plan", { exact: true }).count(), 0);
  await expect(page.getByRole("button", { name: /3.*Photos/ })).toBeDisabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#title")).toBeFocused();
  await expect(
    page.getByText("Add an event name (at least 3 characters).", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Dark", exact: true }).first().check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await capture("mobile-dark-details-errors");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved to your account", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("#title")).toHaveValue("");
  const name = "TEST Neon After Dark " + Date.now();
  await page.locator("#title").fill(name);
  await page
    .locator("#startsLocal")
    .fill(localDateTime(new Date(Date.now() + 14 * 86400000)));
  await page
    .locator("#endsLocal")
    .fill(localDateTime(new Date(Date.now() + 14 * 86400000 + 7200000)));
  await page.locator("#timezone").fill("Asia/Kuala_Lumpur");
  await page.locator("#city").fill("Kuala Lumpur");
  await page.locator("#venue").fill("Fictional local venue");
  await page
    .locator("#shortDescription")
    .fill("A fictional local event for the organizer creator rehearsal.");
  for (const width of [390, 1440])
    for (const theme of ["dark", "light"]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("radio", {
          name: theme === "dark" ? "Dark" : "Light",
          exact: true,
        })
        .first()
        .check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await capture(`${width === 390 ? "mobile" : "desktop"}-${theme}-details`);
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tickets", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove ticket 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Add at least one ticket type.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add ticket type", exact: true })
    .click();
  await page.locator("#tier-0-quantity").fill("60");
  await page.locator("#tier-0-name").fill("Free RSVP");
  await page
    .getByRole("button", { name: "Add ticket type", exact: true })
    .click();
  await page.locator("#tier-1-name").fill("Guest RSVP");
  await page.locator("#tier-1-quantity").fill("40");
  // Exercise paid controls without activating any real payment or forcing paid submission.
  await page
    .getByRole("radio", { name: "Paid ticket", exact: true })
    .nth(1)
    .check();
  await page.locator("#tier-1-price").fill("25.50");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved to your account", { exact: true }),
  ).toBeVisible();
  const draftUrl = page.url();
  await page.reload();
  await expect(page.locator("#title")).toHaveValue(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#tier-1-price")).toHaveValue("25.50");
  for (const width of [390, 1440])
    for (const theme of ["dark", "light"]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("radio", {
          name: theme === "dark" ? "Dark" : "Light",
          exact: true,
        })
        .first()
        .check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await capture(`${width === 390 ? "mobile" : "desktop"}-${theme}-tickets`);
    }
  await page
    .getByRole("radio", { name: "Free RSVP", exact: true })
    .nth(1)
    .check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Photos, Preview & Submit",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit Event for Review", exact: true })
    .click();
  await expect(
    page.getByText("Upload a valid image or choose artwork.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#image")).toBeFocused();
  await page
    .locator("#image")
    .setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(
    page.getByText("Choose a PNG, JPG or WebP image up to 4 MB.", {
      exact: true,
    }),
  ).toBeVisible();
  const poster = await sharp({
    create: { width: 425, height: 601, channels: 3, background: "#c91e38" },
  })
    .png()
    .toBuffer();
  await page
    .locator("#image")
    .setInputFiles({
      name: "fictional-poster.png",
      mimeType: "image/png",
      buffer: poster,
    });
  await expect(page.getByAltText("Event poster preview")).toBeVisible();
  const banner = await sharp({
    create: { width: 1440, height: 450, channels: 3, background: "#32203e" },
  })
    .png()
    .toBuffer();
  await page
    .locator("#coverImage")
    .setInputFiles({
      name: "fictional-banner.png",
      mimeType: "image/png",
      buffer: banner,
    });
  await expect(page.getByAltText("Cover banner preview")).toBeVisible();
  for (const width of [390, 1440])
    for (const theme of ["dark", "light"]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("radio", {
          name: theme === "dark" ? "Dark" : "Light",
          exact: true,
        })
        .first()
        .check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await capture(`${width === 390 ? "mobile" : "desktop"}-${theme}-preview`);
    }
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved to your account", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("#title")).toHaveValue(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByAltText("Cover banner preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Submit Event for Review", exact: true })
    .click();
  await expect(
    page.getByText("Submitted for administrator review", { exact: true }),
  ).toBeVisible();
  const eventId = new URL(page.url()).searchParams.get("edit")!,
    event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  assert.equal(event.organizerId, before.id);
  assert.equal(event.status, "PENDING_REVIEW");
  await post("test-lab/switch", { role: "Administrator" });
  await post("event-review", { eventId, decision: "APPROVE" });
  const approved = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  assert.equal(approved.status, "PUBLISHED");
  assert.notEqual(approved.reviewedById, approved.organizerId);
  await post("test-lab/switch", { role: "Customer" });
  await page.goto(base + "/events/" + event.slug);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto(base + "/organizer?tab=Overview&event=" + eventId);
  await expect(
    page.getByRole("navigation", { name: "Event tools" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tickets", exact: true }).last().click();
  await expect(
    page.getByRole("heading", { name: "Ticket inventory", exact: true }),
  ).toBeVisible();
  await capture("desktop-light-studio-tickets");
  await page.goto(base + "/create?edit=" + eventId);
  await expect(page.locator("#title")).toBeVisible();
  await page
    .locator("#shortDescription")
    .fill(
      "Updated fictional details after independent review, still local only.",
    );
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved to your account", { exact: true }),
  ).toBeVisible();
  assert.equal(
    (await db.event.findUniqueOrThrow({ where: { id: eventId } })).status,
    "DRAFT",
  );
  assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
  await writeFile(
    out + "/browser-results.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        pageErrors,
        eventId,
        slug: event.slug,
        accountId: before.id,
        identityPreserved: true,
        independentReview: true,
        draftUrl,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: true,
      captures: checks.length,
      identityPreserved: true,
      independentReview: true,
      pageErrors,
    }),
  );
} finally {
  await browser.close();
  await db.$disconnect();
}
