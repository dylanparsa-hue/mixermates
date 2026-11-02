import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { isolatedTestData } from "../lib/domain-core";
assert(isolatedTestData() && process.env.MYSQL_DISPOSABLE_TEST === "true");
const out = path.resolve(process.env.PHASE10_SNAPSHOT || "");
assert(out.startsWith("/Users/parsa/.codex/tmp/mixermates-phase10-20261027/"));
assert(!Object.keys(process.env).some((k) => k.startsWith("DB_")));
const names = await db.$queryRawUnsafe<any[]>(
  "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
);
const quote = (s: string) => {
  assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(s));
  return "`" + s + "`";
};
function stable(value: any): any {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array)
    return { bytes: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable(value[k])]),
    );
  return value;
}
const tables: Record<string, any> = {};
const projection = process.env.PHASE10_COLUMNS_FILE
  ? JSON.parse(await readFile(process.env.PHASE10_COLUMNS_FILE, "utf8"))
  : null;
for (const { name } of names) {
  const rows = await db.$queryRawUnsafe<any[]>(
    "SELECT " +
      (projection?.[name]?.map(quote).join(",") || "*") +
      " FROM " +
      quote(name),
  );
  tables[name] = {
    rows: rows.length,
    sha256: createHash("sha256")
      .update(
        rows
          .map((r) => JSON.stringify(stable(r)))
          .sort()
          .join("\n"),
      )
      .digest("hex"),
  };
}
const keys = await db.$queryRawUnsafe<any[]>(
  "SELECT TABLE_NAME AS child, COLUMN_NAME AS childColumn, REFERENCED_TABLE_NAME AS parent, REFERENCED_COLUMN_NAME AS parentColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL",
);
let violations = 0;
for (const fk of keys) {
  const [r] = await db.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS n FROM ${quote(fk.child)} c LEFT JOIN ${quote(fk.parent)} p ON c.${quote(fk.childColumn)}=p.${quote(fk.parentColumn)} WHERE c.${quote(fk.childColumn)} IS NOT NULL AND p.${quote(fk.parentColumn)} IS NULL`,
  );
  violations += Number(r.n);
}
assert.equal(violations, 0);
for (const name of [
  "User",
  "Event",
  "EventInvitation",
  "InvitationGrant",
  "Booking",
  "Payment",
  "PaymentEvidence",
  "PaymentReview",
  "Ticket",
  "TicketCheckIn",
  "AttendanceRecord",
  "Refund",
  "Notification",
  "AdminAuditLog",
])
  assert(
    tables[name]?.rows > 0,
    "Populated recovery fixture required: " + name,
  );
const migrations = await db.$queryRawUnsafe<any[]>(
  "SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolledBack FROM _prisma_migrations ORDER BY migration_name",
);
await writeFile(
  out,
  JSON.stringify(
    {
      tables,
      foreignKeyChecks: keys.length,
      foreignKeyViolations: violations,
      migrations: stable(migrations),
    },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
console.log(
  JSON.stringify({
    tables: names.length,
    foreignKeyChecks: keys.length,
    foreignKeyViolations: violations,
    migrations: migrations.length,
  }),
);
await db.$disconnect();
