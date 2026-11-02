import { defineConfig, devices } from "@playwright/test";
import { realpathSync, readFileSync } from "node:fs";
import path from "node:path";
const workspace = realpathSync(process.cwd());
const phase = 3;
const marker=JSON.parse(readFileSync(path.join(workspace,'.local/regression-isolated.json'),'utf8'));
const base = new URL(process.env.E2E_BASE_URL || "http://invalid.invalid");
if (
  !phase ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.TICKET_SALES_MODE !== "disabled" ||
  Object.keys(process.env).some((key) => key.startsWith("DB_")) ||
  !["localhost", "127.0.0.1"].includes(base.hostname) ||
  base.protocol !== "http:" ||
  !!base.username ||
  !!base.password ||
  base.pathname !== "/" ||
  !!base.search ||
  !!base.hash ||
  base.origin !== process.env.APP_ORIGIN ||
  process.env.DATABASE_URL !==
    "file:" + path.join(workspace, "prisma/audit.db") ||
  !realpathSync(path.join(workspace, "prisma/audit.db")).startsWith(
    workspace + path.sep,
  ) ||
  marker?.fictional !== true ||
  marker?.phase !== phase ||
  Object.keys(marker).length !== 2
)
  throw Error(
    "E2E requires an explicit owned fictional Phase10/Phase11 workspace and an already running loopback server.",
  );
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: base.origin,
    channel: "chrome",
    trace: "off",
    screenshot: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
