import { mapLocation } from "../lib/map-location";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { db } from "../lib/db";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
  submitPaymentEvidence,
  reviewPayment,
} from "../lib/payment-foundation";
import { paymentRiskView, digest, referenceDigest } from "../lib/payment-risk";
import {
  reserveBooking,
  approveRegistration,
  updateEventLifecycle,
} from "../lib/booking-domain";
import { reconciliation, financialExport, csvRow } from "../lib/reconciliation";
import { guestList, listPage } from "../lib/guest-list";
import {
  entranceOverview,
  entranceExportStream,
  entranceAction,
} from "../lib/entrance";
import { eventOperationsView } from "../lib/readiness";
import { setEventStaff } from "../lib/staff-permissions";
if (
  !(
    process.env.DATABASE_URL?.startsWith("file:") ||
    (process.env.MYSQL_DISPOSABLE_TEST === "true" &&
      /^mysql:\/\/p4test:[^@]+@127\.0\.0\.1:13306\/mixermates_p4_main$/.test(
        process.env.DATABASE_URL || "",
      ))
  ) ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Isolated fictional SQLite only");
test("Phase 9 payment risk, reconciliation, paged guests and readiness", async (t) => {
  const p = "p9_" + randomUUID().slice(0, 8);
  let n = 0;
  const user = async (role: string) => {
    const id = p + n++;
    return db.user.create({
      data: {
        id,
        name: id,
        username: id,
        email: id + "@example.test",
        passwordHash: "unused",
        dob: new Date("1990-01-01"),
        city: "Test",
        role,
      },
    });
  };
  const org = await user("ORGANIZER"),
    admin = await user("ADMIN"),
    guest = await user("ATTENDEE"),
    other = await user("ORGANIZER"),
    staff = await user("STAFF");
  const bytes = await QRCode.toBuffer("FICTIONAL RECEIPT " + p);
  const asset = async (id: string, data = bytes) =>
    db.fileUpload.create({
      data: {
        userId: id,
        private: true,
        mime: "image/png",
        data: new Uint8Array(data),
        path: p + n++,
      },
    });
  const qr = await asset(org.id);
  const recipient = await submitPaymentDestination(org.id, {
    methodType: "DUITNOW",
    label: "Fictional destination",
    recipientName: "FICTIONAL ORGANIZER",
    qrAssetId: qr.id,
    instructions: "Do not transfer real money",
  });
  await reviewPaymentDestination(admin.id, recipient.id, true);
  const event = await db.event.create({
    data: {
      slug: p,
      title: "Fictional Phase9",
      description: "No real event",
      category: "House Party",
      genre: "House",
      image: "/images/halloween.jpg",
      city: "Test",
      venue: "Hidden",
      privateVenue: "SECRET TEST VENUE",
      latitude: 0,
      longitude: 0,
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 172800000),
      capacity: 500,
      organizerId: org.id,
      origin: "REAL",
      testOnly: true,
      status: "PUBLISHED",
      configurationStatus: "FICTIONAL_APPROVED",
      approvalRequired: true,
      paymentDestinationId: recipient.destinationId,
      tiers: {
        create: {
          name: "General",
          price: 3500,
          quantity: 500,
          maxPerOrder: 10,
        },
      },
    },
    include: { tiers: true },
  });
  const reserve = () =>
    reserveBooking(guest.id, {
      eventId: event.id,
      tierId: event.tiers[0].id,
      quantity: 1,
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    });
  const b = await reserve(),
    b2 = await reserve();
  let e: any, e2: any;
  await t.test(
    "SHA-256 is byte-based and payment references normalize consistently",
    () => {
      assert.equal(digest(bytes).length, 64);
      assert.equal(referenceDigest(" ref 123 "), referenceDigest("REF123"));
    },
  );
  await t.test(
    "evidence stores optional claims without confirming funds or issuing tickets",
    async () => {
      e = await submitPaymentEvidence(
        guest.id,
        b.id,
        (await asset(guest.id)).id,
        "PAYMENT",
        {
          claimedAmount: 3400,
          claimedRecipient: "DIFFERENT RECIPIENT",
          paymentReference: "FictionalRef",
        },
      );
      assert.equal(e.receiptSha256, digest(bytes));
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
          .paymentState,
        "PROOF_SUBMITTED",
      );
      assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
    },
  );
  await t.test(
    "identical receipt on another booking is accepted for investigation",
    async () => {
      e2 = await submitPaymentEvidence(
        guest.id,
        b2.id,
        (await asset(guest.id)).id,
        "PAYMENT",
        { paymentReference: "fictionalref" },
      );
      const view = await paymentRiskView(org.id, b2.id);
      assert(
        view.evidence[0].indicators.some((r) => r.code === "DUPLICATE_FILE"),
      );
      assert(
        view.evidence[0].indicators.some((r) => r.code === "REUSED_REFERENCE"),
      );
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b2.id } }))
          .paymentState,
        "PROOF_SUBMITTED",
      );
    },
  );
  await t.test(
    "late duplicate also appears on the earlier evidence and claims flag mismatches",
    async () => {
      const v = await paymentRiskView(org.id, b.id);
      for (const code of [
        "DUPLICATE_FILE",
        "AMOUNT_MISMATCH",
        "RECIPIENT_MISMATCH",
      ])
        assert(v.evidence[0].indicators.some((r) => r.code === code));
    },
  );
  await t.test(
    "cross-organizer and scanner financial access are denied",
    async () => {
      await assert.rejects(() => paymentRiskView(other.id, b.id), /403/);
      await assert.rejects(() => reconciliation(staff.id, event.id), /403/);
      await assert.rejects(() => financialExport(other.id, event.id), /403/);
    },
  );
  await t.test(
    "organizer duplicate warnings disclose no matching identity, hash, receipt or booking",
    async () => {
      const s = JSON.stringify(await paymentRiskView(org.id, b.id));
      for (const forbidden of [
        b2.id,
        e2.receiptUploadId,
        guest.email,
        digest(bytes),
        referenceDigest("fictionalref")!,
      ])
        assert(!s.includes(forbidden));
    },
  );
  await t.test("platform-wide receipt analysis is admin-only", async () => {
    const org2 = await user("ORGANIZER");
    await db.event.update({
      where: { id: event.id },
      data: { organizerId: org2.id },
    });
    const hidden = await db.event.create({
      data: {
        ...Object.fromEntries(
          Object.entries(event).filter(
            ([k]) => !["id", "slug", "tiers", "createdAt"].includes(k),
          ),
        ),
        slug: p + "hidden",
        organizerId: org.id,
      } as any,
    });
    await db.booking.update({
      where: { id: b2.id },
      data: { eventId: hidden.id },
    });
    assert(
      !(await paymentRiskView(org.id, b2.id)).evidence[0].indicators.some(
        (r) => r.code === "DUPLICATE_FILE",
      ),
    );
    assert(
      (await paymentRiskView(admin.id, b2.id)).evidence[0].indicators.some(
        (r) => r.code === "DUPLICATE_FILE",
      ),
    );
    await db.booking.update({
      where: { id: b2.id },
      data: { eventId: event.id },
    });
    await db.event.update({
      where: { id: event.id },
      data: { organizerId: org.id },
    });
  });
  await t.test(
    "repeated rejected corrections and late review-held evidence stay reviewable",
    async () => {
      for (let i = 0; i < 3; i++) {
        await reviewPayment(org.id, b2.id, {
          evidenceId: e2.id,
          decision: "REJECTED",
          notes: "Fictional correction required; independently reviewed",
        });
        if (i === 2)
          await db.booking.update({
            where: { id: b2.id },
            data: { reservationExpiresAt: new Date(Date.now() - 60000) },
          });
        e2 = await submitPaymentEvidence(
          guest.id,
          b2.id,
          (await asset(guest.id)).id,
        );
      }
      const v = await paymentRiskView(org.id, b2.id),
        codes = v.evidence.flatMap((e) => e.indicators.map((r) => r.code));
      for (const code of [
        "REPEATED_REJECTIONS",
        "REPEATED_CORRECTIONS",
        "OUTSIDE_WINDOW",
      ])
        assert(codes.includes(code));
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b2.id } }))
          .paymentState,
        "PROOF_SUBMITTED",
      );
      assert.equal(await db.ticket.count({ where: { bookingId: b2.id } }), 0);
    },
  );
  await t.test(
    "no risk result bypasses the independent funds attestation",
    async () => {
      await assert.rejects(
        () =>
          reviewPayment(org.id, b.id, {
            evidenceId: e.id,
            decision: "CONFIRMED",
            receivedAmount: 3500,
          }),
        /400/,
      );
    },
  );
  await t.test(
    "risk indicators retain human decisions and concurrent confirmation is idempotent",
    async () => {
      const d = {
        evidenceId: e.id,
        decision: "CONFIRMED" as const,
        fundsVerified: true,
        receivedAmount: 3500,
        notes: "Independently checked fictional funds despite claimed mismatch",
      };
      await Promise.all([
        reviewPayment(org.id, b.id, d),
        reviewPayment(org.id, b.id, d),
      ]);
      assert.equal(
        await db.paymentReview.count({
          where: { paymentId: e.paymentId, decision: "CONFIRMED" },
        }),
        1,
      );
      assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
    },
  );
  await t.test(
    "reconciliation uses full event totals and separates organizer money",
    async () => {
      const d = await reconciliation(org.id, event.id);
      assert.equal(d.summary.expected, 7000);
      assert.equal(d.summary.organizerReceived, 3500);
      assert.equal(d.summary.evidenceSubmitted, 3500);
      assert(!JSON.stringify(d).includes('"revenue"'));
      assert.equal(
        (
          await reconciliation(org.id, event.id, {
            filter: "AWAITING_APPROVAL",
          })
        ).total,
        1,
      );
    },
  );
  await t.test(
    "separate approval issues one ticket and holder search persists",
    async () => {
      await approveRegistration(org.id, b.id, true);
      await approveRegistration(org.id, b.id, true);
      assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 1);
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b.id } })).guestName,
        guest.name,
      );
    },
  );
  await t.test(
    "payment concerns reuse private support records without changing confirmed funds",
    async () => {
      // The existing support lifecycle/notification service is covered by Phase6.
      // A scoped persisted fixture avoids notifying administrators created concurrently by other suites.
      await db.report.create({
        data: {
          userId: guest.id,
          eventId: event.id,
          bookingId: b.id,
          targetId: event.id,
          category: "PAYMENT",
          reason: "Fictional payment concern for manual investigation",
          status: "OPEN",
        },
      });
      const d = await reconciliation(org.id, event.id, { filter: "DISPUTED" });
      assert.equal(d.total, 1);
      assert.equal(d.summary.disputed, 3500);
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
          .paymentState,
        "CONFIRMED",
      );
    },
  );
  await t.test(
    "financial CSV is private, formula-safe, audited and omits secrets",
    async () => {
      assert(csvRow([" =HYPERLINK(1)"]).startsWith("\"'"));
      const text = await new Response(
        await financialExport(org.id, event.id),
      ).text();
      assert(text.includes(b.id));
      for (const bad of [
        e.receiptUploadId,
        guest.email,
        "FICTIONAL ORGANIZER",
        bytes.toString("base64"),
      ])
        assert(!text.includes(bad));
      assert.equal(
        await db.adminAuditLog.count({
          where: {
            userId: org.id,
            eventId: event.id,
            action: "FINANCIAL_REVIEW_EXPORTED",
          },
        }),
        1,
      );
    },
  );
  await t.test(
    "scanner-only guest projection omits financial and registration answers",
    async () => {
      await setEventStaff(org.id, {
        eventId: event.id,
        userId: staff.id,
        active: true,
        canCheckIn: true,
        canViewGuests: true,
        canReviewPayments: false,
      });
      const d = await guestList(staff.id, event.id);
      const text = JSON.stringify(d);
      for (const bad of [
        "paymentState",
        "recipient",
        "answers",
        "claimedAmount",
        guest.email,
      ])
        assert(!text.includes(bad));
      await assert.rejects(
        () => guestList(staff.id, event.id, { payment: "CONFIRMED" }),
        /403/,
      );
    },
  );
  await t.test(
    "server guest search, registration, payment and tier filters work",
    async () => {
      assert.equal(
        (
          await guestList(org.id, event.id, {
            search: guest.name,
            registration: "APPROVED",
            payment: "CONFIRMED",
            tier: event.tiers[0].id,
          })
        ).total,
        1,
      );
      assert.equal(
        (await guestList(org.id, event.id, { search: "no such guest" })).total,
        0,
      );
      assert.equal(
        (await guestList(org.id, event.id, { lifecycle: "PENDING" })).total,
        1,
      );
    },
  );
  await t.test(
    "invalid pages normalize and excessive pages clamp",
    async () => {
      for (const value of ["bad", "-1", "1.2", "Infinity"])
        assert.equal(listPage(value), 1);
      assert.equal(
        (await guestList(org.id, event.id, { page: 999999 })).page,
        1,
      );
    },
  );
  await t.test("pagination never transfers all 125 registrations", async () => {
    await db.booking.createMany({
      data: Array.from({ length: 125 }, (_, i) => ({
        userId: guest.id,
        eventId: event.id,
        tierId: event.tiers[0].id,
        total: 0,
        quantity: 1,
        idempotencyKey: p + "page" + i,
        guestName: "Fictional paged " + String(i).padStart(3, "0"),
        lifecycle: "PENDING",
        paymentState: "NOT_REQUIRED",
        paymentRequired: false,
        origin: "REAL",
      })),
    });
    const first = await guestList(org.id, event.id, { sort: "NAME" }),
      next = await guestList(org.id, event.id, { sort: "NAME", page: 2 });
    assert.equal(first.total, 127);
    assert.equal(first.guests.length, 50);
    assert.equal(next.guests.length, 50);
    assert(!first.guests.some((a) => next.guests.some((b) => b.id === a.id)));
  });
  await t.test(
    "server admission still requires ID and records private attendance once",
    async () => {
      const ticket = await db.ticket.findFirstOrThrow({
        where: { bookingId: b.id },
      });
      await assert.rejects(
        () =>
          entranceAction(
            staff.id,
            { eventId: event.id, ticketId: ticket.id },
            true,
          ),
        /identification/,
      );
      await entranceAction(
        staff.id,
        { eventId: event.id, ticketId: ticket.id, identityConfirmed: true },
        true,
      );
      await assert.rejects(
        () =>
          entranceAction(
            staff.id,
            { eventId: event.id, ticketId: ticket.id, identityConfirmed: true },
            true,
          ),
        /Already checked/,
      );
      assert.equal(
        (
          await db.attendanceRecord.findUniqueOrThrow({
            where: { userId_eventId: { userId: guest.id, eventId: event.id } },
          })
        ).public,
        false,
      );
    },
  );
  await t.test(
    "recent arrivals and attendance totals are independent of guest page",
    async () => {
      const d = await entranceOverview(org.id, event.id, {
        search: "no match",
        page: 99,
      });
      assert.equal(d.total, 0);
      assert.equal(d.counts.checkedIn, 1);
      assert.equal(
        (await guestList(org.id, event.id, { sort: "RECENT_ARRIVALS" })).total,
        1,
      );
    },
  );
  await t.test(
    "guest CSV streaming is private and contains no admission token",
    async () => {
      const ticket = await db.ticket.findFirstOrThrow({
        where: { bookingId: b.id },
      });
      const text = await new Response(
        await entranceExportStream(org.id, event.id),
      ).text();
      assert(text.includes(ticket.id));
      assert(!text.includes(ticket.token));
      await assert.rejects(
        () => entranceExportStream(staff.id, event.id),
        /403/,
      );
    },
  );
  await t.test(
    "reviewed receipt history and risk audit retain actor and decision",
    async () => {
      assert(
        (await paymentRiskView(org.id, b.id)).reviews.some(
          (r) => r.fundsVerified && r.reviewer === org.name,
        ),
      );
      assert(
        (await db.adminAuditLog.count({
          where: {
            userId: org.id,
            eventId: event.id,
            action: "PAYMENT_RISK_REVIEWED",
          },
        })) > 0,
      );
    },
  );
  await t.test(
    "destination disable flags risk and keeps historical recipient snapshot",
    async () => {
      const prior = (
        await db.booking.findUniqueOrThrow({ where: { id: b2.id } })
      ).recipientSnapshot;
      await db.paymentRecipientVersion.update({
        where: { id: recipient.id },
        data: { disabledAt: new Date() },
      });
      assert(
        (await paymentRiskView(org.id, b2.id)).evidence[0].indicators.some(
          (r) => r.code === "DESTINATION_INELIGIBLE",
        ),
      );
      assert.equal(
        (await db.booking.findUniqueOrThrow({ where: { id: b2.id } }))
          .recipientSnapshot,
        prior,
      );
    },
  );
  await t.test(
    "cancelled confirmed funds stay in organizer receipts and unresolved cases",
    async () => {
      await updateEventLifecycle(org.id, event.id, "CANCELLED");
      const d = await reconciliation(org.id, event.id, {
        filter: "CANCELLED_FUNDS",
      });
      assert.equal(d.summary.organizerReceived, 3500);
      assert.equal(d.total, 1);
      assert.equal(d.summary.outstanding, 0);
      assert(
        (await paymentRiskView(org.id, b.id)).evidence[0].indicators.some(
          (r) => r.code === "BOOKING_INACTIVE",
        ),
      );
    },
  );
  await t.test(
    "readiness distinguishes software, human, owner and external statuses and never unlocks sales",
    async () => {
      const d = await eventOperationsView(org.id, event.id);
      assert(d.readiness);
      assert.equal(d.readiness.salesAuthorized, false);
      assert.equal(d.readiness.realIdentityVerified, false);
      assert.equal(d.readiness.realRecipientVerified, false);
      assert.equal(d.readiness.categories.length, 6);
      assert(
        d.readiness.human.some(
          (r) => r.blockerStatus === "BLOCKED_EXTERNAL_SERVICE",
        ),
      );
      assert(
        d.readiness.human.some(
          (r) => r.blockerStatus === "BLOCKED_OWNER_DECISION",
        ),
      );
    },
  );
  await t.test(
    "malformed optional payment claims fail validation",
    async () => {
      await assert.rejects(() =>
        submitPaymentEvidence(guest.id, b2.id, e2.receiptUploadId, "PAYMENT", {
          claimedAmount: -1,
        }),
      );
    },
  );
  await t.test(
    "protected or malformed map coordinates cannot create a marker",
    () => {
      for (const e of [
        {},
        { latitude: null, longitude: null },
        { latitude: NaN, longitude: 101 },
        { latitude: 3, longitude: Infinity },
        { latitude: 91, longitude: 101 },
      ])
        assert.equal(mapLocation(e), null);
      assert.deepEqual(mapLocation({ latitude: 3, longitude: 101 }), [101, 3]);
    },
  );
  await t.test(
    "revoked staff cannot read guest or entrance pages",
    async () => {
      await setEventStaff(org.id, {
        eventId: event.id,
        userId: staff.id,
        active: false,
      });
      await assert.rejects(() => guestList(staff.id, event.id), /403/);
      await assert.rejects(() => entranceOverview(staff.id, event.id), /403/);
    },
  );
});
