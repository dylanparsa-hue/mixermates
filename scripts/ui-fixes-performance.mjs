import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = "http://localhost:3095",
  out =
    "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes/optimized-results.json";
const b = await chromium.launch({ channel: "chrome" }),
  results = [];
try {
  for (const width of [390, 1440]) {
    const c = await b.newContext({ viewport: { width, height: 900 } });
    await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
      r.abort(),
    );
    const p = await c.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      window.__measure = { frames: [], long: [], shifts: [], lcp: [] };
      for (const [type, key] of [
        ["longtask", "long"],
        ["layout-shift", "shifts"],
        ["largest-contentful-paint", "lcp"],
      ])
        new PerformanceObserver((list) =>
          list.getEntries().forEach((e) => {
            if (type === "layout-shift" && e.hadRecentInput) return;
            window.__measure[key].push(
              type === "layout-shift"
                ? e.value
                : type === "longtask"
                  ? e.duration
                  : e.startTime,
            );
          }),
        ).observe({ type, buffered: true });
    });
    await p.goto(base + "/explore");
    await p.locator(".night-hero").waitFor();
    await p.evaluate(() =>
      Promise.all([
        document.fonts.ready,
        ...[...document.images]
          .filter((i) => i.loading !== "lazy")
          .map((i) => i.decode().catch(() => {})),
      ]),
    );
    await p.evaluate(
      () =>
        new Promise((resolve) => {
          const start = performance.now();
          let previous = start;
          const frame = (now) => {
            window.__measure.frames.push(now - previous);
            previous = now;
            scrollBy(0, 12);
            if (now - start < 3000) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        }),
    );
    const data = await p.evaluate(() => window.__measure),
      frames = data.frames.sort((a, b) => a - b);
    results.push({
      width,
      frames: frames.length,
      p50: frames[Math.floor(frames.length * 0.5)],
      p95: frames[Math.floor(frames.length * 0.95)],
      over33ms: frames.filter((f) => f > 33.4).length,
      cls: data.shifts.reduce((a, b) => a + b, 0),
      lcpMs: data.lcp.at(-1),
      longTasks: data.long,
      errors,
    });
    await c.close();
  }
  const c = await b.newContext();
  const guards = [];
  for (const route of [
    "/test-lab",
    "/api/test-lab/state",
    "/api/test-lab/activate-organizer",
    "/api/test-lab/workspace",
  ]) {
    const r =
      route.includes("activate") || route.includes("workspace")
        ? await c.request.post(base + route, {
            headers: { Origin: base },
            data: { plan: "STARTER" },
          })
        : await c.request.get(base + route);
    assert.equal(r.status(), 404, route);
    guards.push({ route, status: r.status() });
  }
  await writeFile(
    out,
    JSON.stringify(
      {
        results,
        guards,
        note: "Single local Chromium machine, normal CPU. Not a physical-device or field performance claim.",
      },
      null,
      2,
    ),
  );
  console.log(
    results.map((r) => ({
      width: r.width,
      p95: r.p95,
      cls: r.cls,
      errors: r.errors,
    })),
  );
} finally {
  await b.close();
}
