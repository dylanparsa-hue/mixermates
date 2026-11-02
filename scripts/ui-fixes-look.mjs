import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = "http://localhost:3091",
  root = "/Users/parsa/.codex/tmp/mixermates-correction-20261028",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes/after";
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome" }),
  c = await b.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
await c.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (r) =>
  r.abort(),
);
const access = JSON.parse(
  await readFile(root + "/preview/.local/test-lab-access.json", "utf8"),
);
await c.request.post(base + "/api/test-lab/login", {
  headers: { Origin: base },
  data: { code: access.accessCode },
});
const p = await c.newPage(),
  errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/explore");
await p.locator(".cinema-poster").first().waitFor();
for (const theme of ["dark", "light"])
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    await p.evaluate((t) => {
      localStorage.setItem("mixermates-theme", t);
      window.dispatchEvent(
        new StorageEvent("storage", { key: "mixermates-theme", newValue: t }),
      );
    }, theme);
    await p
      .locator("img")
      .evaluateAll((es) => es.forEach((i) => (i.loading = "eager")));
    await p.evaluate(() =>
      Promise.all([
        document.fonts.ready,
        ...[...document.images].map((i) => i.decode().catch(() => {})),
      ]),
    );
    await p.screenshot({
      path: `${out}/home-${theme}-${width}.png`,
      fullPage: true,
    });
    await p.screenshot({ path: `${out}/hero-${theme}-${width}.png` });
  }
await p.getByRole("button", { name: "Account menu", exact: true }).click();
await p.screenshot({ path: out + "/account-light-1440.png" });
console.log(errs);
await b.close();
