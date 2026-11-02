import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard";
import { localDateTime } from "../lib/event-config";
assert(testLabEnvironment());
const base = process.env.APP_ORIGIN!,
  browser = await chromium.launch({ channel: "chrome", headless: true });
const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  p = await c.newPage();
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
try {
  const a = JSON.parse(await readFile(".local/test-lab-access.json", "utf8")),
    f = JSON.parse(
      await readFile(
        "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1/browser-results.json",
        "utf8",
      ),
    );
  const post = async (k: string, data: any) => {
    const r = await c.request.post(base + "/api/test-lab/" + k, {
      headers: { Origin: base },
      data,
    });
    assert(r.ok());
  };
  await post("login", { code: a.accessCode });
  await post("switch", { role: "Customer" });
  await p.goto(base + "/create?edit=" + f.eventId);
  await expect(p.locator("#title")).toBeVisible();
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#tier-0-name")).toBeVisible();
  await p
    .getByRole("radio", { name: "Paid ticket", exact: true })
    .first()
    .check();
  await p.locator("#tier-0-price").fill("1.999");
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#tier-0-price")).toBeFocused();
  await expect(p.locator("#tier-0-price")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(p.locator("#tier-0-price")).toHaveAttribute(
    "aria-describedby",
    "tier-0-price-error",
  );
  await expect(p.locator("#tier-0-price-error")).toBeVisible();
  await p.locator("#tier-0-price").fill("35.00");
  await p.getByText("More ticket options", { exact: true }).first().click();
  await p
    .locator("#tier-0-saleEnd")
    .fill(localDateTime(new Date(Date.now() + 60 * 86400000)));
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#tier-0-saleEnd")).toBeFocused();
  await expect(p.locator("#tier-0-saleEnd")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(p.locator("#tier-0-saleEnd")).toHaveAttribute(
    "aria-describedby",
    "tier-0-saleEnd-error",
  );
  await expect(p.locator("#tier-0-saleEnd-error")).toBeVisible();
  const focused = await p.locator("#tier-0-saleEnd").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: innerHeight };
  });
  assert(
    focused.top >= 0 && focused.bottom <= focused.height,
    "Focused invalid input visible in viewport",
  );
  const labels = await p
    .locator(
      ".creator-editor input,.creator-editor textarea,.creator-editor select",
    )
    .evaluateAll((xs) =>
      xs
        .filter(
          (e: any) =>
            e.type !== "hidden" &&
            e.offsetParent !== null &&
            !e.getAttribute("aria-label") &&
            !e.labels?.length,
        )
        .map((e) => e.id),
    );
  assert.deepEqual(labels, []);
  await p.locator("#tier-0-saleEnd").fill("");
  await p.getByRole("button", { name: "Next", exact: true }).click();
  await expect(p.locator("#organizerVerification")).toBeFocused();
  await expect(p.locator("#organizerVerification-error")).toBeVisible();
  await expect(p.locator("#paymentDestinationId")).toHaveAttribute("aria-invalid", "true");
  await expect(p.locator("#paymentDestinationId")).toHaveAttribute("aria-describedby", "paymentDestinationId-help paymentDestinationId-error");
  await expect(p.locator("#paymentDestinationId-error")).toBeVisible();
  await expect(p.locator(".creator-progress button").nth(2)).toBeDisabled();
  await writeFile(
    "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-phase1/accessibility-results.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Invalid paid price has inline described error and keyboard focus",
          "Invalid sale window has inline described error and keyboard focus",
          "Focused recovery field is within mobile viewport",
          "Visible controls have labels",
          "Paid readiness blocks Tickets before preview with separate described errors and focus on organizer verification",
        ],
        focused,
        unlabeled: labels,
        screenReaderTested: false,
      },
      null,
      2,
    ),
  );
  console.log("Five accessibility checks passed.");
} finally {
  await browser.close();
}
