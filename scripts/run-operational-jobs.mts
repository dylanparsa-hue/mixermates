import { db } from "../lib/db";
import { runOperationalJobs } from "../lib/operational-jobs";
import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
const url = process.env.DATABASE_URL || "";
const workspace = realpathSync(process.cwd());
const allowedWorkspace = [
  "mixermates-phase7-20261027",
  "mixermates-phase8-20261027",
  "mixermates-phase9-20261027",
  "mixermates-phase10-20261027",
  "mixermates-phase11-20261027",
].some((name) => workspace.startsWith(`/Users/parsa/.codex/tmp/${name}/`));
if (
  process.env.NODE_ENV === "production" ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  ["DB_PASSWORD", "DB_NAME", "DB_USER", "DB_HOST", "DB_PORT"].some(
    (key) => process.env[key] !== undefined,
  ) ||
  !url.startsWith("file:") ||
  !allowedWorkspace ||
  !realpathSync(resolve(url.slice(5).split("?")[0])).startsWith(workspace + sep)
)
  throw Error(
    "Run only with a database inside its isolated Phase7/Phase8/Phase9/Phase10/Phase11 SQLite workspace.",
  );
const adminId = process.env.LOCAL_OPERATIONS_ACTOR_ID;
if (!adminId)
  throw Error(
    "Set LOCAL_OPERATIONS_ACTOR_ID to an existing fictional administrator ID.",
  );
try {
  console.log(JSON.stringify(await runOperationalJobs(adminId)));
} finally {
  await db.$disconnect();
}
