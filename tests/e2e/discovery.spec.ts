import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public app opens directly and protects private APIs", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(".coming-stage")).toHaveCount(0);
  await expect(page).not.toHaveTitle(/Coming Soon/);
  await expect(page.getByRole("button", {name:"Sign in",exact:true})).toBeVisible();
  await page.goto("/coming-soon");
  await expect(page).toHaveURL(/\/explore$/);
  const response=await request.get("/api/tickets");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("authorized discovery, theme and keyboard navigation use current selectors", async ({
  page,
  request,
  baseURL,
}) => {
  const credentials = JSON.parse(
    await readFile(".local/admin-access.json", "utf8"),
  );
  const response = await page.request.post("/api/admin/login", {
    headers: { Origin: baseURL! },
    data: { email: credentials.email, password: credentials.password },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: /YOUR NEXT.*NIGHT STARTS.*HERE/ }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search events", exact: true })
    .fill("Fictional");
  await expect(
    page.getByRole("heading", { name: "Your kind of nights" }),
  ).toBeVisible();
  for (const theme of ["Dark", "Light"] as const) {
    await page.getByRole("radio", { name: theme, exact: true }).first().check();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.toLowerCase(),
    );
  }
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("scanner access stays separate from finance and unrelated private records", async ({
  page,
  request,
  baseURL,
}) => {
  const fixture = JSON.parse(
    await readFile(".local/phase10-fixture.json", "utf8"),
  );
  const response = await page.request.post("/api/preview/login", {
    headers: { Origin: baseURL! },
    data: { email: "staff@vibey.demo", password: "VibeyDemo2026!" },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/organizer?tab=Entrance&event=" + fixture.halloween.eventId);
  await expect(
    page.getByLabel("Private entry code", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.get(
        "/api/customer/reconciliation/" + fixture.halloween.eventId,
      )
    ).status(),
  ).toBe(403);
  expect((await page.request.get("/api/admin")).status()).toBe(403);
});

test("organizer draft creation survives save and reload without publishing", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/preview/login", {
    headers: { Origin: baseURL! },
    data: { email: "organizer@vibey.demo", password: "VibeyDemo2026!" },
  });
  await page.goto("/create");
  const title = "Fictional Phase10 draft " + Date.now();
  await page.getByLabel("Event name", { exact: true }).fill(title);
  await page
    .getByLabel("Short description", { exact: true })
    .fill("A fictional local rehearsal; no real event or money.");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page).toHaveURL(/\/create\?edit=/);
  await page.reload();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    title,
  );
  await expect(page.locator(".setup-state")).toHaveText("draft");
});

test("private customer support receives a persisted administrator response", async ({
  page,
  baseURL,
}) => {
  const fixture = JSON.parse(
    await readFile(".local/phase10-fixture.json", "utf8"),
  );
  const credentials = JSON.parse(
    await readFile(".local/admin-access.json", "utf8"),
  );
  const customer = () =>
    page.request.post("/api/customer/login", {
      headers: { Origin: baseURL! },
      data: {
        email: "attendee@vibey.demo",
        password: "VibeyDemo2026!",
        context: { bookingId: fixture.reschedule.bookingId },
      },
    });
  expect((await customer()).ok()).toBeTruthy();
  await page.goto("/my-bookings");
  await page.getByText("Support cases", { exact: true }).click();
  const description = "Fictional Phase10 support rehearsal " + Date.now();
  await page.locator("select[name=category]").selectOption("OTHER");
  await page
    .getByLabel("Describe the issue", { exact: true })
    .fill(description);
  await page
    .getByRole("button", { name: "Open support case", exact: true })
    .click();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/admin/login", {
        headers: { Origin: baseURL! },
        data: { email: credentials.email, password: credentials.password },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin?tab=Support");
  const row = page.locator(".ops-record").filter({ hasText: description });
  await row.locator("select[name=status]").selectOption("RESOLVED");
  await row
    .getByLabel("Response to customer", { exact: true })
    .fill("Fictional local support response; no external message sent.");
  await row
    .getByRole("button", { name: "Save support response", exact: true })
    .click();
  await expect(row).toContainText("resolved");
  await page.context().clearCookies();
  expect((await customer()).ok()).toBeTruthy();
  await page.goto("/my-bookings");
  await page.getByText("Support cases", { exact: true }).click();
  await expect(
    page.locator(".ops-record").filter({ hasText: description }),
  ).toContainText("Fictional local support response");
});
