import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { isolatedTestData } from "../lib/domain-core";
import { managementGet } from "../lib/management-api";
import {
  processNotifications,
  type TransactionalTransport,
} from "../lib/operational-jobs";

if (
  !isolatedTestData() ||
  Object.keys(process.env).some((k) => k.startsWith("DB_"))
)
  throw Error("Phase11 requires isolated fictional data.");

test("Phase 11 bounded delivery and organizer cancellation summaries", async (t) => {
  const prefix = "p11" + randomUUID().replaceAll("-", "").slice(0, 12);
  const makeUser = (role: string, suffix: string) =>
    db.user.create({
      data: {
        id: prefix + suffix,
        username: prefix + suffix,
        name: "Fictional " + suffix,
        email: prefix + suffix + "@example.test",
        passwordHash: "unused",
        role,
        dob: new Date("1990-01-01"),
        city: "Test",
      },
    });
  const admin = await makeUser("ADMIN", "admin"),
    org = await makeUser("ORGANIZER", "org"),
    guest = await makeUser("ATTENDEE", "guest"),
    other = await makeUser("ORGANIZER", "other");
  const notice = () =>
    db.notification.create({
      data: {
        userId: guest.id,
        title: "Fictional payment update",
        body: "No real funds.",
        link: "/my-bookings",
      },
    });
  await t.test(
    "a stalled adapter aborts, persists a safe retry and retries the identical key",
    async () => {
      const n = await notice();
      let signal: AbortSignal | undefined;
      const keys: string[] = [];
      const stalled: TransactionalTransport = {
        send: async (message) => {
          signal = message.signal;
          keys.push(message.idempotencyKey);
          await new Promise<void>((_, reject) =>
            message.signal!.addEventListener(
              "abort",
              () => reject(Error("SECRET TRANSPORT DETAILS")),
              { once: true },
            ),
          );
        },
      };
      const result = await processNotifications(
        admin.id,
        stalled,
        new Date(),
        1,
        n.id,
        20,
      );
      assert.equal(result[0].status, "RETRY");
      assert.equal(signal?.aborted, true);
      const retry = await db.notification.findUniqueOrThrow({
        where: { id: n.id },
      });
      assert.equal(retry.lastError, "LOCAL_TRANSPORT_TIMEOUT");
      assert.equal(retry.attempts, 1);
      assert.equal(retry.workerToken, null);
      assert.equal(retry.leaseUntil, null);
      assert.equal(retry.read, false);
      const success: TransactionalTransport = {
        send: async (message) => {
          keys.push(message.idempotencyKey);
        },
      };
      await processNotifications(
        admin.id,
        success,
        new Date(retry.nextAttemptAt.getTime() + 1),
        1,
        n.id,
      );
      assert.deepEqual(keys, [n.id, n.id]);
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "MOCK_DELIVERED",
      );
    },
  );
  await t.test(
    "an adapter ignoring abort cannot block later jobs or overwrite a retry with late success",
    async () => {
      const n = await notice();
      let finish!: () => void;
      const first = processNotifications(
        admin.id,
        {
          send: () =>
            new Promise<void>((resolve) => {
              finish = resolve;
            }),
        },
        new Date(),
        1,
        n.id,
        20,
      );
      assert.equal((await first)[0].status, "RETRY");
      const second = await notice();
      await processNotifications(
        admin.id,
        { send: async () => {} },
        new Date(),
        1,
        second.id,
      );
      finish();
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "RETRY",
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: second.id } }))
          .jobStatus,
        "MOCK_DELIVERED",
      );
      await assert.rejects(
        processNotifications(admin.id, undefined, new Date(), 1, n.id, 60000),
        /shorter than the worker lease/,
      );
      await assert.rejects(processNotifications(guest.id), /Administrator/);
    },
  );
  await t.test(
    "final timeout becomes a visible, deduplicated failure without transport details",
    async () => {
      const n = await notice();
      await db.notification.update({
        where: { id: n.id },
        data: { attempts: 2 },
      });
      await processNotifications(
        admin.id,
        { send: () => new Promise<void>(() => {}) },
        new Date(),
        1,
        n.id,
        20,
      );
      const failed = await db.notification.findUniqueOrThrow({
        where: { id: n.id },
      });
      assert.equal(failed.jobStatus, "FAILED");
      assert.equal(failed.lastError, "LOCAL_TRANSPORT_TIMEOUT");
      await processNotifications(admin.id, undefined, new Date(), 1, n.id);
      assert.equal(
        await db.notification.count({
          where: {
            userId: admin.id,
            dedupeKey: `delivery-failed:${n.id}:${admin.id}`,
          },
        }),
        1,
      );
    },
  );
  await t.test(
    "5000 bookings do not enlarge setup data; cancellation impact is scoped and excludes demo money",
    async () => {
      const event = await db.event.create({
        data: {
          id: prefix + "event",
          slug: prefix,
          title: "Fictional aggregate test",
          description: "Isolated only",
          category: "House Party",
          genre: "House",
          city: "Test",
          venue: "Hidden",
          latitude: 0,
          longitude: 0,
          image: "/images/halloween.jpg",
          organizerId: org.id,
          capacity: 10000,
          status: "DRAFT",
          testOnly: true,
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 172800000),
          tiers: { create: { name: "General", price: 3500, quantity: 10000 } },
        },
        include: { tiers: true },
      });
      const view = async () =>
        (await managementGet("setup", { id: org.id }))!.json();
      const before = JSON.stringify(await view()).length;
      for (let start = 0; start < 5000; start += 500)
        await db.booking.createMany({
          data: Array.from({ length: 500 }, (_, i) => ({
            id: prefix + "booking" + (start + i),
            idempotencyKey: prefix + "key" + (start + i),
            userId: guest.id,
            eventId: event.id,
            tierId: event.tiers[0].id,
            total: 3500,
            registrationState: "PENDING",
            paymentState: start + i < 2 ? "CONFIRMED" : "AWAITING_PAYMENT",
            testOnly: true,
          })),
        });
      await db.payment.create({
        data: {
          bookingId: prefix + "booking0",
          amount: 3500,
          fee: 0,
          provider: "ORGANIZER_DIRECT",
          confirmedAt: new Date(),
        },
      });
      await db.payment.create({
        data: {
          bookingId: prefix + "booking1",
          amount: 999999,
          fee: 0,
          provider: "DEMO_TOUCH_N_GO",
          confirmedAt: new Date(),
        },
      });
      await db.ticket.createMany({
        data: ["ACTIVE", "REVOKED"].map((status, sequence) => ({
          bookingId: prefix + "booking0",
          token: randomUUID(),
          status,
          sequence,
          testOnly: true,
        })),
      });
      const data = await view(),
        e = data.events.find((e: any) => e.id === event.id);
      assert.deepEqual(e.cancellationImpact, {
        bookings: 5000,
        pendingRegistrations: 5000,
        activeTickets: 1,
        confirmedPaymentAmount: 3500,
      });
      assert.equal("bookings" in e, false);
      assert(JSON.stringify(data).length < before + 200);
      assert.equal(
        (
          await (await managementGet("setup", { id: other.id }))!.json()
        ).events.some((e: any) => e.id === event.id),
        false,
      );
      await assert.rejects(
        managementGet("setup", { id: guest.id }),
        /organizer/,
      );
    },
  );
});
