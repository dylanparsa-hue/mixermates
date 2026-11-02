import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const base = "http://localhost:3091",
  root = "/Users/parsa/.codex/tmp/mixermates-correction-20261028",
  out = "/Users/parsa/Desktop/EVENT FINDER/docs/ui-fixes/before";
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
const post = async (k, data) =>
  c.request.post(base + "/api/test-lab/" + k, {
    headers: { Origin: base },
    data,
  });
await post("login", { code: access.accessCode });
await post("switch", { role: "Customer" });
const f = JSON.parse(await readFile(root + "/cinematic-scenario.json", "utf8")),
  p = await c.newPage();
for (const [name, path] of [
  ["home", "/explore"],
  ["event", "/events/" + f.event.slug],
  ["profile-menu", "/profile"],
]) {
  await p.goto(base + path);
  await p
    .locator(
      name === "home"
        ? ".night-hero"
        : name === "event"
          ? ".booking-panel"
          : ".identity-sheet",
    )
    .waitFor();
  if (name === "profile-menu")
    await p.getByRole("button", { name: "Account menu", exact: true }).click();
  for (const theme of ["dark", "light"])
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.evaluate((t) => {
        localStorage.setItem("mixermates-theme", t);
        window.dispatchEvent(
          new StorageEvent("storage", { key: "mixermates-theme", newValue: t }),
        );
      }, theme);
      await p.waitForTimeout(100);
      await p.screenshot({
        path: `${out}/${name}-${theme}-${width}.png`,
        fullPage: name !== "profile-menu",
      });
    }
}
await post("switch", { role: "Organizer" });
await p.goto(base + "/organizer");
await p.locator(".studio-content .setup-panel").waitFor();
await p.screenshot({ path: out + "/organizer-dark-1440.png", fullPage: true });
await b.close();
