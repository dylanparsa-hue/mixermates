import { chromium, expect, type BrowserContext } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { testLabEnvironment } from "../lib/test-lab-guard";
import { localDateTime } from "../lib/event-config";
assert(testLabEnvironment(), "Verified fictional loopback Lab required");
const base = process.env.APP_ORIGIN!,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ticket-step-validation";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks: string[] = [],
  errors: string[] = [];
async function post(c: BrowserContext, route: string, data: any = {}) {
  const r = await c.request.post(base + "/api/" + route, {
    headers: { Origin: base },
    data,
  });
  assert(r.ok(), route + ": " + (await r.text()));
  return r.json();
}
try {
  for (const width of [390, 1440]) {
    const c = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
      r.abort(),
    );
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/");
    await p.waitForURL(/\/explore$/);
    const suffix = Date.now().toString(36) + width;
    const account = await post(c, "register", {
      name: "Fictional validation tester",
      username: "validate_" + suffix,
      email: "validate_" + suffix + "@example.test",
      password: "FictionalValidation!2026",
      dob: "1995-01-01",
      city: "Test City",
    });
    await post(c, "become-organizer");
    const draft: any = {
      creationKey: randomUUID(),
      title: "TEST Paid validation " + suffix,
      category: "House Party",
      shortDescription:
        "An isolated fictional local event for validation checks.",
      startsLocal: localDateTime(new Date(Date.now() + 12 * 86400000)),
      endsLocal: localDateTime(new Date(Date.now() + 12 * 86400000 + 7200000)),
      timezone: "Asia/Kuala_Lumpur",
      city: "Test City",
      venue: "Fictional venue",
      access: "PUBLIC",
      capacity: 10,
      image: "/images/neon.jpg",
      tiers: [
        {
          name: "Paid admission",
          price: 4500,
          priceInput: "45.00",
          pricingMode: "PAID",
          quantity: 10,
          minPerOrder: 1,
          maxPerOrder: 4,
        },
      ],
    };
    const saved = await post(c, "event-workspace", { draft, advanceTo: 1 });
    await p.goto(base + "/create?edit=" + saved.event.id);
    await expect(p.locator("#title")).toBeVisible();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(p.locator("#tier-0-name")).toBeVisible();
    await expect(
      p.getByRole("heading", { name: "Paid event requirements", exact: true }),
    ).toBeVisible();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(p.locator("#organizerVerification")).toBeFocused();
    await expect(p.locator("#organizerVerification-error")).toBeVisible();
    await expect(p.locator(".creator-error-summary")).toBeVisible();
    await expect(p.locator(".creator-error-summary li")).toHaveCount(3);
    await expect(p.locator("#paymentDestinationId-error")).toBeVisible();
    await expect(p.locator("#policies-error")).toBeVisible();
    await expect(p.locator("#paymentDestinationId-error")).not.toContainText(
      "Organizer verification",
    );
    await expect(p.locator(".creator-progress button").nth(2)).toBeDisabled();
    assert.equal(
      await p
        .getByRole("button", { name: "Submit Event for Review", exact: true })
        .count(),
      0,
    );
    await expect(
      p.getByRole("link", {
        name: "Open organizer verification (new tab)",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/organizer?tab=Payment+methods#organizer-verification",
    );
    const r = await c.request.post(base + "/api/event-workspace", {
      headers: { Origin: base },
      data: {
        draft: {
          ...saved.form,
          id: saved.event.id,
          version: saved.event.stateVersion,
        },
        advanceTo: 2,
      },
    });
    assert.equal(r.status(), 400);
    const rejected = await r.json();
    assert(
      rejected.fieldErrors.organizerVerification &&
        rejected.fieldErrors.paymentDestinationId &&
        rejected.fieldErrors.policies,
    );
    assert.equal(rejected.step, 1);
    checks.push(
      `${width}px: paid requirements are visible; Next and a forged server advance both block on Tickets with separate actionable errors`,
    );
    for (const theme of ["light", "dark"]) {
      await p.evaluate((t) => {
        localStorage.setItem("mixermates-theme", t);
        window.dispatchEvent(
          new StorageEvent("storage", { key: "mixermates-theme", newValue: t }),
        );
      }, theme);
      await p.locator("#organizerVerification").focus();
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({
        path: `${out}/blocked-${width}-${theme}.png`,
        fullPage: true,
      });
    }
    await p.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(
      p.getByText("Draft saved to your account", { exact: true }),
    ).toBeVisible();
    const request = await post(c, "verification-submit", {
      note: "FICTIONAL local validation tester, independent test-only organizer review. No real identity, venue or funds.",
    });
    await p
      .getByRole("button", { name: "Refresh requirements", exact: true })
      .click();
    await expect(p.locator("#organizerVerification-error")).toContainText(
      "awaiting administrator review",
    );
    const admin = await browser.newContext();
    await post(admin, "test-lab/login");
    await post(admin, "test-lab/switch", { role: "Administrator" });
    await post(admin, "verification-review", {
      id: request.id,
      approve: true,
      notes:
        "FICTIONAL isolated validation only; no identity or sales authorization.",
      identityChecked: true,
    });
    const qr = await c.request.post(base + "/api/upload", {
      headers: { Origin: base },
      multipart: {
        file: {
          name: "fictional-recipient.png",
          mimeType: "image/png",
          buffer: await QRCode.toBuffer(
            "FICTIONAL TEST ONLY NO PAYMENT DETAILS",
          ),
        },
        private: "true",
        purpose: "PAYMENT_QR",
      },
    });
    assert(qr.ok(), await qr.text());
    const file = await qr.json();
    const recipient = await post(c, "payment-destination", {
      methodType: "BANK_QR",
      label: "TEST validation recipient",
      recipientName: "FICTIONAL recipient",
      recipientReference: "NO-BANK-ACCOUNT",
      qrAssetId: file.id,
    });
    await post(admin, "payment-destination-review", {
      versionId: recipient.id,
      decision: "APPROVE",
      notes: "FICTIONAL validation only",
      procedure:
        "FICTIONAL isolated test recipient; no real ownership or bank details exist.",
      recipientChecked: true,
    });
    await p
      .locator("#policies")
      .fill(
        "FICTIONAL entry conditions. Cancellation returns fictional test bookings for review. No real funds.",
      );
    await p
      .getByRole("button", { name: "Refresh requirements", exact: true })
      .click();
    await p
      .locator("#paymentDestinationId")
      .selectOption(recipient.destinationId);
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      p.getByRole("heading", { name: "Photos, Preview & Submit", exact: true }),
    ).toBeVisible();
    const before = (await (await c.request.get(base + "/api/me")).json()).user;
    assert.equal(before.id, account.id);
    assert.equal(before.role, "ATTENDEE");
    await p
      .getByRole("button", { name: "Submit Event for Review", exact: true })
      .click();
    await expect(
      p.getByText("Submitted for administrator review", { exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("heading", { name: "Photos, Preview & Submit", exact: true }),
    ).toBeVisible();
    const setup = await (await c.request.get(base + "/api/setup")).json();
    assert.equal(
      setup.events.find((e: any) => e.id === saved.event.id).status,
      "PENDING_REVIEW",
    );
    checks.push(
      `${width}px: incomplete draft saves; pending verification explains the review; independent fictional approval + owned recipient + conditions permit preview and submission without bouncing back`,
    );
    await p.goto(
      base + "/organizer?tab=Payment+methods#organizer-verification",
    );
    await expect(
      p.getByRole("button", { name: "Request verification", exact: true }),
    ).toBeVisible();
    checks.push(
      `${width}px: the verification action leads to the actual verification form`,
    );
    const advanced = await post(c, "event-workspace", {
      draft: {
        ...draft,
        creationKey: randomUUID(),
        title: "TEST Advanced validation " + suffix,
        tiers: [
          {
            ...draft.tiers[0],
            name: "Free admission",
            price: 0,
            priceInput: "0",
            pricingMode: "FREE",
          },
        ],
        entryOptions: [
          {
            key: "standard",
            label: "Standard entry",
            relationship: "UNCONFIRMED",
            price: null,
            proofRequired: false,
          },
        ],
      },
      advanceTo: 1,
    });
    await p.goto(base + "/create?edit=" + advanced.event.id);
    await expect(p.locator("#title")).toBeVisible();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(p.locator("#tier-0-name")).toBeVisible();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(p.locator("#entry-0-relationship")).toBeFocused();
    await expect(p.locator("#entry-0-price-error")).toBeVisible();
    await p.locator("#entry-0-relationship").selectOption("FEE");
    await p.locator("#entry-0-price").fill("1.999");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(p.locator("#entry-0-price")).toBeFocused();
    await expect(p.locator("#entry-0-price-error")).toContainText(
      "2 decimal places",
    );
    await p.locator("#entry-0-price").fill("0");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      p.getByRole("heading", { name: "Photos, Preview & Submit", exact: true }),
    ).toBeVisible();
    checks.push(
      `${width}px: unresolved advanced entry options stop on Tickets, nested disclosures open to the error, malformed price cannot advance, and corrected free entry reaches preview`,
    );
    await admin.close();
    await c.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/browser-results.json",
    JSON.stringify({ passed: true, checks, pageErrors: errors }, null, 2),
  );
  console.log(
    JSON.stringify({ passed: true, checks, pageErrors: errors }, null, 2),
  );
} finally {
  await browser.close();
}
