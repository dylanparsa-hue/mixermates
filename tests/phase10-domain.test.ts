import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { db } from "../lib/db";
import { transaction, audit, isolatedTestData } from "../lib/domain-core";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  updateEventLifecycle,
} from "../lib/booking-domain";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
  submitPaymentEvidence,
  reviewPayment,
} from "../lib/payment-foundation";
import {
  processNotifications,
  localMailboxTransport,
  recoverIssuance,
} from "../lib/operational-jobs";
import { operationalIssues } from "../lib/readiness";
import { entranceAction } from "../lib/entrance";
import { setEventStaff } from "../lib/staff-permissions";
import { securityChange } from "../lib/security";
import { persistSession } from "../lib/session-security";
import { infrastructureFailure } from "../lib/api-failure";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { createInvitation, redeemInvitation } from "../lib/invitations";
if (
  !isolatedTestData() ||
  Object.keys(process.env).some((k) => k.startsWith("DB_"))
)
  throw Error("Isolated fictional provider only");

test("Phase 10 recovery, outage semantics and durable operations", async (t) => {
  const p = "p10" + randomUUID().replaceAll("-", "").slice(0, 10);
  const makeUser = async (role: string, suffix: string) =>
    db.user.create({
      data: {
        id: p + suffix,
        username: p + suffix,
        name: "Fictional recovery " + suffix,
        email: p + suffix + "@example.test",
        role,
        passwordHash: "unused",
        dob: new Date("1990-01-01"),
        city: "Test",
      },
    });
  const org = await makeUser("ORGANIZER", "o"),
    admin = await makeUser("ADMIN", "a"),
    guest = await makeUser("ATTENDEE", "g"),
    staff = await makeUser("STAFF", "s"),
    staff2 = await makeUser("STAFF", "s2");
  let seq = 0;
  const event = async (price = 0, destinationId?: string) =>
    db.event.create({
      data: {
        slug: p + seq++,
        title: "Fictional disaster rehearsal",
        description: "Local only; no funds",
        category: "House Party",
        genre: "House",
        city: "Test",
        venue: "Hidden",
        privateVenue: "Fictional private venue",
        latitude: 0,
        longitude: 0,
        image: "/images/halloween.jpg",
        organizerId: org.id,
        status: "PUBLISHED",
        origin: "REAL",
        testOnly: true,
        configurationStatus: "FICTIONAL_APPROVED",
        capacity: 10,
        approvalRequired: price === 0,
        paymentDestinationId: destinationId,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        tiers: { create: { name: "General", price, quantity: 10 } },
      },
      include: { tiers: true },
    });
  const reserve = (e: Awaited<ReturnType<typeof event>>) =>
    reserveBooking(guest.id, {
      eventId: e.id,
      tierId: e.tiers[0].id,
      quantity: 1,
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    });

  await t.test(
    "identity-bound invitations and grants remain durable recovery records",
    async () => {
      const e = await event();
      await db.event.update({
        where: { id: e.id },
        data: { access: "INVITATION_ONLY", invitationsEnabled: true },
      });
      const invitation = await createInvitation(org.id, {
        eventId: e.id,
        inviteeId: guest.id,
        expiresAt: new Date(Date.now() + 3600000),
      });
      await assert.rejects(() =>
        redeemInvitation(staff.id, e.id, invitation.token),
      );
      await redeemInvitation(guest.id, e.id, invitation.token);
      await redeemInvitation(guest.id, e.id, invitation.token);
      assert.equal(
        await db.invitationGrant.count({
          where: { invitationId: invitation.id, userId: guest.id },
        }),
        1,
      );
      assert.equal(
        (
          await db.eventInvitation.findUniqueOrThrow({
            where: { id: invitation.id },
          })
        ).usageCount,
        1,
      );
    },
  );

  await t.test(
    "rolled-back stock and audit changes leave no partial success",
    async () => {
      const e = await event();
      await assert.rejects(() =>
        transaction(async (tx) => {
          await tx.event.update({
            where: { id: e.id },
            data: { reservedCount: { increment: 1 } },
          });
          await audit(tx, org.id, "PHASE10_ROLLBACK", e.id);
          throw Error("Injected local interruption");
        }),
      );
      assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
          .reservedCount,
        0,
      );
      assert.equal(
        await db.adminAuditLog.count({
          where: { action: "PHASE10_ROLLBACK", targetId: e.id },
        }),
        0,
      );
    },
  );

  await t.test(
    "funds survive actual ticket-insert failure and authorized retry issues exactly once",
    async () => {
      const image = await QRCode.toBuffer(
        "FICTIONAL RECOVERY NO REAL PAYMENT " + p,
      );
      const asset = async (owner: string) =>
        db.fileUpload.create({
          data: {
            userId: owner,
            private: true,
            mime: "image/png",
            path: p + "file" + seq++,
            data: new Uint8Array(image),
          },
        });
      const recipient = await submitPaymentDestination(org.id, {
        methodType: "DUITNOW",
        label: "Fictional recovery",
        recipientName: "FICTIONAL ORGANIZER",
        qrAssetId: (await asset(org.id)).id,
        instructions: "NO REAL PAYMENT",
      });
      await reviewPaymentDestination(admin.id, recipient.id, true);
      const e = await event(3500, recipient.destinationId),
        b = await reserve(e),
        proof = await submitPaymentEvidence(
          guest.id,
          b.id,
          (await asset(guest.id)).id,
        );
      const trigger = p + "failure";
      const sql = process.env.DATABASE_URL!.startsWith("file:")
        ? `CREATE TRIGGER ${trigger} BEFORE INSERT ON Ticket WHEN NEW.bookingId = '${b.id}' BEGIN SELECT RAISE(ABORT, 'PHASE10_INJECTED_ISSUANCE'); END`
        : `CREATE TRIGGER ${trigger} BEFORE INSERT ON Ticket FOR EACH ROW BEGIN IF NEW.bookingId = '${b.id}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PHASE10_INJECTED_ISSUANCE'; END IF; END`;
      const executeDDL = async (statement: string) => {
        if (process.env.DATABASE_URL!.startsWith("file:"))
          return db.$executeRawUnsafe(statement);
        // MySQL does not support CREATE TRIGGER in its prepared-statement protocol.
        // The owned disposable service supplies a private Unix socket; never use a hosted client.
        const socket = process.env.PHASE10_SQL_SOCKET || "",
          client = process.env.PHASE10_SQL_CLIENT || "";
        assert(
          socket.startsWith(
            "/Users/parsa/.codex/tmp/mixermates-phase10-20261027/",
          ),
        );
        assert(
          client.startsWith(
            "/Users/parsa/.codex/tmp/mixermates-phase4-20261020/",
          ) && /\/(mysql|mariadb)$/.test(client),
        );
        execFileSync(
          client,
          [
            "--no-defaults",
            "--socket=" + socket,
            "-uroot",
            "mixermates_p4_main",
          ],
          {
            input: "DELIMITER //\n" + statement + "//\nDELIMITER ;\n",
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
      };
      await executeDDL(sql);
      try {
        await reviewPayment(org.id, b.id, {
          evidenceId: proof.id,
          decision: "CONFIRMED",
          fundsVerified: true,
          receivedAmount: 3500,
          notes: "Fictional independent incoming-funds rehearsal",
        });
        const saved = await db.booking.findUniqueOrThrow({
          where: { id: b.id },
          include: { payment: true },
        });
        assert.equal(saved.paymentState, "CONFIRMED");
        assert(saved.payment?.confirmedAt);
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
        assert.equal(
          await db.adminAuditLog.count({
            where: { action: "ISSUANCE_RETRY_REQUIRED", targetId: b.id },
          }),
          1,
        );
        assert(
          (
            await db.notification.findFirstOrThrow({
              where: { dedupeKey: "issuance-retry:" + b.id },
            })
          ).body.includes("do not pay again"),
        );
        assert(
          JSON.stringify(await operationalIssues(admin.id)).includes(b.id),
        );
      } finally {
        await executeDDL(`DROP TRIGGER ${trigger}`);
      }
      await assert.rejects(() => recoverIssuance(guest.id, b.id), /403/);
      await recoverIssuance(admin.id, b.id);
      await recoverIssuance(admin.id, b.id);
      assert.equal(
        await db.ticket.count({ where: { bookingId: b.id, status: "ACTIVE" } }),
        1,
      );
      assert.equal(
        await db.paymentReview.count({
          where: { payment: { bookingId: b.id }, decision: "CONFIRMED" },
        }),
        1,
      );
    },
  );

  await t.test(
    "two separate authorized scanners competing QR versus manual record one admission",
    async () => {
      const e = await event(),
        b = await reserve(e);
      await approveRegistration(org.id, b.id, true);
      const [ticket] = await issueTickets(org.id, b.id);
      for (const u of [staff, staff2])
        await setEventStaff(org.id, {
          eventId: e.id,
          userId: u.id,
          active: true,
          canCheckIn: true,
          canViewGuests: true,
        });
      const results = await Promise.allSettled([
        entranceAction(
          staff.id,
          { eventId: e.id, token: ticket.token, identityConfirmed: true },
          true,
        ),
        entranceAction(
          staff2.id,
          {
            eventId: e.id,
            ticketId: ticket.id,
            method: "MANUAL",
            identityConfirmed: true,
          },
          true,
        ),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        await db.ticketCheckIn.count({ where: { ticketId: ticket.id } }),
        1,
      );
      assert.equal(
        await db.attendanceRecord.count({
          where: { ticketId: ticket.id, public: false },
        }),
        1,
      );
      await updateEventLifecycle(admin.id, e.id, "SUSPENDED");
      assert.equal(
        await db.ticketCheckIn.count({ where: { ticketId: ticket.id } }),
        1,
      );
      await assert.rejects(() =>
        entranceAction(
          staff.id,
          { eventId: e.id, token: ticket.token, identityConfirmed: true },
          true,
        ),
      );
    },
  );

  await t.test(
    "revoked staff and changed account credentials cannot retain authority",
    async () => {
      const e = await event(),
        b = await reserve(e);
      await approveRegistration(org.id, b.id, true);
      const [ticket] = await issueTickets(org.id, b.id);
      await setEventStaff(org.id, {
        eventId: e.id,
        userId: staff.id,
        active: true,
        canCheckIn: true,
      });
      const version = (
        await db.user.findUniqueOrThrow({ where: { id: staff.id } })
      ).securityVersion;
      await persistSession(staff.id);
      await setEventStaff(org.id, {
        eventId: e.id,
        userId: staff.id,
        active: false,
      });
      assert.equal(await db.session.count({ where: { userId: staff.id } }), 0);
      await assert.rejects(
        () =>
          persistSession(staff.id, {
            securityVersion: version,
            passwordHash: "unused",
          }),
        /401/,
      );
      await assert.rejects(
        () =>
          entranceAction(
            staff.id,
            { eventId: e.id, token: ticket.token, identityConfirmed: true },
            true,
          ),
        /403/,
      );
      await securityChange(admin.id, staff.id, { active: false });
      await assert.rejects(() => persistSession(staff.id), /401/);
      await securityChange(admin.id, staff.id, { active: true });
      assert.equal(await db.session.count({ where: { userId: staff.id } }), 0);
    },
  );

  await t.test(
    "crash after local mock send retries with the same destination key",
    async () => {
      const n = await db.notification.create({
        data: {
          userId: guest.id,
          title: "Fictional crash after send",
          body: "Private local rehearsal",
          link: "/my-bookings",
        },
      });
      await processNotifications(
        admin.id,
        {
          async send(m) {
            await localMailboxTransport.send(m);
            throw Error("Injected response loss");
          },
        },
        new Date(),
        1,
        n.id,
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "RETRY",
      );
      await processNotifications(
        admin.id,
        localMailboxTransport,
        new Date(Date.now() + 120000),
        1,
        n.id,
      );
      const current = await db.notification.findUniqueOrThrow({
        where: { id: n.id },
      });
      assert.equal(current.jobStatus, "MOCK_DELIVERED");
      assert.equal(current.attempts, 2);
      assert.equal(
        (
          await processNotifications(
            admin.id,
            localMailboxTransport,
            new Date(Date.now() + 240000),
            1,
            n.id,
          )
        ).length,
        0,
      );
    },
  );

  await t.test(
    "abandoned final lease produces a visible deduplicated in-app alert",
    async () => {
      const n = await db.notification.create({
        data: {
          userId: guest.id,
          title: "Fictional abandoned lease",
          body: "Private content must not appear in alert",
          jobStatus: "PROCESSING",
          workerToken: randomUUID(),
          attempts: 3,
          leaseUntil: new Date(Date.now() - 1000),
        },
      });
      await processNotifications(
        admin.id,
        localMailboxTransport,
        new Date(),
        1,
        n.id,
      );
      await processNotifications(
        admin.id,
        localMailboxTransport,
        new Date(),
        1,
        n.id,
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "FAILED",
      );
      const alerts = await db.notification.findMany({
        where: {
          userId: admin.id,
          dedupeKey: `delivery-failed:${n.id}:${admin.id}`,
        },
      });
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].jobStatus, "SKIPPED");
      assert(!alerts[0].body.includes("Private content"));
      assert(JSON.stringify(await operationalIssues(admin.id)).includes(n.id));
    },
  );

  await t.test(
    "unavailable database and incompatible schema classify as safe retryable service failures",
    async () => {
      const missing = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL!.startsWith("file:")
              ? "file:/nonexistent-phase10-directory/audit.db"
              : "mysql://p4test:fictional@127.0.0.1:13307/mixermates_p4_main?connect_timeout=1",
          },
        },
      });
      try {
        await missing.user.count();
        assert.fail("Unavailable database accepted query");
      } catch (e) {
        assert.equal(infrastructureFailure(e)?.status, 503);
      } finally {
        await missing.$disconnect();
      }
      const failure = infrastructureFailure({
        code: "P2022",
        message: "SECRET SQL OR CONNECTION",
      });
      assert.equal(failure?.status, 503);
      assert(!failure?.message.includes("SECRET"));
      assert.equal(
        infrastructureFailure(new Error("Private implementation error")),
        null,
      );
      assert.equal(infrastructureFailure({ code: "P2002" }), null);
    },
  );
});
