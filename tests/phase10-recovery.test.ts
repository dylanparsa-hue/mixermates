import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { clientDatabaseUrl } from "../lib/database-url";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  !(() => {try{return JSON.stringify(JSON.parse(readFileSync('.local/regression-isolated.json','utf8'))) === JSON.stringify({fictional:true,phase:3}) && process.env.DATABASE_URL === 'file:' + path.join(process.cwd(),'prisma/audit.db');}catch{return [10,11].some(phase=>process.cwd().includes(`mixermates-phase${phase}-20261027/`));}})()
)
  throw Error("Phase10 fictional SQLite workspace only");
test("SQLite client defaults to one connection while preserving explicit options and other providers", () => {
  assert.equal(
    clientDatabaseUrl({ DATABASE_URL: "file:/tmp/fictional.db" }),
    "file:/tmp/fictional.db?connection_limit=1",
  );
  assert.equal(
    clientDatabaseUrl({
      DATABASE_URL:
        "file:/tmp/fictional.db?socket_timeout=5&connection_limit=2",
    }),
    "file:/tmp/fictional.db?socket_timeout=5&connection_limit=2",
  );
  assert.equal(
    clientDatabaseUrl({ DATABASE_URL: "mysql://fictional@127.0.0.1/test" }),
    "mysql://fictional@127.0.0.1/test",
  );
  assert.equal(clientDatabaseUrl({}), undefined);
});
test("Phase 10 guarded SQLite backup and restore", async (t) => {
  const workspace = process.cwd(),
    dir = path.join(workspace, ".local", "recovery-tests", randomUUID());
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const source = path.join(dir, "source.db"),
    backup = path.join(dir, "backup.db"),
    restored = path.join(dir, "restored.db");
  const run = (
    action: string,
    src = source,
    dest?: string,
    env = process.env,
  ) =>
    spawnSync(
      "python3",
      [
        "scripts/local-recovery.py",
        action,
        "--workspace",
        workspace,
        "--source",
        src,
        ...(dest ? ["--destination", dest] : []),
      ],
      { encoding: "utf8", env },
    );
  const setup = spawnSync("python3", [
    "-c",
    `import sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.executescript("CREATE TABLE Parent(id TEXT PRIMARY KEY, data BLOB); CREATE TABLE Child(id TEXT PRIMARY KEY, parent TEXT REFERENCES Parent(id)); CREATE TABLE _prisma_migrations(migration_name TEXT, checksum TEXT, finished_at TEXT, rolled_back_at TEXT); INSERT INTO _prisma_migrations VALUES ('fictional_migration','fictional_checksum','done',NULL);");c.execute('INSERT INTO Parent VALUES (?,?)',('fictional',bytes([0,1,255])));c.execute('INSERT INTO Child VALUES (?,?)',('booking','fictional'));c.commit()`,
    source,
  ]);
  assert.equal(setup.status, 0);
  await t.test(
    "consistent binary records, schema and row fingerprints survive a fresh restore",
    () => {
      const b = run("backup", source, backup);
      assert.equal(b.status, 0, b.stderr);
      const data = JSON.parse(b.stdout);
      assert.equal(data.tables.Parent.rows, 1);
      assert.equal(data.tables.Child.rows, 1);
      const r = run("restore", backup, restored);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout).tables, data.tables);
      assert.equal(JSON.parse(r.stdout).schemaSha256, data.schemaSha256);
      assert.equal(statSync(backup).mode & 0o777, 0o600);
      assert.equal(statSync(restored).mode & 0o777, 0o600);
    },
  );
  await t.test(
    "backup and restore refuse existing destinations without changing bytes",
    () => {
      const before = readFileSync(restored);
      assert.notEqual(run("restore", backup, restored).status, 0);
      assert.deepEqual(readFileSync(restored), before);
      assert.notEqual(run("backup", source, backup).status, 0);
    },
  );
  await t.test(
    "tampered backup is refused before creating the restore database",
    () => {
      const tampered = path.join(dir, "tampered.db");
      writeFileSync(tampered, readFileSync(backup));
      writeFileSync(tampered + ".json", readFileSync(backup + ".json"));
      const bytes = readFileSync(tampered);
      bytes[bytes.length - 1] ^= 1;
      writeFileSync(tampered, bytes);
      assert.notEqual(
        run("restore", tampered, path.join(dir, "refused.db")).status,
        0,
      );
    },
  );
  await t.test(
    "foreign-key corruption is caught even when SQLite page integrity passes",
    () => {
      const bad = path.join(dir, "orphan.db");
      writeFileSync(bad, readFileSync(source));
      assert.equal(
        spawnSync("python3", [
          "-c",
          "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(\"UPDATE Child SET parent='missing'\");c.commit()",
          bad,
        ]).status,
        0,
      );
      assert.notEqual(
        run("backup", bad, path.join(dir, "orphan-backup.db")).status,
        0,
      );
    },
  );
  await t.test(
    "canonical and sibling database paths plus inherited provider overrides are refused",
    () => {
      assert.notEqual(
        run(
          "backup",
          "/Users/parsa/Desktop/EVENT FINDER/prisma/dev.db",
          path.join(dir, "canonical.db"),
        ).status,
        0,
      );
      assert.notEqual(
        run(
          "backup",
          source,
          "/Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview/.local/refused.db",
        ).status,
        0,
      );
      assert.notEqual(
        run("backup", source, path.join(dir, "override.db"), {
          ...process.env,
          DB_HOST: "127.0.0.1",
        }).status,
        0,
      );
    },
  );
  await t.test(
    "manifest record fingerprints are checked independently of the file checksum",
    () => {
      const altered = path.join(dir, "altered.db");
      writeFileSync(altered, readFileSync(backup));
      const m = JSON.parse(readFileSync(backup + ".json", "utf8"));
      m.tables.Parent.rows = 9;
      writeFileSync(altered + ".json", JSON.stringify(m));
      assert.notEqual(run("verify", altered).status, 0);
    },
  );
});
