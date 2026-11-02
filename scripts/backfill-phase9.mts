// Add fingerprints/searchable holder names only in this phase's explicitly isolated fictional SQLite copy.
import { realpath } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { digest } from "../lib/payment-risk";
import { holderName } from "../lib/registration";
const cwd = await realpath(process.cwd()),
  url = process.env.DATABASE_URL || "";
if (
  process.env.NODE_ENV === "production" ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  Object.keys(process.env).some((k) => k.startsWith("DB_")) ||
  !cwd.startsWith("/Users/parsa/.codex/tmp/mixermates-phase9-20261027/") ||
  !url.startsWith("file:") ||
  (await realpath(url.slice(5))) !== path.join(cwd, "prisma/audit.db")
)
  throw Error("Only the calling Phase9 fictional SQLite workspace is allowed");
let evidence = 0,
  bookings = 0,
  cursor: string | undefined;
for (;;) {
  const rows = await db.paymentEvidence.findMany({
    where: { receiptSha256: null },
    select: { id: true, receiptUpload: { select: { data: true } } },
    take: 10,
  });
  if (!rows.length) break;
  for (const row of rows) {
    if (!row.receiptUpload.data)
      throw Error("Historical evidence bytes unavailable; review manually");
    await db.paymentEvidence.update({
      where: { id: row.id },
      data: { receiptSha256: digest(row.receiptUpload.data) },
    });
    evidence++;
  }
}
for (;;) {
  const rows = await db.booking.findMany({
    where: { guestName: "" },
    orderBy: { id: "asc" },
    take: 200,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      eventId: true,
      answers: true,
      user: { select: { name: true } },
    },
  });
  if (!rows.length) break;
  cursor = rows[rows.length - 1].id;
  const fields = await db.eventRegistrationField.findMany({
    where: {
      eventId: { in: [...new Set(rows.map((b) => b.eventId))] },
      label: { contains: "Full name" },
    },
  });
  for (const row of rows) {
    await db.booking.update({
      where: { id: row.id },
      data: {
        guestName: holderName(
          row.answers,
          fields.find((f) => f.eventId === row.eventId)?.id,
          row.user.name,
        ),
      },
    });
    bookings++;
  }
}
console.log(
  JSON.stringify({
    evidenceFingerprinted: evidence,
    holderNamesIndexed: bookings,
  }),
);
await db.$disconnect();
