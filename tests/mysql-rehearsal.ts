import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { isolatedTestData } from "../lib/domain-core";
import { createInvitation, redeemInvitation } from "../lib/invitations";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  expireReservation,
} from "../lib/booking-domain";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
  submitPaymentEvidence,
  reviewPayment,
} from "../lib/payment-foundation";
import { setEventStaff } from "../lib/staff-permissions";
import { checkIn } from "../lib/services";
if (
  !isolatedTestData() ||
  process.env.MYSQL_DISPOSABLE_TEST !== "true" ||
  !process.env.DATABASE_URL?.includes("@127.0.0.1:13306/mixermates_p4_main")
)
  throw Error("Explicit disposable local MySQL required.");
const results: any[] = [];
const run = async (name: string, fn: () => Promise<void>) => {
  await fn();
  results.push({ name, result: "PASS" });
  console.log("PASS", name);
};
const prefix = "mysql_" + randomUUID().slice(0, 8);
let org: any,
  admin: any,
  a: any,
  b: any,
  scanner: any,
  paid: any,
  version: any,
  booking: any,
  evidence: any;
async function main() {
  try {
    await run(
      "actual MySQL version and all six migration records",
      async () => {
        const version = await db.$queryRawUnsafe<any[]>(
          "SELECT VERSION() AS version",
        );
        assert(version[0].version.startsWith("8.0.41"));
        const migrations = await db.$queryRawUnsafe<any[]>(
          "SELECT COUNT(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL",
        );
        assert.equal(Number(migrations[0].n), 6);
      },
    );
    const user = async (role: string, suffix: string) =>
      db.user.create({
        data: {
          id: prefix + suffix,
          email: prefix + suffix + "@example.test",
          username: prefix + suffix,
          name: "Fictional " + suffix,
          passwordHash: "NOT_A_LOGIN_CREDENTIAL",
          dob: new Date("1990-01-01"),
          city: "Test",
          role,
          verification: "VERIFIED",
        },
      });
    org = await user("ORGANIZER", "org");
    admin = await user("ADMIN", "admin");
    a = await user("ATTENDEE", "a");
    b = await user("ATTENDEE", "b");
    scanner = await user("STAFF", "scanner");
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=",
      "base64",
    );
    const qr = await db.fileUpload.create({
      data: {
        userId: org.id,
        path: prefix + "qr",
        private: true,
        data: image,
        mime: "image/png",
      },
    });
    version = await submitPaymentDestination(org.id, {
      methodType: "TOUCH_N_GO",
      label: "Fictional MySQL destination",
      recipientName: "FICTIONAL OWNER",
      qrAssetId: qr.id,
    });
    await reviewPaymentDestination(admin.id, version.id, true, {
      procedure:
        "Fictional disposable MySQL sample reviewed for software only.",
    });
    const event = async (
      key: string,
      capacity: number,
      price: number,
      access = "PUBLIC",
    ) =>
      db.event.create({
        data: {
          id: prefix + key,
          slug: prefix + key,
          title: "Fictional MySQL test",
          description: "Local test only",
          category: "House Party",
          genre: "House",
          image: "/images/halloween.jpg",
          city: "Test",
          venue: "Test",
          latitude: 0,
          longitude: 0,
          organizerId: org.id,
          origin: "REAL",
          testOnly: true,
          status: "PUBLISHED",
          configurationStatus: "FICTIONAL_APPROVED",
          reviewOutcome: "APPROVED",
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 2 * 86400000),
          capacity,
          access,
          invitationsEnabled: true,
          approvalRequired: true,
          paymentDestinationId: version.destinationId,
          tiers: {
            create: {
              id: prefix + key + "t",
              name: "General",
              price,
              quantity: capacity,
              minPerOrder: 1,
              maxPerOrder: 1,
            },
          },
        },
      });
    paid = await event("paid", 10, 3500, "INVITATION_ONLY");
    await run(
      "concurrent identity-bound invitation redemption consumes one use",
      async () => {
        const invite = await createInvitation(org.id, {
          eventId: paid.id,
          inviteeId: a.id,
          expiresAt: new Date(Date.now() + 3600000),
        });
        const grants = await Promise.all([
          redeemInvitation(a.id, paid.id, invite.token),
          redeemInvitation(a.id, paid.id, invite.token),
        ]);
        assert.equal(grants[0].id, grants[1].id);
        assert.equal(
          (
            await db.eventInvitation.findUniqueOrThrow({
              where: { id: invite.id },
            })
          ).usageCount,
          1,
        );
      },
    );
    await run(
      "final seat, stock and HTTP-style idempotency under concurrent transactions",
      async () => {
        const e = await event("last", 1, 0);
        const attempts = await Promise.allSettled(
          [a, b].map((u) =>
            reserveBooking(u.id, {
              eventId: e.id,
              tierId: e.id + "t",
              quantity: 1,
              idempotencyKey: randomUUID(),
              expiresAt: new Date(Date.now() + 3600000),
            }),
          ),
        );
        assert.equal(
          attempts.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
            .reservedCount,
          1,
        );
        const key = randomUUID();
        const inputs = {
          eventId: paid.id,
          tierId: paid.id + "t",
          quantity: 1,
          idempotencyKey: key,
          expiresAt: new Date(Date.now() + 3600000),
        };
        const r = await Promise.all([
          reserveBooking(a.id, inputs),
          reserveBooking(a.id, inputs),
        ]);
        assert.equal(r[0].id, r[1].id);
        booking = r[0];
      },
    );
    await run(
      "private evidence persists and on-time proof holds inventory through deadline",
      async () => {
        const file = await db.fileUpload.create({
          data: {
            userId: a.id,
            path: prefix + "proof",
            private: true,
            data: image,
            mime: "image/png",
          },
        });
        evidence = await submitPaymentEvidence(a.id, booking.id, file.id);
        await db.booking.update({
          where: { id: booking.id },
          data: { reservationExpiresAt: new Date(Date.now() - 1000) },
        });
        await assert.rejects(expireReservation(org.id, booking.id), /409/);
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: booking.id } }))
            .paymentState,
          "PROOF_SUBMITTED",
        );
      },
    );
    await run(
      "concurrent funds approval issues once only after separate registration approval",
      async () => {
        await approveRegistration(org.id, booking.id, true);
        assert.equal(
          await db.ticket.count({ where: { bookingId: booking.id } }),
          0,
        );
        const input = {
          evidenceId: evidence.id,
          decision: "CONFIRMED" as const,
          fundsVerified: true,
          receivedAmount: 3500,
          notes: "Independent fictional test ledger checked",
        };
        await Promise.all([
          reviewPayment(org.id, booking.id, input),
          reviewPayment(org.id, booking.id, input),
        ]);
        assert.equal(
          await db.paymentReview.count({
            where: { paymentId: evidence.paymentId, decision: "CONFIRMED" },
          }),
          1,
        );
        assert.equal(
          await db.ticket.count({ where: { bookingId: booking.id } }),
          1,
        );
      },
    );
    await run(
      "parallel ticket issuance reuses one admission credential and audit",
      async () => {
        await Promise.all(
          Array.from({ length: 4 }, () => issueTickets(org.id, booking.id)),
        );
        assert.equal(
          await db.ticket.count({ where: { bookingId: booking.id } }),
          1,
        );
        assert.equal(
          await db.adminAuditLog.count({
            where: { targetId: booking.id, action: "TICKETS_ISSUED" },
          }),
          1,
        );
      },
    );
    await run(
      "concurrent QR/manual check-in admits once and keeps one attendance row",
      async () => {
        await setEventStaff(org.id, {
          eventId: paid.id,
          userId: scanner.id,
          active: true,
          canCheckIn: true,
        });
        const ticket = await db.ticket.findFirstOrThrow({
          where: { bookingId: booking.id },
        });
        const results = await Promise.allSettled([
          checkIn(scanner.id, paid.id, ticket.token),
          checkIn(scanner.id, paid.id, ticket.token, "MANUAL"),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          await db.attendanceRecord.count({
            where: { eventId: paid.id, userId: a.id },
          }),
          1,
        );
      },
    );
    await run(
      "abandoned reservation expiry is idempotent and restores exact stock",
      async () => {
        const e = await event("expiry", 2, 0),
          r = await reserveBooking(b.id, {
            eventId: e.id,
            tierId: e.id + "t",
            quantity: 1,
            idempotencyKey: randomUUID(),
            expiresAt: new Date(Date.now() + 3600000),
          });
        await db.booking.update({
          where: { id: r.id },
          data: { reservationExpiresAt: new Date(Date.now() - 1000) },
        });
        await Promise.all([
          expireReservation(org.id, r.id),
          expireReservation(org.id, r.id),
        ]);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
            .reservedCount,
          0,
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: e.id + "t" },
            })
          ).sold,
          0,
        );
      },
    );
    await run(
      "database-backed rate limit holds across six separate Node processes",
      async () => {
        const code = `import('./lib/security.ts').then(async ({consumeRateLimit})=>{try{await consumeRateLimit('mysql-multiprocess',${JSON.stringify(prefix)},3,3600000);process.exit(0);}catch(e){process.exit(String(e.message).startsWith('429:')?42:1);}})`;
        const statuses = await Promise.all(
          Array.from(
            { length: 6 },
            () =>
              new Promise<number | null>((resolve) => {
                const child = spawn(
                  process.execPath,
                  ["--import", "tsx", "--eval", code],
                  { cwd: process.cwd(), env: process.env, stdio: "ignore" },
                );
                child.on("exit", resolve);
              }),
          ),
        );
        assert.equal(statuses.filter((s) => s === 0).length, 3);
        assert.equal(statuses.filter((s) => s === 42).length, 3);
      },
    );
    await run(
      "disconnect/reconnect preserves confirmed funds, private evidence and admission",
      async () => {
        await db.$disconnect();
        await db.$connect();
        const b = await db.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: { payment: { include: { reviews: true } }, tickets: true },
        });
        assert.equal(b.total, 3500);
        assert.equal(b.paymentState, "CONFIRMED");
        assert.equal(
          b.payment!.reviews.filter((r) => r.fundsVerified).length,
          1,
        );
        assert.equal(b.tickets[0].status, "CHECKED_IN");
      },
    );
    const snapshot = {
      bookingId: booking.id,
      total: 3500,
      paymentState: "CONFIRMED",
      ticketStatus: "CHECKED_IN",
      recipientVersionId: version.id,
    };
    await writeFile(
      "../mysql-runtime-results.json",
      JSON.stringify({ version: "8.0.41", results, snapshot }, null, 2),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
