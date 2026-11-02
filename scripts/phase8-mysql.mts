import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import {
  requestEventChange,
  reviewEventChange,
  customerEventChanges,
} from "../lib/event-operations";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  updateEventLifecycle,
  expireReservation,
} from "../lib/booking-domain";
import {
  processNotifications,
  runOperationalJobs,
  retryNotification,
} from "../lib/operational-jobs";
import { localDateTime } from "../lib/event-config";
import { requestRefund, reviewRefund } from "../lib/operations";
import { checkIn } from "../lib/services";
import { persistSession } from "../lib/session-security";
import { revokeTicket } from "../lib/booking-domain";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.MYSQL_DISPOSABLE_TEST !== "true" ||
  process.env.DB_PASSWORD !== undefined ||
  !/^mysql:\/\/p4test:[^@]+@127\.0\.0\.1:13306\/mixermates_p4_main$/.test(
    process.env.DATABASE_URL || "",
  )
)
  throw Error("Disposable MySQL only");
const results: any[] = [];
const run = async (name: string, f: () => Promise<void>) => {
  await f();
  results.push({ name, result: "PASS" });
};
const p = "p8mysql" + randomUUID().slice(0, 7);
let n = 0;
const user = async (role: string) => {
  const id = p + n++;
  return db.user.create({
    data: {
      id,
      role,
      username: id,
      name: id,
      email: id + "@example.test",
      passwordHash: "unused",
      dob: new Date("1990-01-01"),
      city: "Test",
    },
  });
};
const org = await user("ORGANIZER"),
  admin = await user("ADMIN"),
  guest = await user("ATTENDEE");
const event = () =>
  db.event.create({
    data: {
      slug: p + "event" + n++,
      title: "Fictional MySQL Phase8",
      description: "No real event",
      category: "House Party",
      genre: "House",
      image: "/images/halloween.jpg",
      city: "Test",
      venue: "Private",
      privateVenue: "SECRET MYSQL VENUE",
      latitude: 0,
      longitude: 0,
      startsAt: new Date(Date.now() + 2 * 86400000),
      endsAt: new Date(Date.now() + 3 * 86400000),
      age: 18,
      organizerId: org.id,
      capacity: 20,
      origin: "REAL",
      testOnly: true,
      status: "PUBLISHED",
      configurationStatus: "TEST_ONLY",
      approvalRequired: true,
      tiers: { create: { name: "General", price: 0, quantity: 20 } },
    },
    include: { tiers: true },
  });
const reserve = (e: any) =>
  reserveBooking(guest.id, {
    eventId: e.id,
    tierId: e.tiers[0].id,
    quantity: 1,
    idempotencyKey: randomUUID(),
    expiresAt: new Date(Date.now() + 3600000),
  });
const detail = (e: any) => ({
  eventId: e.id,
  version: e.termsVersion,
  reason: "Fictional MySQL reschedule request",
  values: {
    startsLocal: localDateTime(new Date(e.startsAt.getTime() + 86400000)),
    endsLocal: localDateTime(new Date(e.endsAt.getTime() + 86400000)),
    venue: e.venue,
    privateVenue: "NEW SECRET MYSQL VENUE",
    city: e.city,
    latitude: 0,
    longitude: 0,
    entryInstructions: "Fictional revised entry instructions",
  },
});
const e = await event(),
  b = await reserve(e);
await approveRegistration(org.id, b.id, true);
const tickets = await issueTickets(org.id, b.id);
let r: any;
await run(
  "Concurrent change requests produce one pending request",
  async () => {
    const rs = await Promise.allSettled(
      [1, 2].map(() => requestEventChange(org.id, detail(e))),
    );
    assert.equal(rs.filter((x) => x.status === "fulfilled").length, 1);
    r = (
      rs.find((x) => x.status === "fulfilled") as PromiseFulfilledResult<any>
    ).value;
  },
);
await run(
  "Concurrent approval applies one change and one customer notice",
  async () => {
    const rs = await Promise.allSettled(
      [1, 2].map(() =>
        reviewEventChange(admin.id, {
          id: r.id,
          approve: true,
          notes: "Independent fictional approval",
        }),
      ),
    );
    assert.equal(rs.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(
      await db.notification.count({
        where: { dedupeKey: `event-change:${r.id}:${b.id}` },
      }),
      1,
    );
  },
);
await run(
  "Booking snapshot and ticket identity retained with private redaction",
  async () => {
    const q = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    assert.equal(
      JSON.parse(q.eventTermsSnapshot).privateVenue,
      "SECRET MYSQL VENUE",
    );
    assert.equal((await issueTickets(org.id, b.id))[0].token, tickets[0].token);
    assert(
      !JSON.stringify(await customerEventChanges(q, false)).includes("SECRET"),
    );
  },
);
await run("Cancellation versus reschedule cannot revive event", async () => {
  const x = await event(),
    q = await requestEventChange(org.id, detail(x));
  await Promise.allSettled([
    updateEventLifecycle(org.id, x.id, "CANCELLED"),
    reviewEventChange(admin.id, {
      id: q.id,
      approve: true,
      notes: "Concurrent independent review",
    }),
  ]);
  assert.equal(
    (await db.event.findUniqueOrThrow({ where: { id: x.id } })).status,
    "CANCELLED",
  );
});
await run(
  "Parallel worker claims deliver one job with durable success",
  async () => {
    const note = await db.notification.create({
      data: {
        userId: guest.id,
        title: "Event details updated",
        body: "Fictional notification",
      },
    });
    let sends = 0;
    await Promise.all(
      [1, 2].map(() =>
        processNotifications(
          admin.id,
          {
            send: async () => {
              sends++;
            },
          },
          new Date(Date.now() + 1000),
          1,
          note.id,
        ),
      ),
    );
    assert.equal(sends, 1);
    assert.equal(
      (await db.notification.findUniqueOrThrow({ where: { id: note.id } }))
        .jobStatus,
      "MOCK_DELIVERED",
    );
  },
);
await run("Notification retries back off and terminate visibly", async () => {
  const note = await db.notification.create({
    data: { userId: guest.id, title: "Refund update", body: "Fictional" },
  });
  for (let i = 0; i < 3; i++) {
    const q = await db.notification.findUniqueOrThrow({
      where: { id: note.id },
    });
    await processNotifications(
      admin.id,
      {
        send: async () => {
          throw Error("private detail excluded");
        },
      },
      new Date(q.nextAttemptAt.getTime() + 1000),
      1,
      note.id,
    );
  }
  assert.equal(
    (await db.notification.findUniqueOrThrow({ where: { id: note.id } }))
      .jobStatus,
    "FAILED",
  );
});
await run(
  "Concurrent expiry releases stock once and protects review hold",
  async () => {
    const x = await event(),
      q = await reserve(x),
      held = await reserve(x);
    for (const b of [q, held])
      await db.booking.update({
        where: { id: b.id },
        data: { reservationExpiresAt: new Date(Date.now() - 1000) },
      });
    await db.booking.update({
      where: { id: held.id },
      data: { reviewHold: true },
    });
    await Promise.allSettled([
      expireReservation(org.id, q.id),
      expireReservation(org.id, q.id),
    ]);
    await assert.rejects(() => expireReservation(org.id, held.id), /409/);
    assert.equal(
      (
        await db.eventTicketTier.findUniqueOrThrow({
          where: { id: x.tiers[0].id },
        })
      ).sold,
      1,
    );
  },
);
await run(
  "Refund approval and event cancellation preserve pending money",
  async () => {
    const x = await event(),
      q = await reserve(x);
    await db.booking.update({
      where: { id: q.id },
      data: { paymentState: "CONFIRMED", paymentRequired: true },
    });
    await db.payment.update({
      where: { bookingId: q.id },
      data: {
        provider: "ORGANIZER_DIRECT",
        origin: "REAL",
        workflowState: "CONFIRMED",
        confirmedAt: new Date(),
        amount: 3500,
      },
    });
    const r = await requestRefund(guest.id, {
      bookingId: q.id,
      reason: "Fictional cancellation refund",
    });
    await Promise.allSettled([
      reviewRefund(org.id, {
        id: r.id,
        version: 0,
        status: "APPROVED",
        notes: "Independent fictional policy review",
      }),
      updateEventLifecycle(org.id, x.id, "CANCELLED"),
    ]);
    assert.equal(
      (await db.booking.findUniqueOrThrow({ where: { id: q.id } })).lifecycle,
      "CANCELLED",
    );
    assert.equal(
      (await db.payment.findUniqueOrThrow({ where: { bookingId: q.id } }))
        .workflowState,
      "REFUND_PENDING",
    );
  },
);
await run(
  "Issuance versus cancellation leaves no admissible ticket",
  async () => {
    const x = await event(),
      q = await reserve(x);
    await db.booking.update({
      where: { id: q.id },
      data: { registrationState: "APPROVED" },
    });
    await Promise.allSettled([
      issueTickets(org.id, q.id),
      updateEventLifecycle(org.id, x.id, "CANCELLED"),
    ]);
    assert.equal(
      (await db.event.findUniqueOrThrow({ where: { id: x.id } })).status,
      "CANCELLED",
    );
    for (const t of await db.ticket.findMany({ where: { bookingId: q.id } }))
      await assert.rejects(() => checkIn(org.id, x.id, t.token), /409/);
  },
);
await run(
  "Suspension versus check-in commits at most one prior valid arrival",
  async () => {
    await Promise.allSettled([
      checkIn(org.id, e.id, tickets[0].token),
      updateEventLifecycle(admin.id, e.id, "SUSPENDED"),
    ]);
    await assert.rejects(() => checkIn(org.id, e.id, tickets[0].token), /409/);
    assert(
      (await db.ticketCheckIn.count({ where: { ticketId: tickets[0].id } })) <=
        1,
    );
  },
);

await run(
  "Credential change between password verification and session persistence is rejected",
  async () => {
    const verified = await db.user.findUniqueOrThrow({
      where: { id: guest.id },
    });
    await db.user.update({
      where: { id: guest.id },
      data: { securityVersion: { increment: 1 } },
    });
    await assert.rejects(() => persistSession(guest.id, verified), /401/);
  },
);
await run(
  "Concurrent final lease recovery creates one audited failure and alert",
  async () => {
    const n = await db.notification.create({
      data: {
        userId: guest.id,
        title: "Fictional final lease",
        body: "No email",
        jobStatus: "PROCESSING",
        attempts: 3,
        workerToken: "dead",
        leaseUntil: new Date(Date.now() - 1000),
      },
    });
    await Promise.all(
      [1, 2].map(() =>
        processNotifications(admin.id, undefined, new Date(), 1, n.id),
      ),
    );
    assert.equal(
      await db.adminAuditLog.count({
        where: { targetId: n.id, reasonCode: "FINAL_LEASE_EXPIRED" },
      }),
      1,
    );
    assert.equal(
      await db.notification.count({
        where: { dedupeKey: `delivery-failed:${n.id}:${admin.id}` },
      }),
      1,
    );
  },
);
await run("Targeted worker cannot fail an unrelated final lease", async () => {
  const n = await db.notification.create({
    data: {
      userId: guest.id,
      title: "Fictional unrelated job",
      body: "No email",
      jobStatus: "PROCESSING",
      attempts: 3,
      workerToken: "dead",
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  await processNotifications(
    admin.id,
    undefined,
    new Date(),
    1,
    "missing-" + p,
  );
  assert.equal(
    (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
      .jobStatus,
    "PROCESSING",
  );
  await processNotifications(admin.id, undefined, new Date(), 1, n.id);
});
await run(
  "Reminder batches drain beyond 100 without duplicate notices",
  async () => {
    const x = await event();
    await db.event.update({
      where: { id: x.id },
      data: { startsAt: new Date(Date.now() + 3600000) },
    });
    await db.booking.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        id: p + "reminder" + i,
        userId: guest.id,
        eventId: x.id,
        tierId: x.tiers[0].id,
        total: 0,
        idempotencyKey: p + "reminder" + i,
        origin: "REAL",
        testOnly: true,
        lifecycle: "CONFIRMED",
        registrationState: "APPROVED",
        paymentRequired: false,
      })),
    });
    for (let i = 0; i < 3; i++) await runOperationalJobs(admin.id);
    assert.equal(
      await db.notification.count({
        where: { dedupeKey: { startsWith: "reminder:" + p + "reminder" } },
      }),
      105,
    );
    await runOperationalJobs(admin.id);
    assert.equal(
      await db.notification.count({
        where: { dedupeKey: { startsWith: "reminder:" + p + "reminder" } },
      }),
      105,
    );
  },
);
await run("Revoked optional consent prevents delivery", async () => {
  await db.user.update({
    where: { id: guest.id },
    data: { promotionalNotifications: false },
  });
  const n = await db.notification.create({
    data: {
      userId: guest.id,
      title: "Optional fictional",
      body: "No email",
      category: "PROMOTIONAL",
    },
  });
  await processNotifications(
    admin.id,
    {
      send: async () => {
        throw Error("Must not send");
      },
    },
    new Date(Date.now() + 1000),
    1,
    n.id,
  );
  assert.equal(
    (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
      .jobStatus,
    "SKIPPED",
  );
});
await run(
  "Final-seat contention cannot oversell or create negative stock",
  async () => {
    const x = await event();
    await db.event.update({ where: { id: x.id }, data: { capacity: 1 } });
    await db.eventTicketTier.update({
      where: { id: x.tiers[0].id },
      data: { quantity: 1 },
    });
    const results = await Promise.allSettled([reserve(x), reserve(x)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (await db.event.findUniqueOrThrow({ where: { id: x.id } })).reservedCount,
      1,
    );
    assert.equal(
      (
        await db.eventTicketTier.findUniqueOrThrow({
          where: { id: x.tiers[0].id },
        })
      ).sold,
      1,
    );
  },
);
await run(
  "Duplicate reservation key creates one booking and stock claim",
  async () => {
    const x = await event(),
      key = randomUUID(),
      input = {
        eventId: x.id,
        tierId: x.tiers[0].id,
        quantity: 1,
        idempotencyKey: key,
        expiresAt: new Date(Date.now() + 3600000),
      };
    const results = await Promise.all([
      reserveBooking(guest.id, input),
      reserveBooking(guest.id, input),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(
      (await db.event.findUniqueOrThrow({ where: { id: x.id } })).reservedCount,
      1,
    );
  },
);
await run(
  "Concurrent QR and manual admission persist one attendance record",
  async () => {
    const x = await event(),
      q = await reserve(x);
    await approveRegistration(org.id, q.id, true);
    const [t] = await issueTickets(org.id, q.id);
    const rs = await Promise.allSettled([
      checkIn(org.id, x.id, t.token, "QR", { identityConfirmed: true }),
      checkIn(org.id, x.id, t.token, "MANUAL", { identityConfirmed: true }),
    ]);
    assert.equal(rs.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      await db.ticketCheckIn.count({ where: { ticketId: t.id } }),
      1,
    );
    assert.equal(
      await db.attendanceRecord.count({
        where: { ticketId: t.id, public: false },
      }),
      1,
    );
  },
);
await run(
  "Revocation racing admission blocks later entry and preserves at most one arrival",
  async () => {
    const x = await event(),
      q = await reserve(x);
    await approveRegistration(org.id, q.id, true);
    const [t] = await issueTickets(org.id, q.id);
    await Promise.allSettled([
      revokeTicket(org.id, t.id),
      checkIn(org.id, x.id, t.token, "QR", { identityConfirmed: true }),
    ]);
    await assert.rejects(() =>
      checkIn(org.id, x.id, t.token, "QR", { identityConfirmed: true }),
    );
    assert((await db.ticketCheckIn.count({ where: { ticketId: t.id } })) <= 1);
  },
);
await run(
  "Manual notification retries stop at the configured bound",
  async () => {
    const n = await db.notification.create({
      data: {
        userId: guest.id,
        title: "Bounded failure",
        body: "No email",
        jobStatus: "FAILED",
        attempts: 3,
        retryCycles: 10,
      },
    });
    await assert.rejects(() => retryNotification(admin.id, n.id), /409/);
  },
);
await run("Reminder processing survives lifecycle changes and continues other eligible work", async()=>{
  const changing=await event(),stable=await event();for(const x of [changing,stable])await db.event.update({where:{id:x.id},data:{startsAt:new Date(Date.now()+3600000)}});
  for(const x of [changing,stable]){const q=await reserve(x);await approveRegistration(org.id,q.id,true);}
  const results=await Promise.allSettled([runOperationalJobs(admin.id),updateEventLifecycle(admin.id,changing.id,"SUSPENDED")]);assert.equal(results.filter(r=>r.status==="fulfilled").length,2);
  await runOperationalJobs(admin.id);const q=await db.booking.findFirstOrThrow({where:{eventId:stable.id}});assert.equal(await db.notification.count({where:{dedupeKey:`reminder:${q.id}:0`}}),1);
});
const version = await db.$queryRaw<
  Array<{ version: string }>
>`SELECT VERSION() AS version`;
await writeFile(
  "/Users/parsa/Desktop/EVENT FINDER/docs/phase8/" +
    (version[0].version.includes("MariaDB") ? "mariadb" : "mysql") +
    "-results.json",
  JSON.stringify(
    { version: version[0].version, isolated: true, results },
    null,
    2,
  ),
);
console.log(results.length + " MySQL checks passed");
await db.$disconnect();
