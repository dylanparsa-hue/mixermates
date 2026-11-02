import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard";
import { localDateTime } from "../lib/event-config";
import { db } from "../lib/db";
assert(testLabEnvironment());
const base = process.env.APP_ORIGIN!,
  browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
await context.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const page = await context.newPage(),
  checks: string[] = [];
async function post(route: string, data: any = {}) {
  const r = await context.request.post(base + "/api/" + route, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), route + ": " + (await r.text()));
  return r.json();
}
try {
  const a = JSON.parse(await readFile(".local/test-lab-access.json", "utf8"));
  await post("test-lab/login", { code: a.accessCode });
  await post("test-lab/switch", { role: "Organizer" });
  const setup = await (await context.request.get(base + "/api/setup")).json(),
    recipient = setup.destinations.find((d: any) => d.status === "APPROVED");
  assert(recipient);
  const title = "TEST Private multi-tier event " + Date.now();
  await page.goto(base + "/create");
  await expect(page.locator("#title")).toBeVisible();
  await page.locator("#title").press("Enter");
  await expect(
    page.getByRole("heading", { name: "Event Details", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#title")).toBeFocused();
  checks.push("Keyboard Enter cannot skip invalid details");
  await page.locator("#title").fill(title);
  await page
    .locator("#startsLocal")
    .fill(localDateTime(new Date(Date.now() + 21 * 86400000)));
  await page
    .locator("#endsLocal")
    .fill(localDateTime(new Date(Date.now() + 21 * 86400000 + 7200000)));
  await page.locator("#timezone").fill("Asia/Kuala_Lumpur");
  await page.locator("#city").fill("Test City");
  await page.locator("#venue").fill("Fictional approximate area");
  await page
    .locator("#shortDescription")
    .fill("A clearly fictional private paid and free event for local QA.");
  await page.locator("#access").selectOption("PRIVATE");
  await page.getByText("More event details", { exact: true }).click();
  await page.locator("#privateVenue").fill("PRIVATE-FORMAT-TEST-ADDRESS");
  await page
    .locator("#policies")
    .fill(
      "Fictional local test only. No real purchase or admission; all test payments are simulated.",
    );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tickets", exact: true }),
  ).toBeVisible();
  await page.locator("#tier-0-quantity").fill("50");
  await page
    .getByRole("button", { name: "Add ticket type", exact: true })
    .click();
  await page.locator("#tier-1-name").fill("VIP test ticket");
  await page.locator("#tier-1-quantity").fill("50");
  await page
    .getByRole("radio", { name: "Paid ticket", exact: true })
    .nth(1)
    .check();
  await page.locator("#tier-1-price").fill("35.00");
  await page.getByText("Paid event requirements", { exact: true }).click();
  await page.locator("#paymentDestinationId").selectOption(recipient.id);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Photos, Preview & Submit",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByText("More photos & appearance", { exact: true }).click();
  await page.locator("#provided-artwork").selectOption("/images/neon.jpg");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved to your account", { exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).searchParams.get("edit")!;
  await page
    .getByRole("button", { name: "Submit Event for Review", exact: true })
    .click();
  await expect(
    page.getByText("Submitted for administrator review", { exact: true }),
  ).toBeVisible();
  checks.push(
    "Private event with free and paid tiers saved, previewed and submitted through three-step UI",
  );
  await post("test-lab/switch", { role: "Administrator" });
  await post("event-review", { eventId: id, decision: "APPROVE" });
  const event = await db.event.findUniqueOrThrow({
    where: { id },
    include: { tiers: true },
  });
  assert.equal(event.status, "PUBLISHED");
  assert.equal(event.access, "PRIVATE");
  assert.equal(event.tiers[1].price, 3500);
  assert.notEqual(event.reviewedById, event.organizerId);
  checks.push(
    "Independent admin approved verified fictional recipient; no money or real subscription",
  );
  await post("test-lab/switch", { role: "Customer" });
  const denied = await context.request.get(base + "/api/events/" + event.slug);
  assert.equal(denied.status(), 404);
  assert(!(await denied.text()).includes("PRIVATE-FORMAT-TEST-ADDRESS"));
  checks.push(
    "Uninvited customer cannot open generated private URL or obtain precise location",
  );
  await post("test-lab/switch", { role: "Organizer" });
  await page.goto(base + "/events/" + event.slug);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.goto(base + "/organizer?tab=Guest%20list&event=" + id);
  await expect(
    page.getByRole("navigation", { name: "Event tools" }),
  ).toBeVisible();
  const entrance = await context.request.get(base + "/api/entrance/" + id);
  assert(entrance.ok());
  checks.push(
    "Owner event page, contextual guest controls and scanner overview remain accessible",
  );
  await writeFile(
    "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1/format-results.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        eventId: id,
        multipleDates:
          "Deferred: existing model supports one range; no nonworking control added.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, checks: checks.length }));
} finally {
  await browser.close();
  await db.$disconnect();
}
