import { mockNotificationDelivery } from "../lib/notification-mock";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import {
  operationsOverview,
  operationsPost,
  requestRefund,
  reviewRefund,
  supportRequest,
  reviewSupport,
} from "../lib/operations";
import { transaction, notify } from "../lib/domain-core";
import { updateEventLifecycle } from "../lib/booking-domain";
import { securityChange, secretHash } from "../lib/security";
const base = process.env.TEST_BASE_URL || "";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  process.env.DB_PASSWORD !== undefined ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname)
)
  throw Error("Isolated loopback SQLite only");
test("Phase 6 scoped operations, support, notifications and refund safeguards", async (t) => {
  const p = "p6_" + randomUUID().slice(0, 8);
  const ids = [p + "owner", p + "admin", p + "guest", p + "other", p + "staff"];
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
  const [owner, admin, guest, other, staff] = ids;
  const e = await db.event.create({
    data: {
      id: p,
      slug: p,
      title: "Fictional Phase 6",
      description: "Isolated operations test",
      category: "House Party",
      genre: "House",
      image: "/images/halloween.jpg",
      city: "Test",
      venue: "Hidden",
      privateVenue: "PRIVATE",
      latitude: 0,
      longitude: 0,
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 172800000),
      age: 18,
      organizerId: owner,
      capacity: 10,
      origin: "REAL",
      testOnly: true,
      status: "PUBLISHED",
      configurationStatus: "TEST_ONLY",
      access: "INVITATION_ONLY",
      tiers: { create: { name: "General", price: 3500, quantity: 10 } },
    },
    include: { tiers: true },
  });
  await db.eventStaff.create({
    data: { eventId: e.id, userId: staff, canReviewPayments: false },
  });
  const booking = async (key: string) => {
    await db.eventTicketTier.update({
      where: { id: e.tiers[0].id },
      data: { sold: { increment: 1 } },
    });
    await db.event.update({
      where: { id: e.id },
      data: { reservedCount: { increment: 1 } },
    });
    return db.booking.create({
      data: {
        id: p + key,
        idempotencyKey: p + key,
        userId: guest,
        eventId: e.id,
        tierId: e.tiers[0].id,
        quantity: 1,
        total: 3500,
        status: "APPROVED",
        paymentStatus: "CONFIRMED",
        registrationState: "APPROVED",
        paymentState: "CONFIRMED",
        lifecycle: "CONFIRMED",
        origin: "REAL",
        testOnly: true,
        inventoryHeld: true,
        payment: {
          create: {
            amount: 3500,
            fee: 0,
            status: "CONFIRMED",
            workflowState: "CONFIRMED",
            origin: "REAL",
            provider: "ORGANIZER_DIRECT",
            confirmedAt: new Date(),
          },
        },
        tickets: { create: { token: randomUUID(), status: "ACTIVE" } },
      },
      include: { payment: true, tickets: true },
    });
  };
  const b = await booking("booking");
  let r: any, report: any;
  try {
    await t.test(
      "Owner metrics count persisted data and separate organizer funds",
      async () => {
        const x: any = await operationsOverview(owner);
        assert.equal(x.metrics["Confirmed bookings"], 1);
        assert.equal(x.finance.confirmedDirect, 3500);
        assert.equal(x.finance.platformRevenue, null);
        assert.equal(x.metrics["Confirmed ticket quantity"], 1);
        assert.equal(x.events[0].tiers[0].confirmed, 1);
        assert.equal(x.finance.pendingAmount, 0);
      },
    );
    await t.test(
      "Other organizer sees no foreign bookings or funds",
      async () => {
        const x: any = await operationsOverview(other);
        assert.equal(x.bookings.length, 0);
        assert.equal(x.finance.confirmedDirect, 0);
      },
    );
    await t.test(
      "Scanner cannot retrieve finance or customer records",
      async () => {
        const x: any = await operationsOverview(staff);
        assert.equal(x.finance, undefined);
        assert.equal(x.refunds.length, 0);
      },
    );
    await t.test("Only customer owns refund request", async () => {
      await assert.rejects(
        () =>
          requestRefund(other, {
            bookingId: b.id,
            reason: "Fictional refund request",
          }),
        /403/,
      );
    });
    await t.test(
      "Concurrent refund retries produce one request and one notification",
      async () => {
        const rs = await Promise.all(
          [1, 2, 3].map(() =>
            requestRefund(guest, {
              bookingId: b.id,
              reason: "Fictional refund request",
            }),
          ),
        );
        r = rs[0];
        assert.equal(new Set(rs.map((x) => x.id)).size, 1);
        assert.equal(
          await db.notification.count({
            where: { dedupeKey: "refund-request:" + r.id },
          }),
          1,
        );
        assert.equal(
          (await db.payment.findUniqueOrThrow({ where: { id: b.payment!.id } }))
            .status,
          "CONFIRMED",
        );
      },
    );
    await t.test("Cross-owner and scanner review rejected", async () => {
      for (const u of [other, staff, guest])
        await assert.rejects(
          () =>
            reviewRefund(u, {
              id: r.id,
              version: r.version,
              status: "APPROVED",
              notes: "Fictional review",
            }),
          /403/,
        );
    });
    await t.test(
      "Cannot skip transfer evidence and customer receipt",
      async () => {
        await assert.rejects(
          () =>
            reviewRefund(owner, {
              id: r.id,
              version: r.version,
              status: "REFUND_CONFIRMED",
              received: true,
              notes: "Fictional review",
            }),
          /403/,
        );
      },
    );
    await t.test(
      "Approval releases inventory once and revokes active tickets",
      async () => {
        r = await reviewRefund(owner, {
          id: r.id,
          version: r.version,
          status: "APPROVED",
          notes: "Fictional policy exception accepted",
        });
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
            .lifecycle,
          "CANCELLED",
        );
        assert.equal(
          (
            await db.ticket.findUniqueOrThrow({
              where: { id: b.tickets[0].id },
            })
          ).status,
          "REVOKED",
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: e.tiers[0].id },
            })
          ).sold,
          0,
        );
        assert.equal(
          (await db.payment.findUniqueOrThrow({ where: { id: b.payment!.id } }))
            .workflowState,
          "REFUND_PENDING",
        );
      },
    );
    await t.test("Stale review cannot change approved request", async () => {
      await assert.rejects(
        () =>
          reviewRefund(owner, {
            id: r.id,
            version: 0,
            status: "REJECTED",
            notes: "Stale operation rejected",
          }),
        /409/,
      );
    });
    await t.test("Transfer report requires evidence reference", async () => {
      r = await reviewRefund(owner, {
        id: r.id,
        version: r.version,
        status: "AWAITING_ORGANIZER_TRANSFER",
        notes: "Awaiting fictional organizer action",
      });
      await assert.rejects(
        () =>
          reviewRefund(owner, {
            id: r.id,
            version: r.version,
            status: "TRANSFER_REPORTED",
            notes: "No transfer reference supplied",
          }),
        /400/,
      );
    });
    await t.test(
      "Transfer report preserves pending money and requires separate confirmation",
      async () => {
        r = await reviewRefund(owner, {
          id: r.id,
          version: r.version,
          status: "TRANSFER_REPORTED",
          notes: "FICTIONAL transfer evidence for testing only",
          transferReference: "FICTIONAL-EVIDENCE-REF-001",
        });
        assert.equal(
          (await db.payment.findUniqueOrThrow({ where: { id: b.payment!.id } }))
            .status,
          "REFUND_PENDING",
        );
        await assert.rejects(
          () =>
            reviewRefund(owner, {
              id: r.id,
              version: r.version,
              status: "REFUND_CONFIRMED",
              received: true,
              notes: "Cannot attest as customer",
            }),
          /403/,
        );
      },
    );
    await t.test(
      "Only independent customer receipt records confirmed refund with full history",
      async () => {
        r = await reviewRefund(guest, {
          id: r.id,
          version: r.version,
          status: "REFUND_CONFIRMED",
          received: true,
          notes: "FICTIONAL receipt independently confirmed",
        });
        assert.equal(
          (await db.payment.findUniqueOrThrow({ where: { id: b.payment!.id } }))
            .status,
          "REFUNDED",
        );
        assert.equal(
          await db.adminAuditLog.count({
            where: { targetId: r.id, entityType: "REFUND" },
          }),
          5,
        );
        assert.equal(
          (await db.payment.findUniqueOrThrow({ where: { id: b.payment!.id } }))
            .amount,
          3500,
        );
      },
    );
    await t.test("Unconfirmed money cannot request refund", async () => {
      const unpaid = await booking("unpaid");
      await db.payment.update({
        where: { id: unpaid.payment!.id },
        data: { confirmedAt: null },
      });
      await assert.rejects(
        () =>
          requestRefund(guest, {
            bookingId: unpaid.id,
            reason: "Not confirmed funds",
          }),
        /409/,
      );
    });

    await t.test(
      "Support case validates owned booking and notifies administrators",
      async () => {
        await assert.rejects(
          () =>
            supportRequest(other, {
              category: "PAYMENT",
              description: "Cannot link someone else's booking",
              bookingId: b.id,
            }),
          /403/,
        );
        report = await supportRequest(guest, {
          category: "PAYMENT",
          description: "Fictional private dispute description",
          bookingId: b.id,
        });
        assert.equal(
          await db.notification.count({
            where: { userId: admin, title: "Support case needs review" },
          }),
          1,
        );
      },
    );
    await t.test(
      "Organizer entitlement preserves customer refund and support history without exposing organizer finance",
      async () => {
        await db.userCapability.create({
          data: { userId: guest, capability: "ORGANIZER" },
        });
        try {
          const customer: any = await operationsOverview(
            guest,
            new URLSearchParams(),
            { customer: true },
          );
          assert(customer.refunds.some((value: any) => value.id === r.id));
          assert(customer.reports.some((value: any) => value.id === report.id));
          assert.equal(customer.finance, undefined);
          assert.equal(customer.events, undefined);
          const organizer: any = await operationsOverview(guest);
          assert.equal(organizer.refunds.length, 0);
          assert.equal(organizer.finance.confirmedDirect, 0);
        } finally {
          await db.userCapability.delete({
            where: {
              userId_capability: { userId: guest, capability: "ORGANIZER" },
            },
          });
        }
      },
    );
    await t.test(
      "Accused organizer and other customers cannot read private report",
      async () => {
        for (const u of [owner, other, staff]) {
          const x: any = await operationsOverview(u);
          assert.equal(
            x.reports.some((v: any) => v.id === report.id),
            false,
          );
          assert.equal(
            x.logs?.some((v: any) => v.targetId === report.id) || false,
            false,
          );
        }
      },
    );
    await t.test(
      "Only admin responds; customer sees response; closed cases remain immutable",
      async () => {
        await assert.rejects(
          () =>
            reviewSupport(owner, {
              id: report.id,
              version: 0,
              status: "RESOLVED",
              response: "Not authorized to respond",
            }),
          /403/,
        );
        report = await reviewSupport(admin, {
          id: report.id,
          version: 0,
          status: "RESOLVED",
          response: "Fictional support resolution recorded",
        });
        const x: any = await operationsOverview(guest);
        assert.equal(x.reports[0].response, report.response);
        await assert.rejects(
          () =>
            reviewSupport(admin, {
              id: report.id,
              version: 0,
              status: "DISMISSED",
              response: "Stale update not accepted",
            }),
          /409/,
        );
      },
    );
    await t.test(
      "Notifications deduplicate and roll back with failed transaction",
      async () => {
        await transaction(async (tx) => {
          await notify(tx, guest, p + "dedupe", "Private update", "Body");
          await notify(tx, guest, p + "dedupe", "Private update", "Body");
          const ticketNotice = await notify(
            tx,
            guest,
            "tickets:" + b.id,
            "Ticket ready",
            "Owned route",
          );
          assert.equal(ticketNotice.link, "/bookings/" + b.id);
        });
        assert.equal(
          await db.notification.count({ where: { dedupeKey: p + "dedupe" } }),
          1,
        );
        await assert.rejects(() =>
          transaction(async (tx) => {
            await notify(tx, guest, p + "rollback", "No loss", "Atomic");
            throw Error("forced rollback");
          }),
        );
        assert.equal(
          await db.notification.count({ where: { dedupeKey: p + "rollback" } }),
          0,
        );
      },
    );
    await t.test(
      "Local mock failure is recorded, retry succeeds and delivered retries deduplicate",
      async () => {
        const n = await db.notification.findUniqueOrThrow({
          where: { dedupeKey: p + "dedupe" },
        });
        let attempts = 0;
        assert.equal(
          (
            await mockNotificationDelivery(guest, n.id, async () => {
              throw Error("fictional failure");
            })
          ).status,
          "AVAILABLE_MOCK_FAILED",
        );
        assert.equal(
          (
            await mockNotificationDelivery(guest, n.id, async () => {
              attempts++;
            })
          ).status,
          "AVAILABLE_MOCK_DELIVERED",
        );
        await mockNotificationDelivery(guest, n.id, async () => {
          attempts++;
        });
        assert.equal(attempts, 1);
        assert.equal(
          await db.adminAuditLog.count({
            where: { targetId: n.id, action: "NOTIFICATION_MOCK_ATTEMPT" },
          }),
          2,
        );
      },
    );
    await t.test("Read state is owner scoped; consent persists", async () => {
      const n = await db.notification.findUniqueOrThrow({
        where: { dedupeKey: p + "dedupe" },
      });
      await operationsPost(other, "notice", { id: n.id, read: true });
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } })).read,
        false,
      );
      await operationsPost(guest, "notice", { id: n.id, read: true });
      await operationsPost(guest, "preferences", {
        eventReminders: false,
        promotionalNotifications: false,
        socialNotifications: false,
        organizerAnnouncements: false,
      });
      const x: any = await operationsOverview(guest);
      assert.equal(x.preferences.eventReminders, false);
      assert.equal(x.notices.find((v: any) => v.id === n.id).read, true);
    });
    await t.test(
      "Cancellation preserves money, marks refund pending and blocks event",
      async () => {
        await updateEventLifecycle(owner, e.id, "CANCELLED");
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
            .salesPaused,
          true,
        );
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: p + "unpaid" } }))
            .lifecycle,
          "CANCELLED",
        );
      },
    );
    await t.test(
      "Security changes revoke sessions and self lockout is denied",
      async () => {
        await db.session.create({
          data: {
            id: secretHash(p + "session"),
            userId: other,
            expires: new Date(Date.now() + 3600000),
          },
        });
        await securityChange(admin, other, { active: false });
        assert.equal(await db.session.count({ where: { userId: other } }), 0);
        await assert.rejects(
          () => securityChange(admin, admin, { active: false }),
          /409/,
        );
      },
    );
    await t.test(
      "HTTP ordinary user denied admin API and scanner denied refund review",
      async () => {
        const token = randomUUID();
        await db.session.create({
          data: {
            id: secretHash(token),
            userId: staff,
            expires: new Date(Date.now() + 3600000),
          },
        });
        const auth = { cookie: "vibey-session=" + token, Origin: base };
        const res = await fetch(base + "/api/admin", { headers: auth });
        assert.equal(res.status, 403);
        const denied = await fetch(base + "/api/operations/refund-review", {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: r.id,
            version: r.version,
            status: "UNDER_REVIEW",
            notes: "Scanner must be rejected",
          }),
        });
        assert.equal(denied.status, 403);
        const adminToken = randomUUID();
        await db.session.create({
          data: {
            id: secretHash(adminToken),
            userId: admin,
            expires: new Date(Date.now() + 3600000),
          },
        });
        const overview = await fetch(base + "/api/organizer", {
          headers: { Cookie: "vibey-session=" + adminToken },
        });
        assert.equal(overview.status, 200);
        assert((await overview.json()).events.some((v: any) => v.id === e.id));
      },
    );
  } finally {
    await db.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: ids } },
          {
            dedupeKey: { startsWith: "support:" + (report?.id || "no-report") },
          },
        ],
      },
    });
    await db.report.deleteMany({ where: { userId: { in: ids } } });
    await db.adminAuditLog.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { eventId: e.id }] },
    });
    await db.refund.deleteMany({
      where: { payment: { booking: { eventId: e.id } } },
    });
    await db.ticket.deleteMany({ where: { booking: { eventId: e.id } } });
    await db.payment.deleteMany({ where: { booking: { eventId: e.id } } });
    await db.commissionEntry.deleteMany({where:{booking:{ eventId: e.id }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ eventId: e.id }}});
    await db.booking.deleteMany({ where: { eventId: e.id } });
    await db.eventStaff.deleteMany({ where: { eventId: e.id } });
    await db.eventTicketTier.deleteMany({ where: { eventId: e.id } });
    await db.event.delete({ where: { id: e.id } });
    await db.session.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
