import { spawnSync } from "node:child_process";
const node = process.execPath;
const run = (script, args, env = process.env) => {
  const result = spawnSync(node, [script, ...args], { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status || 1);
};
run(
  "node_modules/prisma/build/index.js",
  ["generate", "--schema", "prisma/mysql/schema.prisma"],
  {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL?.startsWith("mysql://")
      ? process.env.DATABASE_URL
      : "mysql://build:build@localhost:3306/build",
  },
);
// Migrations run at server initialization: the build container cannot use the runtime's localhost MySQL.
run("node_modules/next/dist/bin/next", ["build", "--webpack"], {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL?.startsWith("mysql://")
    ? process.env.DATABASE_URL
    : "mysql://build:build@localhost:3306/build",
  HOSTINGER_DATABASE_BOOTSTRAP: "false",
  HOSTINGER_SEED_DEMO: "false",
});

run("scripts/copy-hostinger-runtime.mjs", []);
