import { db } from "../lib/db";
import { readFile, writeFile } from "node:fs/promises";
import { createInvitation, redeemInvitation } from "../lib/invitations";
import { reserveBooking, approveRegistration } from "../lib/booking-domain";
import {
  submitPaymentEvidence,
  reviewPayment,
} from "../lib/payment-foundation";
import QRCode from "qrcode";
if (
  process.env.NODE_ENV === "production" ||
  !process.env.DATABASE_URL?.includes("mixermates-phase10-20261027/preview/") ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Isolated Phase10 fixture only");
const f = JSON.parse(await readFile(".local/phase4-fixture.json", "utf8"));
if (await db.event.findUnique({ where: { id: "p9-reschedule" } }))
  throw Error("Preserve existing browser acceptance records");
const original = await db.event.findUniqueOrThrow({
  where: { id: f.eventId },
  include: { tiers: true, fields: true },
});
const made: any = {};
for (const name of ["reschedule", "cancel"]) {
  const { id, slug, createdAt, tiers, fields, ...data } = original;
  const eventId = "p9-" + name;
  await db.event.create({
    data: {
      ...data,
      id: eventId,
      slug: eventId,
      title: "Fictional Phase10 " + name,
      tiers: {
        create: tiers.map(({ id, eventId, ...t }) => ({
          ...t,
          id: eventId + "-" + name,
          sold: 0,
        })),
      },
      fields: {
        create: fields.map(({ id, eventId, ...field }, i) => ({
          ...field,
          id: "p9-" + name + "-field-" + i,
        })),
      },
    },
  });
  // Keep private events identity bound; no unauthenticated or forwarded link grant.
  const invite = await createInvitation("organizer", {
    eventId,
    inviteeId: "attendee",
    expiresAt: new Date("2026-10-29T11:00:00Z"),
  });
  await redeemInvitation("attendee", eventId, invite.token);
  const defs = await db.eventRegistrationField.findMany({ where: { eventId } });
  const answers: any = {};
  for (const q of defs) {
    if (q.type === "file") continue;
    answers[q.id] =
      q.label === "Age"
        ? "28"
        : q.label === "Entry option"
          ? "Entrance Fee — RM35"
          : q.label === "Full name as on IC"
            ? "Alex Fictional Morgan"
            : q.label === "Instagram username"
              ? "fictional_alex"
              : "";
  }
  const b = await reserveBooking("attendee", {
    eventId,
    tierId:
      eventId === "p9-reschedule"
        ? f.eventId + "-reschedule"
        : f.eventId + "-cancel",
    quantity: 1,
    entryKey: "fee",
    answers,
    idempotencyKey: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 3600000),
  });
  const file = await db.fileUpload.create({
    data: {
      userId: "attendee",
      private: true,
      mime: "image/png",
      path: "p9-fixture-proof-" + name,
      data: await QRCode.toBuffer(
        "FICTIONAL RECEIPT " + name + " NO REAL MONEY",
      ),
    },
  });
  const proof = await submitPaymentEvidence("attendee", b.id, file.id);
  await reviewPayment("organizer", b.id, {
    evidenceId: proof.id,
    decision: "CONFIRMED",
    fundsVerified: true,
    receivedAmount: 3500,
    notes: "FICTIONAL local incoming record only, no actual money.",
  });
  await approveRegistration("organizer", b.id, true);
  made[name] = { eventId, bookingId: b.id };
}
// A durable failed-delivery example for the admin retry screen, without sending messages.
await db.notification.create({
  data: {
    userId: "attendee",
    title: "Fictional delivery failure rehearsal",
    body: "A local mock failure, in-app content remains available.",
    link: "/my-bookings",
    jobStatus: "FAILED",
    attempts: 3,
    lastError: "LOCAL_TRANSPORT_FAILURE",
    lastAttemptAt: new Date(),
  },
});
await writeFile(
  ".local/phase10-fixture.json",
  JSON.stringify({ ...made, halloween: f }),
  { mode: 0o600 },
);
console.log(
  "Prepared separate reschedule/cancellation bookings; original Halloween draft preserved.",
);
await db.$disconnect();
