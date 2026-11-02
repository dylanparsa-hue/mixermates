// Fictional browser QA. Run only through the guarded local Test Lab environment.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { testLabEnvironment } from "../lib/test-lab-guard.ts";
assert(testLabEnvironment(), "Owned disposable localhost Test Lab required");

(async () => {
  const base = process.env.APP_ORIGIN,
    out = "/Users/parsa/Desktop/EVENT FINDER/docs/organizer-subscriptions",
    b = await chromium.launch({ channel: "chrome", headless: true });
  const state = JSON.parse(readFileSync(".local/ui-fixes-session.json"));
  mkdirSync(out, { recursive: true });
  const c = await b.newContext({
    storageState: state,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
    r.abort(),
  );
  const p = await c.newPage();
  const errors = [],
    checks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base + "/explore");
  if (p.url().includes("/test-lab")) {
    const a = JSON.parse(readFileSync(".local/test-lab-access.json"));
    assert(
      (
        await c.request.post(base + "/api/test-lab/login", {
          headers: { Origin: base },
          data: { code: a.accessCode },
        })
      ).ok(),
    );
  }
  assert(
    (
      await c.request.post(base + "/api/test-lab/workspace", {
        headers: { Origin: base },
        data: { workspace: "Customer" },
      })
    ).ok(),
  );
  await p.goto(base + "/explore");
  await p.locator(".pricing-card").last().waitFor();
  await p.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"])
    for (const width of [320, 390, 430, 768, 1024, 1280, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.evaluate((t) => {
        localStorage.setItem("mixermates-theme", t);
        dispatchEvent(
          new StorageEvent("storage", { key: "mixermates-theme", newValue: t }),
        );
      }, theme);
      await p.waitForFunction(
        (t) => document.documentElement.dataset.theme === t,
        theme,
      );
      await p.locator(".organizer-pricing").scrollIntoViewIfNeeded();
      const rects = await p.locator(".pricing-card").evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      assert.equal(rects.length, 3);
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width >= 1024)
        assert(rects.every((r) => Math.abs(r.y - rects[0].y) < 1));
      else assert(rects[1].y > rects[0].y + rects[0].height);
      for (const price of [/RM\s*9\.99/, /RM\s*49\.99/, /RM\s*99\.99/])
        await expect(p.locator(".pricing-grid")).toContainText(price);
      assert.equal(
        await p.getByText("Most Popular", { exact: true }).count(),
        1,
      );
      assert.equal(await p.locator(".pricing-card .button").count(), 3);
      await p
        .locator(".organizer-pricing")
        .screenshot({
          path: `${out}/pricing-${theme}-${width}.png`,
          style: ".bottom-nav {visibility:hidden !important}",
        });
      checks.push({ theme, width, cards: rects });
    }
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    await p.emulateMedia({ reducedMotion: "no-preference" });
    await p.goto(base + "/explore");
    await p.locator(".cinema-poster").first().waitFor();
    await p
      .locator(".organizer-pricing")
      .evaluate((e) =>
        e.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await p.waitForFunction(() =>
      document
        .querySelector(".organizer-pricing")
        .classList.contains("cinema-arrived"),
    );
    assert.equal(
      await p
        .locator(".pricing-grid")
        .evaluate((e) => getComputedStyle(e).animationName),
      "cinema-copy-in",
    );
    await p.waitForTimeout(600);
    assert.equal(
      await p
        .locator(".pricing-grid")
        .evaluate(
          (e) =>
            e.getAnimations().filter((a) => a.playState === "running").length,
        ),
      0,
    );
    await p.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await p
        .locator(".pricing-grid")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
  }
  checks.push({
    oneTimeReveal: true,
    reducedMotion: true,
    motionWidths: [390, 1440],
  });
  const controller = await c.storageState();
  // Each plan is activated through the real pricing CTA on a normal fictional customer account.
  for (const [index, id, name, limit] of [
    [0, "STARTER", "Starter", 2],
    [1, "PRO", "Pro", 7],
    [2, "BUSINESS", "Business", 25],
  ]) {
    await c.request.post(base + "/api/logout", {
      headers: { Origin: base },
      data: {},
    });
    const username = "sub_" + randomUUID().replaceAll("-", "").slice(0, 12);
    const registered = await c.request.post(base + "/api/register", {
      headers: { Origin: base },
      data: {
        name: "Fictional " + name + " Customer",
        username,
        email: username + "@example.test",
        password: randomUUID() + "Qa!",
        dob: "1995-02-14",
        city: "Kuala Lumpur",
      },
    });
    assert(registered.ok(), await registered.text());
    const before = await registered.json();
    await p.setViewportSize({ width: index === 1 ? 390 : 1440, height: 1000 });
    await p.goto(base + "/explore");
    await p
      .getByRole("link", { name: `Get Started with ${name}`, exact: true })
      .click();
    await p.waitForURL(new RegExp("plan=" + id));
    await expect(p.locator("#organizer-plan-choice")).toHaveValue(id);
    await p
      .getByRole("button", { name: `Activate ${name} TEST plan`, exact: true })
      .click();
    await p.waitForURL(/\/organizer$/);
    const summary = p.getByRole("region", {
      name: "Your organizer subscription",
    });
    await expect(summary).toContainText(`${name} plan`);
    await expect(summary).toContainText(`0 of ${limit} events used`);
    await expect(summary).toContainText("Renews");
    const me = (await (await c.request.get(base + "/api/me")).json()).user;
    assert.equal(me.id, before.id);
    assert.equal(me.email, before.email);
    assert.equal(me.role, "ATTENDEE");
    assert(me.capabilities.includes("ORGANIZER"));
    assert.equal((await c.request.get(base + "/api/admin")).status(), 403);
    const draft = await c.request.post(base + "/api/event-draft", {
      headers: { Origin: base },
      data: {
        creationKey: randomUUID(),
        title: "TEST " + name + " subscription night",
        description:
          "A fictional local subscription event. No real venue, money or admission.",
        category: "House Party",
        genre: "House",
        image: "/images/live.jpg",
        startsLocal: "2030-06-01T20:00",
        endsLocal: "2030-06-01T23:00",
        timezone: "Asia/Kuala_Lumpur",
        city: "Kuala Lumpur",
        venue: "Fictional local studio",
        capacity: 10,
        age: 18,
        access: "PUBLIC",
        approvalRequired: true,
        idCheckRequired: true,
        policies: "Fictional tests only; no real attendance.",
        tiers: [
          {
            name: "Free admission",
            price: 0,
            quantity: 10,
            minPerOrder: 1,
            maxPerOrder: 1,
          },
        ],
      },
    });
    assert(draft.ok(), await draft.text());
    const event = await draft.json();
    assert(
      (
        await c.request.post(base + "/api/event-submit", {
          headers: { Origin: base },
          data: { eventId: event.id },
        })
      ).ok(),
    );
    assert(
      (
        await c.request.post(base + "/api/test-lab/workspace", {
          headers: { Origin: base },
          data: { workspace: "Admin" },
        })
      ).ok(),
    );
    const approved = await c.request.post(base + "/api/event-review", {
      headers: { Origin: base },
      data: {
        eventId: event.id,
        decision: "APPROVE",
        notes: "Independent fictional publication review; no real event.",
      },
    });
    assert(approved.ok(), await approved.text());
    assert(
      (
        await c.request.post(base + "/api/test-lab/workspace", {
          headers: { Origin: base },
          data: { workspace: "Customer" },
        })
      ).ok(),
    );
    assert.equal(
      (await (await c.request.get(base + "/api/me")).json()).user.id,
      before.id,
    );
    const discoverable = await (
      await c.request.get(base + "/api/events")
    ).json();
    assert(
      discoverable.some(
        (e) =>
          e.id === event.id &&
          e.testOnly &&
          e.configurationStatus === "FICTIONAL_APPROVED",
      ),
    );
    await p.goto(base + "/organizer");
    await expect(summary).toContainText(`1 of ${limit} events used`);
    await p.screenshot({ path: `${out}/studio-${id.toLowerCase()}.png` });
    await summary
      .getByRole("button", { name: "Cancel at renewal", exact: true })
      .click();
    await summary
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await expect(summary).toContainText("Access ends");
    await summary
      .getByRole("button", { name: "Resume TEST renewal", exact: true })
      .click();
    await expect(summary).toContainText("Renews");
    for (const route of ["/my-bookings", "/tickets", "/friends", "/profile"]) {
      await p.goto(base + route);
      assert(!p.url().includes("/test-lab"));
      assert.equal(
        (await (await c.request.get(base + "/api/me")).json()).user.id,
        before.id,
      );
    }
    for (const workspace of ["Organizer", "Admin", "Customer"]) {
      assert(
        (
          await c.request.post(base + "/api/test-lab/workspace", {
            headers: { Origin: base },
            data: { workspace },
          })
        ).ok(),
      );
      const identity = (await (await c.request.get(base + "/api/me")).json())
        .user;
      if (workspace === "Admin") assert.notEqual(identity.id, before.id);
      else assert.equal(identity.id, before.id);
    }
    const other = await c.request.post(
      base + "/api/test-lab/activate-organizer",
      {
        headers: { Origin: base },
        data: { plan: id, userId: "some-other-user" },
      },
    );
    assert.equal(other.status(), 400);
    const forged = await c.request.post(
      base + "/api/test-lab/activate-organizer",
      { headers: { Origin: base }, data: { plan: id, verified: true } },
    );
    assert.equal(forged.status(), 400);
    const csrf = await c.request.post(
      base + "/api/test-lab/activate-organizer",
      { headers: { Origin: "https://example.test" }, data: { plan: id } },
    );
    assert.equal(csrf.status(), 404);
    checks.push({
      plan: id,
      limit,
      sameAccount: true,
      approvedEventDiscoverable: true,
      studioUsage: 1,
      customerRoutes: 4,
      cancelResume: true,
      workspaceIdentityPreserved: true,
      independentReviewerRetained: true,
      adminDenied: true,
      foreignIdentityAndActivationFlagsDenied: true,
      crossOriginDenied: true,
    });
  }
  await c.clearCookies();
  await c.addCookies(controller.cookies);
  await c.request.post(base + "/api/test-lab/workspace", {
    headers: { Origin: base },
    data: { workspace: "Customer" },
  });
  writeFileSync(
    ".local/ui-fixes-session.json",
    JSON.stringify(await c.storageState()),
    { mode: 0o600 },
  );
  const anonymous = await b.newContext();
  assert.equal(
    (
      await anonymous.request.post(base + "/api/test-lab/activate-organizer", {
        headers: { Origin: base },
        data: { plan: "BUSINESS" },
      })
    ).status(),
    401,
  );
  await anonymous.close();
  checks.push({ anonymousActivationDenied: true });
  assert.equal(errors.length, 0, errors.join("\n"));
  writeFileSync(
    out + "/browser-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks: checks.length, errors }));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
