import { db } from "../lib/db";
import { readFile, writeFile } from "node:fs/promises";
import { reserveBooking, approveRegistration } from "../lib/booking-domain";
import {
  submitPaymentEvidence,
  reviewPayment,
} from "../lib/payment-foundation";
if (
  process.cwd() !==
    "/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview" ||
  process.env.ISOLATED_TEST_DATA !== "true"
)
  throw Error("Own Phase11 preview only");
const m = JSON.parse(
  await readFile(
    "/Users/parsa/Desktop/EVENT FINDER/docs/phase11/browser-results.json",
    "utf8",
  ),
);
const src = await db.booking.findUniqueOrThrow({
  where: { id: m.bookingId },
  include: {
    payment: { include: { evidence: { include: { receiptUpload: true } } } },
  },
});
const b = await reserveBooking("attendee", {
  eventId: src.eventId,
  tierId: src.tierId,
  quantity: 1,
  entryKey: src.entryPath,
  answers: JSON.parse(src.answers),
  idempotencyKey: crypto.randomUUID(),
  expiresAt: new Date(Date.now() + 3600000),
});
const receipt = src.payment!.evidence[0].receiptUpload;
const f = await db.fileUpload.create({
  data: {
    userId: "attendee",
    private: true,
    mime: receipt.mime,
    data: receipt.data!,
    path: "phase11-owner-qr-fixture",
  },
});
const proof = await submitPaymentEvidence("attendee", b.id, f.id);
await reviewPayment("organizer", b.id, {
  evidenceId: proof.id,
  decision: "CONFIRMED",
  fundsVerified: true,
  receivedAmount: 3500,
  notes: "Fictional QR owner rehearsal; no real funds",
});
await approveRegistration("organizer", b.id, true);
await writeFile(
  ".local/phase11-qr-fixture.json",
  JSON.stringify({ bookingId: b.id }),
  { mode: 0o600 },
);
console.log(
  "Additional fictional owned ticket created for private rendered QR checks",
);
await db.$disconnect();
