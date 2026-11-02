import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment());
const base = process.env.APP_ORIGIN,
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes",
  state = JSON.parse(await readFile(".local/ui-fixes-session.json", "utf8"));
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
    storageState: {
      cookies: state.cookies.filter((c) => c.name !== "vibey-session"),
      origins: state.origins,
    },
    viewport: { width: 390, height: 900 },
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const p = await c.newPage(),
  checks = [],
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(base + "/explore");
  await p.getByRole("button", { name: "Sign up", exact: true }).click();
  const modal = p.getByRole("dialog");
  await modal
    .getByLabel("Full name", { exact: true })
    .fill("Fictional Signup Tester");
  const name = "qa_" + randomUUID().replaceAll("-", "").slice(0, 12);
  await modal.getByLabel("Username", { exact: true }).fill(name);
  await modal
    .getByLabel("Email address", { exact: true })
    .fill(name + "@example.test");
  await modal
    .getByLabel("Password", { exact: true })
    .fill(randomUUID() + "Qa!");
  await modal.locator("input[name=dob]").fill("1995-02-14");
  await modal
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await p.getByRole("button", { name: "Account menu", exact: true }).click();
  await expect(p.locator("#account-panel")).toContainText(
    "Fictional Signup Tester",
  );
  checks.push("Normal mobile signup creates a fictional customer");
  const r = await c.request.get(base + "/api/me"),
    u = (await r.json()).user;
  assert.equal(u.role, "ATTENDEE");
  assert(!u.capabilities.includes("ORGANIZER"));
  const activation = await c.request.post(
    base + "/api/test-lab/activate-organizer",
    { headers: { Origin: base }, data: { plan: "STARTER" } },
  );
  assert.equal(activation.status(), 200);
  const upgraded = (await (await c.request.get(base + "/api/me")).json()).user;
  assert.equal(upgraded.id, u.id);
  assert.equal(upgraded.role, "ATTENDEE");
  assert(upgraded.capabilities.includes("ORGANIZER"));
  const admin = await c.request.get(base + "/api/admin");
  assert.equal(admin.status(), 403);
  checks.push(
    "Signup customer activates its own TEST plan and cannot claim admin authority",
  );
  await p.screenshot({
    path: out + "/journey/signup-mobile.png",
    fullPage: false,
  });
  assert.equal(errors.length, 0);
} finally {
  await writeFile(
    out + "/signup-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log({ checks, errors });
  await b.close();
}
