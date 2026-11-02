import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { databaseUrl } from "./database-url";
const run = promisify(execFile);
export async function initializeHostedDatabase() {
  const url = databaseUrl();
  if (!url?.startsWith("mysql://"))
    throw new Error("Hostinger requires a configured MySQL database URL.");
  const cli = path.join(process.cwd(), "node_modules/prisma/build/index.js");
  try {
    const { stdout } = await run(
      process.execPath,
      [
        cli,
        "migrate",
        "deploy",
        "--schema",
        path.join(process.cwd(), "prisma/mysql/schema.prisma"),
      ],
      {
        env: { ...process.env, DATABASE_URL: url },
        timeout: 120000,
        maxBuffer: 1024 * 1024,
      },
    );
    console.log(stdout);
  } catch {
    throw new Error(
      "Database initialization failed. Verify the Hostinger MySQL host, database and credentials; existing data was not reset.",
    );
  }
  if (process.env.HOSTINGER_SEED_DEMO === "true") {
    const { db } = await import("./db");
    await db.$transaction(
      async (tx) => {
        const locks = await tx.$queryRawUnsafe<{ locked: number }[]>(
          "SELECT GET_LOCK('vibey_initial_demo_seed', 60) AS locked",
        );
        if (Number(locks[0]?.locked) !== 1)
          throw new Error("Could not acquire initial demo setup lock.");
        try {
          if ((await tx.event.count()) === 0) {
            await run(
              process.execPath,
              [
                "--import",
                path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs"),
                path.join(process.cwd(), "prisma/seed.ts"),
              ],
              {
                env: { ...process.env, DATABASE_URL: url },
                timeout: 90000,
                maxBuffer: 1024 * 1024,
              },
            );
            console.log(
              "Initial fictional event data created; production demo account passwords randomized.",
            );
          }
        } finally {
          await tx.$queryRawUnsafe(
            "SELECT RELEASE_LOCK('vibey_initial_demo_seed')",
          );
        }
      },
      { maxWait: 90000, timeout: 120000 },
    );
  }
}
