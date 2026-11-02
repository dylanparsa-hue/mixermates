import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ticketPricing, pricingKey } from "../lib/ticket-pricing";
import { simulatorEnvironment } from "../lib/simulator-policy";

test("RM100 absorb and customer policies have distinct accurate totals", () => {
  const a = ticketPricing(10000, 1, "ABSORB"),
    b = ticketPricing(10000, 1, "CUSTOMER");
  assert.deepEqual(
    [a.faceValue, a.platformFee, a.customerTotal, a.organizerBeforeGateway],
    [10000, 500, 10000, 9500],
  );
  assert.deepEqual(
    [b.faceValue, b.platformFee, b.customerTotal, b.organizerBeforeGateway],
    [10000, 500, 10500, 10000],
  );
});
test("order discount, multiple tickets, free tickets and half-sen rounding are integer-safe", () => {
  assert.deepEqual(
    [
      ticketPricing(10000, 3, "CUSTOMER", 3000).faceValue,
      ticketPricing(10000, 3, "CUSTOMER", 3000).platformFee,
    ],
    [27000, 1350],
  );
  assert.equal(ticketPricing(0, 10, "CUSTOMER").customerTotal, 0);
  assert.equal(ticketPricing(10, 1).platformFee, 1);
  assert.equal(ticketPricing(9, 1).platformFee, 0);
  assert.equal(ticketPricing(1, 10).platformFee, 1);
  for (let sen = 0; sen < 2000; sen++)
    assert(
      Number.isSafeInteger(ticketPricing(sen, 7, "CUSTOMER").customerTotal),
    );
});
test("malformed client money, rate and policy inputs cannot become monetary records", () => {
  for (const value of [NaN, Infinity, -1, 0.1, Number.MAX_SAFE_INTEGER])
    assert.throws(() => ticketPricing(value, 1));
  assert.throws(() => ticketPricing(100, 1, "GATEWAY_TO_CUSTOMER"));
  assert.throws(() => ticketPricing(100, 1, "ABSORB", 101));
  assert.throws(() => ticketPricing(100, 1.5));
  const old = process.env.PLATFORM_FEE_BPS;
  process.env.PLATFORM_FEE_BPS = "9999";
  assert.equal(ticketPricing(10000, 1).platformFee, 500);
  if (old === undefined) delete process.env.PLATFORM_FEE_BPS;
  else process.env.PLATFORM_FEE_BPS = old;
});

test(
  "Phase 2 fictional financial lifecycle",
  { skip: !simulatorEnvironment() },
  async (t) => {
    const { db } = await import("../lib/db"),
      { assertSimulator, simulatePayment, simulateRefund, sampleReceipt } =
        await import("../lib/payment-simulator"),
      { activateOrganizer } = await import("../lib/organizer-identity"),
      { saveEventDraft, submitEvent } = await import("../lib/event-management"),
      { reserveBooking, approveRegistration, updateEventLifecycle } =
        await import("../lib/booking-domain"),
      { commissionSummary } = await import("../lib/ticket-commission"),
      { requestRefund } = await import("../lib/operations"),
      { reviewPayment } = await import("../lib/payment-foundation"),
      { localDateTime } = await import("../lib/event-config");
    const marker = await assertSimulator(),
      buyer = marker.personas["Community Friend"],
      admin = marker.personas.Administrator;
    const owner = "commission-" + randomUUID();
    await db.user.create({
      data: {
        id: owner,
        email: owner + "@example.test",
        username: owner.slice(0, 24),
        name: "TEST Commission organizer",
        passwordHash: "disabled",
        dob: new Date("1990-01-01"),
        city: "Fictional",
      },
    });
    const before = await db.user.findUniqueOrThrow({ where: { id: owner } });
    await t.test(
      "free activation retains account credentials, role and identity",
      async () => {
        await activateOrganizer(owner);
        await activateOrganizer(owner);
        assert.deepEqual(
          await db.user.findUniqueOrThrow({ where: { id: owner } }),
          before,
        );
        assert.equal(
          await db.organizerIdentity.count({ where: { userId: owner } }),
          1,
        );
      },
    );
    async function event(
      policy = "ABSORB",
      price = 10000,
      discount = 0,
      approval = false,
    ) {
      const e = await saveEventDraft(owner, {
        creationKey: randomUUID(),
        title: "TEST Commission " + randomUUID().slice(0, 6),
        shortDescription: "Fictional Phase 2 finance test. No real money.",
        startsLocal: localDateTime(new Date(Date.now() + 15 * 86400000)),
        endsLocal: localDateTime(
          new Date(Date.now() + 15 * 86400000 + 7200000),
        ),
        city: "Fictional KL",
        venue: "Fictional studio",
        capacity: 100,
        approvalRequired: approval,
        paymentMode: "TEST_SIMULATOR",
        platformFeePolicy: policy,
        image: "/images/neon.jpg",
        tiers: [
          { name: "General", price, discount, quantity: 100, maxPerOrder: 10 },
        ],
      });
      await submitEvent(owner, e.id);
      assert.equal((await db.event.findUniqueOrThrow({where:{id:e.id}})).status,"PENDING_REVIEW");
      await updateEventLifecycle(admin,e.id,"PUBLISHED",{notes:"Independent fictional commission review",reviewerId:admin,outcome:"APPROVED"});
      await db.event.update({where:{id:e.id},data:{origin:"REAL",configurationStatus:"FICTIONAL_APPROVED",refundPolicy:JSON.stringify({kind:"REVIEW_REQUIRED",terms:"Fictional entry and refund conditions only.",deadline:null,allowAfterChange:true})}});
      return db.event.findUniqueOrThrow({
        where: { id: e.id },
        include: { tiers: true },
      });
    }
    async function reserve(e: any, quantity = 1, extra: any = {}) {
      return reserveBooking(buyer, {
        eventId: e.id,
        tierId: e.tiers[0].id,
        quantity,
        answers: {},
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() + 3600000),
        ...extra,
      });
    }
    async function pay(b: any) {
      return simulatePayment(buyer, {
        bookingId: b.id,
        outcome: "SUCCESS",
        idempotencyKey: randomUUID(),
      });
    }
    let absorb: any, pass: any, paid: any;
    await t.test(
      "unlimited paid/free drafts and publications ignore expired subscription and quotas",
      async () => {
        const old = await db.organizerSubscription.create({
          data: {
            userId: owner,
            plan: "STARTER",
            anchorAt: new Date("2025-01-01"),
            periodStart: new Date("2025-01-01"),
            periodEnd: new Date("2025-02-01"),
          },
        });
        for (let n = 0; n < 28; n++) await event("ABSORB", n % 2 ? 10000 : 0);
        assert.deepEqual(
          await db.organizerSubscription.findUnique({
            where: { userId: owner },
          }),
          old,
        );
        assert.equal(
          await db.organizerPublication.count({
            where: { subscriptionId: old.id },
          }),
          0,
        );
      },
    );
    await t.test(
      "RM100 organizer absorbs: server stores RM5 fee and customer pays RM100",
      async () => {
        absorb = await event();
        const b = await reserve(absorb);
        await pay(b);
        const f = await db.bookingFeeSnapshot.findUniqueOrThrow({
          where: { bookingId: b.id },
        });
        assert.deepEqual(
          [b.total, f.platformFee, f.organizerBeforeGateway],
          [10000, 500, 9500],
        );
        paid = b;
      },
    );
    await t.test(
      "RM100 customer pass-through: total RM105 and organizer RM100 before gateway",
      async () => {
        pass = await event("CUSTOMER");
        const b = await reserve(pass);
        await pay(b);
        const f = await db.bookingFeeSnapshot.findUniqueOrThrow({
          where: { bookingId: b.id },
        });
        assert.deepEqual(
          [b.total, f.platformFee, f.organizerBeforeGateway],
          [10500, 500, 10000],
        );
      },
    );
    await t.test(
      "multi-ticket discounted booking uses persisted discount before commission",
      async () => {
        const e = await event("CUSTOMER", 10000, 1000),
          b = await reserve(e, 3);
        await pay(b);
        const f = await db.bookingFeeSnapshot.findUniqueOrThrow({
          where: { bookingId: b.id },
        });
        assert.deepEqual(
          [f.faceValue, f.discount, f.platformFee, b.total],
          [27000, 3000, 1350, 28350],
        );
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 3);
      },
    );
    await t.test(
      "free RSVP issues exact quantity without payment or commission",
      async () => {
        const e = await event("CUSTOMER", 0),
          b = await reserve(e, 2);
        const { transaction } = await import("../lib/domain-core");
        const { issueEligibleTickets } = await import("../lib/booking-domain");
        await transaction((tx) => issueEligibleTickets(tx, b.id, buyer));
        assert.equal(b.paymentRequired, false);
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 2);
        assert.equal(
          await db.commissionEntry.count({ where: { bookingId: b.id } }),
          0,
        );
      },
    );
    await t.test(
      "client cannot supply fee, discount, rate, gateway fee or mismatched pricing revision",
      async () => {
        for (const field of [
          "platformFee",
          "total",
          "gatewayFee",
          "discount",
          "rateBps",
          "platformFeePolicy",
        ])
          await assert.rejects(reserve(pass, 1, { [field]: 0 }));
        await assert.rejects(
          reserve(pass, 1, { pricingKey: pricingKey("ABSORB", 10000, 0, 1) }),
          /pricing changed/,
        );
      },
    );
    await t.test(
      "snapshot survives price/policy changes and fee edit service locks after booking",
      async () => {
        const f = await db.bookingFeeSnapshot.findUniqueOrThrow({
          where: { bookingId: paid.id },
        });
        const { editableEvent } = await import("../components/create-event");
        const e = await db.event.findUniqueOrThrow({
          where: { id: absorb.id },
          include: { tiers: true, fields: true },
        });
        const d = editableEvent(e);
        delete d.tiers[0].priceInput;
        delete d.tiers[0].pricingMode;
        await assert.rejects(
          saveEventDraft(owner, {
            ...d,
            id: e.id,
            version: e.stateVersion,
            platformFeePolicy: "CUSTOMER",
          }),
          /financial settings/,
        );
        // Simulate a future authorized new version; old immutable snapshot remains unchanged.
        await db.event.update({
          where: { id: e.id },
          data: { platformFeePolicy: "CUSTOMER" },
        });
        await db.eventTicketTier.update({
          where: { id: e.tiers[0].id },
          data: { price: 20000 },
        });
        assert.deepEqual(
          await db.bookingFeeSnapshot.findUniqueOrThrow({
            where: { bookingId: paid.id },
          }),
          f,
        );
        const next = await reserve(
          await db.event.findUniqueOrThrow({
            where: { id: e.id },
            include: { tiers: true },
          }),
        );
        assert.equal(next.total, 21000);
      },
    );
    await t.test(
      "duplicate trusted payment callbacks accrue once and never collect commission",
      async () => {
        const e = await event(),
          b = await reserve(e, 2),
          input = {
            bookingId: b.id,
            outcome: "SUCCESS",
            idempotencyKey: randomUUID(),
          };
        await Promise.all([
          simulatePayment(buyer, input),
          simulatePayment(buyer, input),
        ]);
        await pay(b);
        assert.equal(
          await db.commissionEntry.count({
            where: { bookingId: b.id, kind: "ACCRUAL" },
          }),
          1,
        );
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 2);
        const s = await commissionSummary(owner);
        assert(s.sandbox.accrued > 0);
        assert.equal(s.sandbox.collected, 0);
        assert.equal(s.real.accrued, 0);
      },
    );
    await t.test(
      "gateway data is organizer-borne; unknown differs from recorded zero or known provider cost",
      async () => {
        const before = await commissionSummary(owner);
        await db.payment.update({
          where: { bookingId: paid.id },
          data: {
            gatewayFee: 312,
            gatewayFeeSource: "TEST verified transaction fixture",
          },
        });
        const after = await commissionSummary(owner);
        assert.equal(
          after.sandbox.gatewayKnown - before.sandbox.gatewayKnown,
          312,
        );
        assert.equal(
          after.sandbox.organizerEstimate!,
          before.sandbox.organizerEstimate! - 312,
        );
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: paid.id } }))
            .total,
          10000,
        );
      },
    );
    await t.test(
      "partial refund records exact cash, revokes admission and flags fee decision without guessed reversal",
      async () => {
        const e = await event("CUSTOMER"),
          b = await reserve(e, 2);
        await pay(b);
        const r = await requestRefund(buyer, {
          bookingId: b.id,
          reason: "TEST partial refund requested",
          amount: 5000,
          requestKey: randomUUID(),
        });
        const input = {
          bookingId: b.id,
          refundId: r.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        };
        await simulateRefund(buyer, input);
        await simulateRefund(buyer, input);
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
            .paymentState,
          "PARTIALLY_REFUNDED",
        );
        assert.equal(
          await db.ticket.count({
            where: { bookingId: b.id, status: "ACTIVE" },
          }),
          0,
        );
        assert.equal(
          await db.commissionEntry.count({
            where: { bookingId: b.id, kind: "REFUND_POLICY_REVIEW" },
          }),
          1,
        );
        await assert.rejects(
          requestRefund(buyer, {
            bookingId: b.id,
            reason: "TEST excessive refund requested",
            amount: 20000,
            requestKey: randomUUID(),
          }),
          /exceeds/,
        );
        const r2 = await requestRefund(buyer, {
          bookingId: b.id,
          reason: "TEST remaining balance refund",
          requestKey: randomUUID(),
        });
        assert.equal(r2.amount, 16000);
        await simulateRefund(buyer, {
          bookingId: b.id,
          refundId: r2.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        });
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
            .paymentState,
          "REFUNDED",
        );
        const s = await commissionSummary(owner);
        assert(s.sandbox.refunds >= 21000);
        assert(s.sandbox.refundFeeReview >= 1000);
        assert.equal(s.sandbox.organizerEstimate, null);
      },
    );
    await t.test(
      "cancelled event preserves accrued receivable and requires explicit refund settlement",
      async () => {
        const e = await event(),
          b = await reserve(e);
        await pay(b);
        await updateEventLifecycle(owner, e.id, "CANCELLED");
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
            .paymentState,
          "REFUND_PENDING",
        );
        assert.equal(
          (
            await db.commissionEntry.findFirstOrThrow({
              where: { bookingId: b.id },
            })
          ).amount,
          500,
        );
      },
    );
    let manual: any, mb: any, proof: any;
    await t.test(
      "manual QR evidence does not accrue or issue tickets before independent funds confirmation",
      async () => {
        const e = await event("CUSTOMER", 10000, 0, true);
        manual = await db.event.update({
          where: { id: e.id },
          data: {
            organizerId: marker.personas.Organizer,
            paymentMode: "ORGANIZER_QR",
            paymentDestinationId: marker.destinationId,
          },
          include: { tiers: true },
        });
        mb = await reserve(manual, 2);
        proof = await sampleReceipt(buyer, mb.id);
        assert.equal(mb.total, 21000);
        assert.equal(
          await db.commissionEntry.count({ where: { bookingId: mb.id } }),
          0,
        );
        assert.equal(await db.ticket.count({ where: { bookingId: mb.id } }), 0);
      },
    );
    await t.test(
      "QR pending filter runs before pagination and excludes old/nonmanual rows",
      async () => {
        for (let i = 0; i < 52; i++)
          await db.booking.create({
            data: {
              userId: buyer,
              eventId: manual.id,
              tierId: manual.tiers[0].id,
              quantity: 1,
              total: 0,
              paymentRequired: false,
              paymentState: "NOT_REQUIRED",
              lifecycle: "CANCELLED",
              origin: "REAL",
              testOnly: true,
              idempotencyKey: randomUUID(),
            },
          });
        const { reviewQueue } = await import("../lib/customer-api");
        const rows = await reviewQueue(
          { id: admin, role: "ADMIN" },
          manual.id,
          1,
          true,
        );
        assert.equal(rows[0].total, 1);
        assert.equal(rows[0].pages, 1);
        assert.equal(rows[0].bookings[0].id, mb.id);
      },
    );
    await t.test(
      "foreign organizer, purchaser and registration-only staff cannot confirm payment",
      async () => {
        const data = {
          evidenceId: proof.id,
          decision: "CONFIRMED" as const,
          receivedAmount: 21000,
          fundsVerified: true,
          notes: "TEST incoming funds verified independently",
        };
        await assert.rejects(reviewPayment(owner, mb.id, data), /403/);
        await assert.rejects(reviewPayment(buyer, mb.id, data), /403/);
        await db.eventStaff.create({
          data: {
            eventId: manual.id,
            userId: owner,
            canApproveRegistrations: true,
            canReviewPayments: false,
          },
        });
        await assert.rejects(reviewPayment(owner, mb.id, data), /403/);
        await assert.rejects(commissionSummary(owner, manual.id), /403/);
      },
    );
    await t.test(
      "independent funds confirmation accrues but registration remains a separate requirement",
      async () => {
        await assert.rejects(
          reviewPayment(marker.personas.Organizer, mb.id, {
            evidenceId: proof.id,
            decision: "CONFIRMED",
            receivedAmount: 21000,
            fundsVerified: false,
          }),
          /actual incoming funds/,
        );
        await reviewPayment(marker.personas.Organizer, mb.id, {
          evidenceId: proof.id,
          decision: "CONFIRMED",
          receivedAmount: 21000,
          fundsVerified: true,
          notes: "TEST funds independently verified",
        });
        assert.equal(await db.ticket.count({ where: { bookingId: mb.id } }), 0);
        assert.equal(
          (
            await db.commissionEntry.findFirstOrThrow({
              where: { bookingId: mb.id },
            })
          ).amount,
          1000,
        );
        await approveRegistration(marker.personas.Organizer, mb.id, true);
        assert.equal(await db.ticket.count({ where: { bookingId: mb.id } }), 2);
      },
    );
    await t.test(
      "payment rejection creates no commission or ticket",
      async () => {
        const b = await reserve(manual),
          proof = await sampleReceipt(buyer, b.id);
        await reviewPayment(marker.personas.Organizer, b.id, {
          evidenceId: proof.id,
          decision: "REJECTED",
          notes: "TEST funds not found",
        });
        assert.equal(
          await db.commissionEntry.count({ where: { bookingId: b.id } }),
          0,
        );
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
      },
    );
    await t.test(
      "legacy completed transactions have no retroactive snapshot or commission",
      async () => {
        const e = await event();
        const p = await db.booking.create({
          data: {
            userId: buyer,
            eventId: e.id,
            tierId: e.tiers[0].id,
            quantity: 1,
            total: 10000,
            idempotencyKey: randomUUID(),
            origin: "REAL",
            testOnly: true,
            lifecycle: "CONFIRMED",
            paymentState: "CONFIRMED",
            paymentStatus: "CONFIRMED",
            registrationState: "NOT_REQUIRED",
            payment: {
              create: {
                amount: 10000,
                fee: 0,
                provider: "ORGANIZER_DIRECT",
                confirmedAt: new Date(),
                workflowState: "CONFIRMED",
                status: "CONFIRMED",
                origin: "REAL",
              },
            },
          },
        });
        const { transaction } = await import("../lib/domain-core"),
          { accrueCommission } = await import("../lib/ticket-commission");
        await transaction((tx) => accrueCommission(tx, p.id));
        assert.equal(
          await db.bookingFeeSnapshot.count({ where: { bookingId: p.id } }),
          0,
        );
        assert.equal(
          await db.commissionEntry.count({ where: { bookingId: p.id } }),
          0,
        );
      },
    );
    await t.test(
      "admin sees event summaries and separate real/sandbox balances; organizer cannot read foreign event",
      async () => {
        const s = await commissionSummary(admin);
        assert(s.events.some((e) => e.eventId === manual.id));
        assert.equal(s.real.accrued, 0);
        assert.equal(s.sandbox.collected, 0);
        const own = await commissionSummary(owner);
        assert(!own.events.some((e) => e.eventId === manual.id));
        assert.equal(own.collectionEnabled, false);
      },
    );
    // These labeled fixtures are deliberately retained in this disposable Lab for review.
  },
);
