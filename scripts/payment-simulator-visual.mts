import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { simulatorEnvironment } from "../lib/simulator-policy";
import { localDateTime } from "../lib/event-config";
assert(simulatorEnvironment());
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/payment-simulator";
const b = await chromium.launch({ channel: "chrome", headless: true }),
  c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage(),
  checks: any[] = [];
async function capture(name: string) {
  await p.evaluate(()=>window.scrollTo(0,0));
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    name,
  );
  await p.screenshot({ path: out + "/" + name + ".png", fullPage: true });
  checks.push({ name, overflow: false });
}
try {
  await p.goto(base + "/create");
  await expect(p.locator("#title")).toBeVisible();
  await p.locator("#title").fill("TEST Creator visual check");
  await p
    .locator("#startsLocal")
    .fill(localDateTime(new Date(Date.now() + 15 * 86400000)));
  await p
    .locator("#endsLocal")
    .fill(localDateTime(new Date(Date.now() + 15 * 86400000 + 7200000)));
  await p.locator("#city").fill("Fictional KL");
  await p.locator("#venue").fill("Fictional studio");
  await p
    .locator("#shortDescription")
    .fill("A fictional draft for local mobile and desktop visual testing.");
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await p.getByLabel("Paid ticket", { exact: true }).check();
  await p.locator("#tier-0-price").fill("35.00");
  for (const theme of ["light", "dark"]) {
    await p
      .locator(".theme-control label:visible")
      .filter({ has: p.locator(`input[value=${theme}]`) })
      .first()
      .click();
    await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [375, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await capture(`creator-${theme}-${width}`);
    }
  }
  // Refresh final purchase captures after the spacing and checkout-order corrections.
  const f = JSON.parse(
    await readFile(out + "/browser-supplement-results.json", "utf8"),
  );
  await p.goto(base + "/bookings/" + f.premium);
  await expect(
    p.getByRole("heading", { name: "Test Payment Successful", exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await p
      .locator(".theme-control label:visible")
      .filter({ has: p.locator(`input[value=${theme}]`) })
      .first()
      .click();
    await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [375, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await capture(`checkout-${theme}-${width}`);
    }
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await capture("checkout-dark-landscape");
  await p.evaluate(() => {
    document.documentElement.style.fontSize = "125%";
  });
  await p.setViewportSize({ width: 390, height: 900 });
  await capture("checkout-dark-large-text-390");
  await writeFile(
    out + "/visual-results.json",
    JSON.stringify({ passed: true, checks, reducedMotion: true }, null, 2),
  );
  console.log(
    "18 creator/checkout/theme/large-text/landscape renders passed overflow checks.",
  );
} finally {
  await b.close();
}
