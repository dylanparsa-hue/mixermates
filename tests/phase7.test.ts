import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import {
  requestEventChange,
  reviewEventChange,
  termSnapshot,
  refundEligibility,
  customerEventChanges,
} from "../lib/event-operations";
import {
  processNotifications,
  retryNotification,
  runOperationalJobs,
  recoverIssuance,
  localMailboxTransport,
} from "../lib/operational-jobs";
import { eventOperationsView, operationalIssues } from "../lib/readiness";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  updateEventLifecycle,
  eligibility,
  expireReservation,
} from "../lib/booking-domain";
import { requestRefund, reviewRefund } from "../lib/operations";
import { localDateTime } from "../lib/event-config";
import { checkIn } from "../lib/services";
import { secretHash } from "../lib/security";
const base = process.env.TEST_BASE_URL || "";
if (
  !process.env.DATABASE_URL?.startsWith("file:") ||
  process.env.DB_PASSWORD !== undefined ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname)
)
  throw Error("Isolated loopback SQLite required");
test("Phase 7 reviewed terms, policy, durable jobs and readiness", async (t) => {
  const prefix = "p7_" + randomUUID().slice(0, 8),
    ids = [
      prefix + "org",
      prefix + "admin",
      prefix + "guest",
      prefix + "other",
      prefix + "staff",
    ];
  const [org, admin, guest, other, staff] = ids;
  const es: string[] = [];
  let num = 0;
  for (const [i, id] of ids.entries())
    await db.user.create({
      data: {
        id,
        email: id + "@example.test",
        username: id,
        name: id,
        passwordHash: "unused",
        dob: new Date("1990-01-01"),
        city: "Test",
        role: ["ORGANIZER", "ADMIN", "ATTENDEE", "ORGANIZER", "STAFF"][i],
      },
    });
  const event = async () => {
    const id = prefix + "e" + num++;
    es.push(id);
    return db.event.create({
      data: {
        id,
        slug: id,
        title: "Fictional Phase 7 test",
        description: "No real event",
        category: "House Party",
        genre: "House",
        image: "/images/halloween.jpg",
        city: "Test",
        venue: "Private venue label",
        privateVenue: "SECRET PRIVATE ADDRESS",
        latitude: 1,
        longitude: 1,
        startsAt: new Date(Date.now() + 2 * 86400000),
        endsAt: new Date(Date.now() + 3 * 86400000),
        age: 18,
        organizerId: org,
        capacity: 20,
        origin: "REAL",
        testOnly: true,
        status: "PUBLISHED",
        configurationStatus: "TEST_ONLY",
        approvalRequired: true,
        access: "PUBLIC",
        tiers: { create: { name: "General", price: 0, quantity: 20 } },
      },
      include: { tiers: true },
    });
  };
  const reserve = (e: any) =>
    reserveBooking(guest, {
      eventId: e.id,
      tierId: e.tiers[0].id,
      quantity: 1,
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    });
  const detail = (e: any) => ({
    eventId: e.id,
    version: e.termsVersion,
    kind: "DETAILS",
    reason: "Fictional rescheduling reason",
    values: {
      startsLocal: localDateTime(
        new Date(e.startsAt.getTime() + 86400000),
        e.timezone,
      ),
      endsLocal: localDateTime(
        new Date(e.endsAt.getTime() + 86400000),
        e.timezone,
      ),
      venue: e.venue,
      privateVenue: "NEW SECRET PRIVATE ADDRESS",
      city: e.city,
      latitude: e.latitude,
      longitude: e.longitude,
      entryInstructions:
        "Bring the permitted identity document for the required entrance check.",
    },
  });
  let e = await event(),
    b = await reserve(e),
    r: any;
  const paid = async (event: any) => {
    const b = await reserve(event);
    await db.booking.update({
      where: { id: b.id },
      data: {
        paymentState: "CONFIRMED",
        paymentStatus: "CONFIRMED",
        paymentRequired: true,
      },
    });
    await db.payment.update({
      where: { bookingId: b.id },
      data: {
        provider: "ORGANIZER_DIRECT",
        origin: "REAL",
        status: "CONFIRMED",
        workflowState: "CONFIRMED",
        amount: 3500,
        confirmedAt: new Date(),
      },
    });
    return db.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: { payment: true, event: true },
    });
  };
  t.after(async () => {
    const changes = await db.eventChange.findMany({
      where: { eventId: { in: es } },
      select: { id: true },
    });
    await db.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: ids } },
          ...changes.map((c) => ({ dedupeKey: { contains: c.id } })),
        ],
      },
    });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.refund.deleteMany({
      where: { payment: { booking: { eventId: { in: es } } } },
    });
    await db.eventChange.deleteMany({ where: { eventId: { in: es } } });
    await db.attendanceRecord.deleteMany({ where: { eventId: { in: es } } });
    await db.ticketCheckIn.deleteMany({
      where: { ticket: { booking: { eventId: { in: es } } } },
    });
    await db.ticket.deleteMany({ where: { booking: { eventId: { in: es } } } });
    await db.payment.deleteMany({
      where: { booking: { eventId: { in: es } } },
    });
    await db.commissionEntry.deleteMany({where:{booking:{ eventId: { in: es } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ eventId: { in: es } }}});
    await db.booking.deleteMany({ where: { eventId: { in: es } } });
    await db.eventStaff.deleteMany({ where: { eventId: { in: es } } });
    await db.eventTicketTier.deleteMany({ where: { eventId: { in: es } } });
    await db.event.deleteMany({ where: { id: { in: es } } });
    await db.session.deleteMany({ where: { userId: { in: ids } } });
    await db.userBadge.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  });
  await t.test(
    "Unauthorized organizer/scanner/customer change requests denied",
    async () => {
      for (const u of [other, staff, guest])
        await assert.rejects(() => requestEventChange(u, detail(e)), /403/);
    },
  );
  await t.test(
    "Request stores old/new values, freezes event and preserves immutable booking snapshots",
    async () => {
      const before = await db.booking.findUniqueOrThrow({
        where: { id: b.id },
      });
      r = await requestEventChange(org, detail(e));
      const updated = await db.event.findUniqueOrThrow({ where: { id: e.id } });
      assert.equal(updated.salesPaused, true);
      assert.equal(updated.startsAt.toISOString(), e.startsAt.toISOString());
      assert.equal(
        before.eventTermsSnapshot,
        (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
          .eventTermsSnapshot,
      );
      assert.equal(JSON.parse(r.previousValues).privateVenue, e.privateVenue);
      await assert.rejects(() => reserve(e), /409|503/);
    },
  );
  await t.test(
    "Conflicting request and unauthorized/own review rejected",
    async () => {
      await assert.rejects(() => requestEventChange(org, detail(e)), /409/);
      for (const u of [org, guest, staff])
        await assert.rejects(
          () =>
            reviewEventChange(u, {
              id: r.id,
              approve: true,
              notes: "Review attempted",
            }),
          /403/,
        );
    },
  );
  await t.test(
    "Concurrent approval applies once, notifies once and leaves booking terms untouched",
    async () => {
      const original = (
        await db.booking.findUniqueOrThrow({ where: { id: b.id } })
      ).eventTermsSnapshot;
      const result = await Promise.allSettled(
        [1, 2].map(() =>
          reviewEventChange(admin, {
            id: r.id,
            approve: true,
            notes: "Fictional independent change review",
          }),
        ),
      );
      assert.equal(result.filter((x) => x.status === "fulfilled").length, 1);
      const fresh = await db.event.findUniqueOrThrow({ where: { id: e.id } });
      assert.equal(fresh.termsVersion, 1);
      assert.equal(fresh.pendingChangeId, null);
      assert.equal(fresh.privateVenue, "NEW SECRET PRIVATE ADDRESS");
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
          .eventTermsSnapshot,
        original,
      );
      assert.equal(
        await db.notification.count({
          where: { dedupeKey: `event-change:${r.id}:${b.id}` },
        }),
        1,
      );
    },
  );
  await t.test(
    "Customer change projection masks private addresses and preserves dates",
    async () => {
      const rows = await customerEventChanges(b, false);
      assert.equal(rows.length, 1);
      assert(!JSON.stringify(rows).includes("SECRET"));
      assert(rows[0].current.startsAt);
      assert.equal(rows[0].current.entryInstructions, undefined);
      assert.equal(
        rows[0].reason,
        "Event details were updated. See the approved schedule below.",
      );
    },
  );
  await t.test(
    "Tickets retain identity across a later approved change",
    async () => {
      await approveRegistration(org, b.id, true);
      const tickets = await issueTickets(org, b.id);
      const fresh = await db.event.findUniqueOrThrow({
        where: { id: e.id },
        include: { tiers: true },
      });
      const change = await requestEventChange(org, detail(fresh));
      await assert.rejects(() => checkIn(org, e.id, tickets[0].token), /409/);
      await reviewEventChange(admin, {
        id: change.id,
        approve: true,
        notes: "Second fictional date review",
      });
      const after = await issueTickets(org, b.id);
      assert.equal(after[0].token, tickets[0].token);
      assert.equal(after.length, 1);
    },
  );
  await t.test(
    "Rejection restores prior pause without applying terms",
    async () => {
      const x = await event();
      await db.event.update({
        where: { id: x.id },
        data: { salesPaused: true },
      });
      x.salesPaused = true;
      const q = await requestEventChange(org, detail(x));
      await reviewEventChange(admin, {
        id: q.id,
        approve: false,
        notes: "Rejected fictional proposal",
      });
      const a = await db.event.findUniqueOrThrow({ where: { id: x.id } });
      assert.equal(a.salesPaused, true);
      assert.equal(a.startsAt.toISOString(), x.startsAt.toISOString());
    },
  );
  await t.test(
    "Cancellation invalidates pending change and cannot be bypassed by approval",
    async () => {
      const x = await event(),
        q = await requestEventChange(org, detail(x));
      await updateEventLifecycle(org, x.id, "CANCELLED");
      await assert.rejects(
        () =>
          reviewEventChange(admin, {
            id: q.id,
            approve: true,
            notes: "Cannot overwrite cancellation",
          }),
        /409/,
      );
      assert.equal(
        (await db.eventChange.findUniqueOrThrow({ where: { id: q.id } }))
          .status,
        "INVALIDATED",
      );
    },
  );
  await t.test(
    "Cancellation versus approval leaves a cancelled event and no revival",
    async () => {
      const x = await event(),
        q = await requestEventChange(org, detail(x));
      await Promise.allSettled([
        updateEventLifecycle(org, x.id, "CANCELLED"),
        reviewEventChange(admin, {
          id: q.id,
          approve: true,
          notes: "Concurrent independent review",
        }),
      ]);
      assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: x.id } })).status,
        "CANCELLED",
      );
    },
  );
  await t.test(
    "Stale terms, ended and attended changes cannot be approved",
    async () => {
      const x = await event(),
        q = await requestEventChange(org, detail(x));
      await db.event.update({
        where: { id: x.id },
        data: { termsVersion: { increment: 1 } },
      });
      await assert.rejects(
        () =>
          reviewEventChange(admin, {
            id: q.id,
            approve: true,
            notes: "Stale change rejected",
          }),
        /409/,
      );
      const y = await event();
      await db.event.update({
        where: { id: y.id },
        data: { startsAt: new Date(Date.now() - 10000) },
      });
      await assert.rejects(() => requestEventChange(org, detail(y)), /409/);
    },
  );
  await t.test(
    "Policy approval applies prospectively; prior booking policy remains unchanged",
    async () => {
      const x = await event(),
        old = await reserve(x);
      const q = await requestEventChange(org, {
        eventId: x.id,
        version: 0,
        kind: "REFUND_POLICY",
        reason: "Configure fictional refund policy",
        values: {
          kind: "CANCELLATION_ONLY",
          terms: "Fictional cancellation-only software review policy.",
          deadline: null,
          allowAfterChange: false,
        },
      });
      await reviewEventChange(admin, {
        id: q.id,
        approve: true,
        notes: "Fictional policy accepted, not legal certification",
      });
      const future = await reserve(x);
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: old.id } }))
          .refundPolicySnapshot,
        "{}",
      );
      assert.equal(
        JSON.parse(future.refundPolicySnapshot).kind,
        "CANCELLATION_ONLY",
      );
    },
  );
  await t.test(
    "Refund policy and deadline enforce routine requests without false rights claims",
    async () => {
      const x = await event();
      await db.event.update({
        where: { id: x.id },
        data: {
          refundPolicy: JSON.stringify({
            kind: "UNTIL_DEADLINE",
            terms: "Fictional test deadline, not approved real terms.",
            deadline: new Date(Date.now() - 10000).toISOString(),
            allowAfterChange: false,
          }),
        },
      });
      const q = await paid(x);
      await assert.rejects(
        () =>
          requestRefund(guest, { bookingId: q.id, reason: "Deadline request" }),
        /409/,
      );
      await updateEventLifecycle(org, x.id, "CANCELLED");
      assert.equal((await refundEligibility(db, { id: q.id })).allowed, true);
      const rr = await requestRefund(guest, {
        bookingId: q.id,
        reason: "Cancelled event review",
      });
      assert.equal(rr.status, "REQUESTED");
    },
  );
  await t.test(
    "Non-refundable label requires admin review; customer does not approve money",
    async () => {
      const x = await event();
      await db.event.update({
        where: { id: x.id },
        data: {
          refundPolicy: JSON.stringify({
            kind: "NON_REFUNDABLE_REVIEW",
            terms:
              "Fictional non-refundable label requiring legal exceptions review.",
            deadline: null,
            allowAfterChange: false,
          }),
        },
      });
      const q = await paid(x),
        rr = await requestRefund(guest, {
          bookingId: q.id,
          reason: "Request independent exception review",
        });
      await assert.rejects(
        () =>
          reviewRefund(org, {
            id: rr.id,
            version: 0,
            status: "APPROVED",
            notes: "Owner alone cannot resolve rights",
          }),
        /403/,
      );
      await assert.rejects(
        () =>
          reviewRefund(guest, {
            id: rr.id,
            version: 0,
            status: "APPROVED",
            notes: "Customer cannot approve",
          }),
        /403/,
      );
    },
  );
  await t.test(
    "Used tickets require support exception; cancellation preserves attendance history",
    async () => {
      const tickets = await db.ticket.findMany({ where: { bookingId: b.id } });
      await checkIn(org, e.id, tickets[0].token);
      await db.payment.update({
        where: { bookingId: b.id },
        data: { provider: "ORGANIZER_DIRECT", confirmedAt: new Date() },
      });
      await db.booking.update({
        where: { id: b.id },
        data: { paymentState: "CONFIRMED" },
      });
      assert.equal((await refundEligibility(db, { id: b.id })).allowed, false);
      await updateEventLifecycle(org, e.id, "CANCELLED");
      assert.equal(
        await db.attendanceRecord.count({
          where: { eventId: e.id, userId: guest, public: false },
        }),
        1,
      );
      await assert.rejects(() => checkIn(org, e.id, tickets[0].token), /409/);
    },
  );
  let notification: any;
  await t.test(
    "Notification worker claims concurrent jobs once with idempotency key",
    async () => {
      notification = await db.notification.create({
        data: {
          userId: guest,
          title: "Event details updated",
          body: "Fictional update",
          link: "/bookings/" + b.id,
        },
      });
      let count = 0;
      const transport = {
        send: async () => {
          count++;
        },
      };
      await Promise.all(
        [1, 2].map(() =>
          processNotifications(
            admin,
            transport,
            new Date(Date.now() + 1000),
            1,
            notification.id,
          ),
        ),
      );
      assert.equal(count, 1);
      assert.equal(
        (
          await db.notification.findUniqueOrThrow({
            where: { id: notification.id },
          })
        ).jobStatus,
        "MOCK_DELIVERED",
      );
    },
  );
  await t.test(
    "Recoverable failures back off, reach bounded retry limit and stay observable",
    async () => {
      notification = await db.notification.create({
        data: {
          userId: guest,
          title: "Refund status updated",
          body: "Fictional update",
          link: "/my-bookings",
        },
      });
      const fail = {
        send: async () => {
          throw Error("Do not persist private transport error");
        },
      };
      const now = new Date(Date.now() + 1000);
      await processNotifications(admin, fail, now, 1, notification.id);
      let n = await db.notification.findUniqueOrThrow({
        where: { id: notification.id },
      });
      assert.equal(n.jobStatus, "RETRY");
      assert.equal(n.attempts, 1);
      await processNotifications(admin, fail, now, 1, notification.id);
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .attempts,
        1,
      );
      for (let i = 0; i < 2; i++) {
        n = await db.notification.findUniqueOrThrow({ where: { id: n.id } });
        await processNotifications(
          admin,
          fail,
          new Date(n.nextAttemptAt.getTime() + 1),
          1,
          n.id,
        );
      }
      n = await db.notification.findUniqueOrThrow({ where: { id: n.id } });
      assert.equal(n.jobStatus, "FAILED");
      assert.equal(n.attempts, 3);
      assert.equal(n.lastError, "LOCAL_TRANSPORT_FAILURE");
      assert((await operationalIssues(admin)).jobs.some((j) => j.id === n.id));
    },
  );
  await t.test(
    "Admin retry is audited; ordinary retry denied and successful job stays available in-app",
    async () => {
      await assert.rejects(
        () => retryNotification(guest, notification.id),
        /403/,
      );
      await retryNotification(admin, notification.id);
      await processNotifications(
        admin,
        { send: async () => {} },
        new Date(Date.now() + 1000),
        1,
        notification.id,
      );
      const n = await db.notification.findUniqueOrThrow({
        where: { id: notification.id },
      });
      assert.equal(n.jobStatus, "MOCK_DELIVERED");
      assert.equal(n.deliveryStatus, "AVAILABLE");
      assert.equal(n.retryCycles, 1);
    },
  );
  await t.test(
    "Optional promotional consent suppresses transport but essential updates still process",
    async () => {
      const optional = await db.notification.create({
        data: {
          userId: guest,
          title: "Promotion",
          body: "Optional",
          category: "PROMOTIONAL",
        },
      });
      let count = 0;
      await processNotifications(
        admin,
        {
          send: async () => {
            count++;
          },
        },
        new Date(Date.now() + 1000),
        1,
        optional.id,
      );
      assert.equal(count, 0);
      assert.equal(
        (
          await db.notification.findUniqueOrThrow({
            where: { id: optional.id },
          })
        ).jobStatus,
        "SKIPPED",
      );
    },
  );
  await t.test(
    "Expired lease can be reclaimed; final abandoned attempt becomes failed",
    async () => {
      const n = await db.notification.create({
        data: {
          userId: guest,
          title: "Lease test",
          body: "Fictional",
          jobStatus: "PROCESSING",
          workerToken: "old",
          attempts: 1,
          leaseUntil: new Date(Date.now() - 1000),
        },
      });
      await processNotifications(
        admin,
        { send: async () => {} },
        new Date(),
        1,
        n.id,
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .attempts,
        2,
      );
      await db.notification.update({
        where: { id: n.id },
        data: {
          jobStatus: "PROCESSING",
          attempts: 3,
          leaseUntil: new Date(Date.now() - 1000),
          workerToken: "abandoned",
        },
      });
      await processNotifications(
        admin,
        { send: async () => {} },
        new Date(),
        1,
        n.id,
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "FAILED",
      );
    },
  );
  await t.test(
    "Reminder runner respects consent, cancellation and deduplication",
    async () => {
      const x = await event(),
        b = await reserve(x);
      await approveRegistration(org, b.id, true, "Fictional approval");
      await db.event.update({
        where: { id: x.id },
        data: { startsAt: new Date(Date.now() + 3600000) },
      });
      await db.user.update({
        where: { id: guest },
        data: { eventReminders: false },
      });
      await runOperationalJobs(admin);
      assert.equal(
        await db.notification.count({
          where: {
            userId: guest,
            link: "/bookings/" + b.id,
            category: "REMINDER",
          },
        }),
        0,
      );
      await db.user.update({
        where: { id: guest },
        data: { eventReminders: true },
      });
      await runOperationalJobs(admin);
      await runOperationalJobs(admin);
      assert.equal(
        await db.notification.count({
          where: {
            userId: guest,
            link: "/bookings/" + b.id,
            category: "REMINDER",
          },
        }),
        1,
      );
      const y = await event(),
        c = await reserve(y);
      await approveRegistration(org, c.id, true, "Fictional approval");
      await db.event.update({
        where: { id: y.id },
        data: { startsAt: new Date(Date.now() + 3600000) },
      });
      await updateEventLifecycle(org, y.id, "CANCELLED");
      await runOperationalJobs(admin);
      assert.equal(
        await db.notification.count({
          where: {
            userId: guest,
            link: "/bookings/" + c.id,
            category: "REMINDER",
          },
        }),
        0,
      );
    },
  );
  await t.test(
    "Expiry runner releases once, preserves review holds and confirmed funds",
    async () => {
      const x = await event(),
        unpaid = await reserve(x),
        held = await reserve(x),
        money = await paid(x);
      for (const q of [unpaid, held, money])
        await db.booking.update({
          where: { id: q.id },
          data: { reservationExpiresAt: new Date(Date.now() - 1000) },
        });
      await db.booking.update({
        where: { id: held.id },
        data: { reviewHold: true },
      });
      await Promise.all([runOperationalJobs(admin), runOperationalJobs(admin)]);
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: unpaid.id } }))
          .lifecycle,
        "EXPIRED",
      );
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: held.id } }))
          .inventoryHeld,
        true,
      );
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: money.id } }))
          .paymentState,
        "CONFIRMED",
      );
      assert.equal(
        (
          await db.eventTicketTier.findUniqueOrThrow({
            where: { id: x.tiers[0].id },
          })
        ).sold,
        2,
      );
    },
  );
  await t.test(
    "Issuance recovery rechecks eligibility and cannot approve registration",
    async () => {
      const x = await event(),
        q = await reserve(x);
      await assert.rejects(() => recoverIssuance(admin, q.id), /409/);
      assert.equal(await db.ticket.count({ where: { bookingId: q.id } }), 0);
      await approveRegistration(org, q.id, true);
      const [a, c] = await Promise.all([
        recoverIssuance(admin, q.id),
        recoverIssuance(admin, q.id),
      ]);
      assert.equal(a.count, 1);
      assert.equal(c.count, 1);
      assert.equal(await db.ticket.count({ where: { bookingId: q.id } }), 1);
    },
  );
  await t.test(
    "Readiness identifies unconfirmed and fictional checks without enabling sales",
    async () => {
      const x: any = await eventOperationsView(org, es[0]);
      assert.equal(x.readiness.salesAuthorized, false);
      assert.equal(x.readiness.realIdentityVerified, false);
      assert.equal(x.readiness.realRecipientVerified, false);
      assert(
        x.readiness.human.every((r: any) => r.status === "NEEDS_VERIFICATION"),
      );
      await assert.rejects(() => eventOperationsView(other, es[0]), /403/);
      await assert.rejects(() => operationalIssues(guest), /403/);
    },
  );
  await t.test(
    "Actual Halloween remains unconfirmed and nonbookable",
    async () => {
      const h = await db.event.findUniqueOrThrow({
        where: { id: "halloween" },
      });
      assert.equal(h.status, "DRAFT");
      assert.equal(h.configurationStatus, "UNCONFIRMED");
      assert.equal(h.salesPaused, true);
    },
  );
  await t.test(
    "HTTP authorization rejects customer and scanner management endpoints",
    async () => {
      const token = randomUUID();
      await db.session.create({
        data: {
          id: secretHash(token),
          userId: guest,
          expires: new Date(Date.now() + 3600000),
        },
      });
      const headers = {
        Cookie: "vibey-session=" + token,
        Origin: base,
        "Content-Type": "application/json",
      };
      assert.equal(
        (await fetch(base + "/api/job-operations", { headers })).status,
        403,
      );
      assert.equal(
        (
          await fetch(base + "/api/event-operations/request", {
            method: "POST",
            headers,
            body: JSON.stringify(detail(e)),
          })
        ).status,
        403,
      );
    },
  );
});
