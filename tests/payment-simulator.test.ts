import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  simulatorEnvironment,
  simulatorPaymentConfirmed,
} from "../lib/simulator-policy";
import { paidEventErrors } from "../lib/event-wizard-validation";
const cwd = "/Users/parsa/.codex/tmp/mixermates-correction-20261102/preview";
const env = {
  NODE_ENV: "development",
  MIXERMATES_PAYMENT_SIMULATOR: "enabled",
  MIXERMATES_TEST_LAB: "enabled",
  ISOLATED_TEST_DATA: "true",
  LOCAL_CUSTOMER_TEST_ENABLED: "true",
  TICKET_SALES_MODE: "disabled",
  SITE_MODE: "coming_soon",
  DEMO_MODE: "false",
  LOCAL_DEMO_BOOKING_ENABLED: "false",
  HOSTINGER_DATABASE_BOOTSTRAP: "false",
  HOSTINGER_SEED_DEMO: "false",
  DATABASE_URL: "file:" + cwd + "/prisma/audit.db",
  APP_ORIGIN: "http://localhost:3082",
};
test("simulator fails closed for every missing flag, production, canonical/hosted DB, public origin and gateway credentials", () => {
  assert(simulatorEnvironment(env, cwd));
  for (const key of Object.keys(env))
    assert.equal(
      simulatorEnvironment({ ...env, [key]: undefined }, cwd),
      false,
      key,
    );
  for (const patch of [
    { NODE_ENV: "production" },
    { DATABASE_URL: "file:/Users/parsa/Desktop/EVENT FINDER/prisma/dev.db" },
    { DATABASE_URL: "mysql://example.test/live" },
    { APP_ORIGIN: "https://mixermates.com" },
    { STRIPE_SECRET_KEY: "fictional" },
    { ADYEN_API_KEY: "fictional" },
    { DB_HOST: "127.0.0.1" },
  ])
    assert.equal(simulatorEnvironment({ ...env, ...patch }, cwd), false);
  assert.equal(simulatorEnvironment(env, "/tmp/unverified"), false);
  assert.equal(
    simulatorPaymentConfirmed(
      { testOnly: true },
      { testOnly: true },
      { provider: "LOCAL_TEST_SIMULATOR", workflowState: "CONFIRMED" },
    ),
    false,
    "client-like success without a persisted receipt is never authority",
  );
});
test("content submission is separate from recipient readiness; paid events retain policy requirements",()=>{
 const d={paymentMode:"TEST_SIMULATOR",tiers:[{price:3500}],policies:"Fictional entry and cancellation terms."};
 assert.deepEqual(paidEventErrors(d,{verification:"UNVERIFIED",approvedDestinationIds:[],paidEventsEnabled:false,simulatorEnabled:false}),{});
 assert(paidEventErrors({...d,policies:""}).policies);
});

test(
  "verified disposable simulator domain integration",
  { skip: !simulatorEnvironment() },
  async (t) => {
    const { db } = await import("../lib/db"),
      { assertSimulator, simulatePayment, simulateRefund } =
        await import("../lib/payment-simulator"),
      { saveEventDraft, submitEvent } = await import("../lib/event-management"),
      { activateOrganizer } = await import("../lib/organizer-identity"),
      { reserveBooking, approveRegistration } =
        await import("../lib/booking-domain"),
      { localDateTime } = await import("../lib/event-config"),
      { entranceAction } = await import("../lib/entrance"),
      { requestRefund } = await import("../lib/operations");
    const marker = await assertSimulator(),
      u = marker.personas.Customer,
      friend = marker.personas["Community Friend"];
    await activateOrganizer(u);
    async function event(capacity = 12, approvalRequired = false) {
      const e = await saveEventDraft(u, {
        creationKey: randomUUID(),
        title: "TEST domain " + randomUUID().slice(0, 8),
        shortDescription: "Fictional simulator regression only. No real money.",
        startsLocal: localDateTime(new Date(Date.now() + 10 * 86400000)),
        endsLocal: localDateTime(
          new Date(Date.now() + 10 * 86400000 + 7200000),
        ),
        city: "Fictional City",
        venue: "Fictional studio",
        capacity,
        approvalRequired,
        paymentMode: "TEST_SIMULATOR",
        image: "/images/neon.jpg",
        tiers: [
          {
            name: "General",
            price: 3500,
            quantity: capacity,
            maxPerOrder: Math.min(4, capacity),
          },
        ],
      });
      await submitEvent(u, e.id);
      assert.equal((await db.event.findUniqueOrThrow({where:{id:e.id}})).status,"PENDING_REVIEW");
      await (await import("../lib/booking-domain")).updateEventLifecycle(marker.personas.Administrator,e.id,"PUBLISHED",{notes:"Independent fictional simulator review",reviewerId:marker.personas.Administrator,outcome:"APPROVED"});
      await db.event.update({where:{id:e.id},data:{origin:"REAL",configurationStatus:"FICTIONAL_APPROVED"}});
      await (await import("../lib/staff-permissions")).setEventStaff(marker.personas.Administrator,{eventId:e.id,userId:marker.personas["Entrance Staff"],active:true,canCheckIn:true,canViewGuests:true});
      return db.event.findUniqueOrThrow({
        where: { id: e.id },
        include: { tiers: true },
      });
    }
    async function reserve(e: any, quantity = 1, userId = u) {
      return reserveBooking(userId, {
        eventId: e.id,
        tierId: e.tiers[0].id,
        quantity,
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() + 3600000),
        answers: {},
      });
    }
    const e = await event(),
      b = await reserve(e, 2);
    await t.test(
      "sandbox event has no recipient; amount and ticket quantity come from server",
      async () => {
        assert.equal(e.paymentDestinationId, null);
        assert.equal(b.recipientVersionId, null);
        assert.equal(b.total, 7000);
        assert.equal(b.evidenceRequired, false);
      },
    );
    await t.test(
      "legacy demo purchase cannot bypass the simulator provider",
      async () => {
        const { book } = await import("../lib/services");
        await assert.rejects(
          () =>
            book(u, {
              eventId: e.id,
              tierId: e.tiers[0].id,
              quantity: 1,
              idempotencyKey: randomUUID(),
              answers: {},
            }),
          /503|409/,
        );
      },
    );
    await t.test(
      "declined and cancelled attempts persist no valid tickets and allow retry",
      async () => {
        for (const outcome of ["DECLINED", "CANCELLED"] as const) {
          await simulatePayment(u, {
            bookingId: b.id,
            outcome,
            idempotencyKey: randomUUID(),
          });
          assert.equal(
            await db.ticket.count({ where: { bookingId: b.id } }),
            0,
          );
        }
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: b.id } }))
            .paymentState,
          "AWAITING_PAYMENT",
        );
      },
    );
    await t.test("foreign user cannot pay an owned booking", async () => {
      await assert.rejects(
        () =>
          simulatePayment(friend, {
            bookingId: b.id,
            outcome: "SUCCESS",
            idempotencyKey: randomUUID(),
          }),
        /404/,
      );
    });
    await t.test(
      "concurrent duplicate callbacks create one provider success and unique tickets",
      async () => {
        const input = {
          bookingId: b.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        };
        await Promise.all([
          simulatePayment(u, input),
          simulatePayment(u, input),
        ]);
        await simulatePayment(u, { ...input, idempotencyKey: randomUUID() });
        const tickets = await db.ticket.findMany({
          where: { bookingId: b.id },
        });
        assert.equal(tickets.length, 2);
        assert.equal(new Set(tickets.map((t) => t.token)).size, 2);
        assert.equal(
          await db.simulationAttempt.count({
            where: {
              payment: { bookingId: b.id },
              kind: "PAYMENT",
              outcome: "SUCCESS",
            },
          }),
          1,
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: b.tierId },
            })
          ).sold,
          2,
        );
        await assert.rejects(
          () => simulatePayment(u, { ...input, outcome: "DECLINED" }),
          /409/,
        );
      },
    );
    await t.test(
      "trusted payment does not bypass configured registration review",
      async () => {
        const gated = await event(4, true),
          r = await reserve(gated);
        await simulatePayment(u, {
          bookingId: r.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        });
        assert.equal(await db.ticket.count({ where: { bookingId: r.id } }), 0);
        await approveRegistration(
          marker.personas.Administrator,
          r.id,
          true,
          "Fictional independent registration approval",
        );
        assert.equal(await db.ticket.count({ where: { bookingId: r.id } }), 1);
      },
    );
    await t.test(
      "last-ticket contention allocates exactly one place",
      async () => {
        const last = await event(1);
        const results = await Promise.allSettled([
          reserve(last),
          reserve(last, 1, friend),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: last.id } }))
            .reservedCount,
          1,
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: last.tiers[0].id },
            })
          ).sold,
          1,
        );
      },
    );
    await t.test(
      "actual scanner rejects invalid codes and duplicate check-in",
      async () => {
        const { entranceOverview } = await import("../lib/entrance");
        const countsBefore = await entranceOverview(
          marker.personas["Entrance Staff"],
          e.id,
        );
        assert.equal(countsBefore.counts.expected, 2);
        assert.equal(countsBefore.counts.notArrived, 2);
        const ticket = await db.ticket.findFirstOrThrow({
          where: { bookingId: b.id },
        });
        const staff = marker.personas["Entrance Staff"];
        await assert.rejects(
          () => entranceAction(staff, { eventId: e.id, token: "0".repeat(64) }),
          /404/,
        );
        await entranceAction(
          staff,
          { eventId: e.id, token: ticket.token, identityConfirmed: true },
          true,
        );
        await assert.rejects(
          () =>
            entranceAction(
              staff,
              { eventId: e.id, token: ticket.token, identityConfirmed: true },
              true,
            ),
          /409:Already checked in/,
        );
        assert.equal(
          await db.ticketCheckIn.count({ where: { ticketId: ticket.id } }),
          1,
        );
      },
    );
    await t.test(
      "pending, failed and successful refunds persist real fictional refund state and revoke stock/tickets only on success",
      async () => {
        const r = await reserve(e);
        await simulatePayment(u, {
          bookingId: r.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        });
        await requestRefund(u, {
          bookingId: r.id,
          reason: "Fictional refund regression. No actual bank transfer.",
        });
        for (const outcome of ["PENDING", "FAILED"] as const) {
          await simulateRefund(u, {
            bookingId: r.id,
            outcome,
            idempotencyKey: randomUUID(),
          });
          assert.equal(
            (await db.booking.findUniqueOrThrow({ where: { id: r.id } }))
              .paymentState,
            "CONFIRMED",
          );
        }
        const input = {
          bookingId: r.id,
          outcome: "SUCCESS",
          idempotencyKey: randomUUID(),
        };
        await simulateRefund(u, input);
        await simulateRefund(u, input);
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: r.id } }))
            .paymentState,
          "REFUNDED",
        );
        assert.equal(
          (await db.ticket.findFirstOrThrow({ where: { bookingId: r.id } }))
            .status,
          "REVOKED",
        );
        assert.equal(
          (
            await db.refund.findFirstOrThrow({
              where: { payment: { bookingId: r.id } },
            })
          ).status,
          "REFUND_CONFIRMED",
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: b.tierId },
            })
          ).sold,
          2,
        );
      },
    );
    await t.test("attendance blocks routine simulated refund", async () => {
      await assert.rejects(
        () =>
          requestRefund(u, {
            bookingId: b.id,
            reason: "Fictional attended refund test",
          }),
        /Attendance/,
      );
    });
    await t.test(
      "verified marker refuses non-test data and canonical URL without opening it",
      async () => {
        const previous = process.env.DATABASE_URL;
        try {
          process.env.DATABASE_URL =
            "file:/Users/parsa/Desktop/EVENT FINDER/prisma/dev.db";
          await assert.rejects(() => assertSimulator(), /404/);
        } finally {
          process.env.DATABASE_URL = previous;
        }
        const bad = await db.event.create({
          data: {
            title: "Synthetic forbidden test marker",
            description: "Fictional guard test",
            category: "House Party",
            genre: "House",
            latitude: 0,
            longitude: 0,
            slug: "test-guard-" + randomUUID(),
            organizerId: u,
            testOnly: false,
            startsAt: new Date(Date.now() + 86400000),
            endsAt: new Date(Date.now() + 86400000 + 3600000),
            city: "Test",
            venue: "Test",
            image: "/images/neon.jpg",
            capacity: 1,
          },
        });
        try {
          await assert.rejects(() => assertSimulator(), /404/);
        } finally {
          await db.event.delete({ where: { id: bad.id } });
        }
        await assertSimulator();
      },
    );
    await db.$disconnect();
  },
);
