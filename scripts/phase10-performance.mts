import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.includes("mixermates-phase10-20261027/") ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Phase10 fictional workspace required");
let queries = 0;
const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
prisma.$on("query", () => queries++);
(globalThis as any).prisma = prisma;
const { guestList } = await import("../lib/guest-list");
const { entranceOverview } = await import("../lib/entrance");
const { checkIn } = await import("../lib/services");
const { processNotifications } = await import("../lib/operational-jobs");
const { reserveBooking, cancelBooking } = await import("../lib/booking-domain");
const db = prisma,
  results: any[] = [],
  httpResults: any[] = [],
  base = process.env.TEST_BASE_URL || "http://localhost:3052";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Loopback only");
const p = "p8perf-" + Date.now();
for (const count of [50, 500, 2000, 5000]) {
  const id = p + "-" + count,
    org = "organizer",
    users = Array.from({ length: count }, (_, i) => ({
      id: id + "u" + i,
      email: id + "u" + i + "@example.test",
      username: id + "u" + i,
      name: "Fictional guest " + i,
      passwordHash: "unused",
      dob: new Date("1990-01-01"),
      city: "Test",
    }));
  await db.user.createMany({ data: users });
  await db.event.create({
    data: {
      id,
      slug: id,
      title: "Fictional Phase10 load " + count,
      description: "No real event",
      category: "House Party",
      genre: "House",
      image: "/images/halloween.jpg",
      city: "Test",
      venue: "Hidden",
      privateVenue: "FICTIONAL PRIVATE VENUE",
      latitude: 0,
      longitude: 0,
      startsAt: new Date(Date.now() + 3600000),
      endsAt: new Date(Date.now() + 86400000),
      capacity: count,
      age: 18,
      organizerId: org,
      status: "PUBLISHED",
      origin: "REAL",
      testOnly: true,
      configurationStatus: "FICTIONAL_APPROVED",
      reviewOutcome: "APPROVED",
      approvalRequired: false,
      tiers: {
        create: { id: id + "tier", name: "General", price: 0, quantity: count },
      },
      fields: { create: { id: id + "name", label: "Full name as on IC" } },
    },
  });
  for (let offset = 0; offset < count; offset += 100) {
    const rows = users.slice(offset, offset + 100);
    await db.booking.createMany({
      data: rows.map((u) => ({
        id: u.id + "b",
        userId: u.id,
        eventId: id,
        tierId: id + "tier",
        quantity: 1,
        total: 0,
        origin: "REAL",
        testOnly: true,
        lifecycle: "CONFIRMED",
        status: "APPROVED",
        registrationState: "NOT_REQUIRED",
        paymentRequired: false,
        paymentState: "NOT_REQUIRED",
        byobRequired: false,
        idempotencyKey: u.id,
        guestName: u.name,
        answers: JSON.stringify({ [id + "name"]: u.name }),
      })),
    });
    await db.ticket.createMany({
      data: rows.map((u) => ({
        id: u.id + "t",
        bookingId: u.id + "b",
        token: randomBytes(32).toString("hex"),
        origin: "REAL",
        testOnly: true,
        sequence: 1,
      })),
    });
  }
  const samples = [];
  for (let i = 0; i < 3; i++) {
    queries = 0;
    const start = performance.now(),
      data = await entranceOverview(org, id);
    assert.equal(data.counts.issued, count);
    samples.push({
      ms: performance.now() - start,
      queries,
      responseBytes: Buffer.byteLength(JSON.stringify(data)),
      rss: process.memoryUsage().rss,
    });
  }
  const guestSamples = [];
  for (const query of [
    {},
    { page: 2 },
    { search: "Fictional guest 49" },
    { sort: "NAME" },
    { lifecycle: "CONFIRMED" },
  ]) {
    queries = 0;
    const start = performance.now(),
      data = await guestList(org, id, query);
    assert(data.guests.length <= 50);
    assert.equal(
      data.total,
      query.search
        ? users.filter((u) => u.name.includes(query.search!)).length
        : count,
    );
    guestSamples.push({
      query,
      ms: performance.now() - start,
      queries,
      rows: data.guests.length,
      total: data.total,
      bytes: Buffer.byteLength(JSON.stringify(data)),
      rss: process.memoryUsage().rss,
    });
  }
  results.push({ attendees: count, samples, guestSamples });
  const mint = async (userId: string) => {
    const token = randomBytes(32).toString("hex"),
      u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.session.create({
      data: {
        id: createHash("sha256").update(token).digest("hex"),
        userId,
        securityVersion: u.securityVersion,
        expires: new Date(Date.now() + 600000),
      },
    });
    return "vibey-session=" + token;
  };
  const cookies = {
    org: await mint("organizer"),
    admin: await mint("admin"),
    guest: await mint(users[0].id),
  };
  for (const [name, route, role] of [
    ["Event detail", "events/" + id, "guest"],
    ["Ticket selection", "customer/event/" + id, "guest"],
    ["Organizer dashboard", "operations", "org"],
    ["Entrance tickets", "entrance/" + id, "org"],
    ["Paged guests", "customer/guests/" + id + "?page=2", "org"],
    [
      "Guest name search",
      "customer/guests/" + id + "?search=guest%2049",
      "org",
    ],
    ["Admin overview", "operations", "admin"],
    ["Filtered audit", "operations?q=FICTIONAL&page=0", "admin"],
    ["My Tickets", "customer/bookings", "guest"],
  ] as const) {
    const measurements = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      const start = performance.now(),
        response = await fetch(base + "/api/" + route, {
          headers: { Cookie: cookies[role] },
        }),
        body = await response.arrayBuffer();
      assert.equal(response.status, 200, name);
      measurements.push({
        ms: performance.now() - start,
        bytes: body.byteLength,
        status: response.status,
      });
    }
    httpResults.push({ attendees: count, name, measurements });
  }
  const [ticket] = await db.ticket.findMany({
    where: { bookingId: users[0].id + "b" },
  });
  let started = performance.now();
  await checkIn("organizer", id, ticket.token, "QR", {
    identityConfirmed: true,
  });
  httpResults.push({
    attendees: count,
    name: "Atomic admission service",
    ms: performance.now() - started,
  });
  // Free one fictional capacity slot and measure the actual existing reservation transaction.
  await db.event.update({ where: { id }, data: { capacity: count + 1 } });
  await db.eventTicketTier.update({
    where: { id: id + "tier" },
    data: { quantity: count + 1 },
  });
  started = performance.now();
  const booking = await reserveBooking(users[0].id, {
    eventId: id,
    tierId: id + "tier",
    quantity: 1,
    idempotencyKey: id + "load-booking",
    expiresAt: new Date(Date.now() + 3600000),
  });
  httpResults.push({
    attendees: count,
    name: "Booking transaction",
    ms: performance.now() - started,
  });
  await cancelBooking(users[0].id, booking.id);
  await db.notification.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({
      userId: users[0].id,
      title: "Fictional performance notice " + i,
      body: "No real message",
    })),
  });
  let sent = 0;
  started = performance.now();
  await processNotifications(
    "admin",
    {
      send: async () => {
        sent++;
      },
    },
    new Date(Date.now() + 1000),
    50,
  );
  httpResults.push({
    attendees: count,
    name: "Notification batch",
    ms: performance.now() - started,
    transportCalls: sent,
  });
  await db.session.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  await db.notification.deleteMany({
    where: {
      OR: [
        { userId: { in: users.map((u) => u.id) } },
        { dedupeKey: { contains: booking.id } },
      ],
    },
  });
  await db.adminAuditLog.deleteMany({ where: { eventId: id } });
  await db.attendanceRecord.deleteMany({ where: { eventId: id } });
  await db.ticketCheckIn.deleteMany({
    where: { ticket: { booking: { eventId: id } } },
  });
  await db.payment.deleteMany({ where: { booking: { eventId: id } } });
  await db.userBadge.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });

  await db.ticket.deleteMany({ where: { booking: { eventId: id } } });
  await db.booking.deleteMany({ where: { eventId: id } });
  await db.eventRegistrationField.deleteMany({ where: { eventId: id } });
  await db.eventTicketTier.deleteMany({ where: { eventId: id } });
  await db.event.delete({ where: { id } });
  await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
}
const out = process.env.PHASE10_EVIDENCE_DIR!;
assert(out?.includes("phase10"));
await mkdir(out, { recursive: true });
await writeFile(
  out + "/performance-" + (process.env.PHASE10_MEASURE || "after") + ".json",
  JSON.stringify(
    {
      node: process.version,
      os: os.platform() + " " + os.release(),
      cpu: os.cpus()[0].model,
      sqlite: true,
      optimizedBuild: false,
      results,
      httpResults,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results));
await db.$disconnect();
