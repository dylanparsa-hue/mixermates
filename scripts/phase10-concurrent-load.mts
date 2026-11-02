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
const p = "p10concurrent-" + Date.now();
for (const count of [5000]) {
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

  const { execFileSync } = await import("node:child_process");
  const { randomUUID } = await import("node:crypto");
  const mint = async (userId: string) => {
    const token = randomBytes(32).toString("hex"),
      u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await db.session.create({
      data: {
        id: createHash("sha256").update(token).digest("hex"),
        userId,
        securityVersion: u.securityVersion,
        expires: new Date(Date.now() + 3600000),
      },
    });
    return "vibey-session=" + token;
  };
  const cookies = {
    org: await mint("organizer"),
    admin: await mint("admin"),
    guest: await mint(users[0].id),
  };
  const routes = [
    ["Discovery", "events", "guest"],
    ["Event detail", "events/" + id, "guest"],
    ["Ticket selection", "customer/event/" + id, "guest"],
    ["Guest search", "customer/guests/" + id + "?search=guest%2049", "org"],
    ["Entrance validation data", "entrance/" + id, "org"],
    ["Admin overview", "operations", "admin"],
    ["My Tickets", "customer/bookings", "guest"],
    ["Reconciliation", "customer/reconciliation/" + id, "org"],
  ] as const;
  const samples: any[] = [];
  let requestIndex = 0;
  const request = async (kind: string, concurrency: number) => {
    const [name, route, role] = routes[requestIndex++ % routes.length],
      start = performance.now();
    try {
      const r = await fetch(base + "/api/" + route, {
        headers: { Cookie: cookies[role] },
        signal: AbortSignal.timeout(30000),
      });
      const body = await r.arrayBuffer();
      samples.push({
        kind,
        concurrency,
        name,
        status: r.status,
        ms: performance.now() - start,
        bytes: body.byteLength,
      });
    } catch (e: any) {
      samples.push({
        kind,
        concurrency,
        name,
        status: 0,
        ms: performance.now() - start,
        error: e.name,
      });
    }
  };
  for (const concurrency of [10, 25, 50, 100])
    for (let round = 0; round < 3; round++)
      await Promise.all(
        Array.from({ length: concurrency }, () =>
          request("batch", concurrency),
        ),
      );
  const sustainedStart = performance.now(),
    until = sustainedStart + 20000;
  await Promise.all(
    Array.from({ length: 10 }, async () => {
      while (performance.now() < until) {
        await request("sustained", 10);
        await new Promise((r) => setTimeout(r, 200));
      }
    }),
  );
  const durationMs = performance.now() - sustainedStart;
  const conflictEvent = await db.event.create({
    data: {
      slug: id + "-contention",
      title: "Fictional final seat contention",
      description: "Local only",
      category: "House Party",
      genre: "House",
      image: "/images/halloween.jpg",
      city: "Test",
      venue: "Hidden",
      latitude: 0,
      longitude: 0,
      organizerId: org,
      capacity: 10,
      status: "PUBLISHED",
      origin: "REAL",
      testOnly: true,
      configurationStatus: "FICTIONAL_APPROVED",
      reviewOutcome: "APPROVED",
      approvalRequired: true,
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 172800000),
      tiers: { create: { name: "General", price: 0, quantity: 10 } },
    },
    include: { tiers: true },
  });
  // Prepare authenticated fixtures before timing requests; raw fixture writes must not compete with domain transactions.
  const buyerCookies: string[] = [];
  for (let i = 0; i < 25; i++) buyerCookies.push(await mint(users[i].id));
  const writes = await Promise.all(
    Array.from({ length: 25 }, async (_, i) => {
      const cookie = buyerCookies[i],
        start = performance.now();
      const r = await fetch(base + "/api/customer/reserve", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: conflictEvent.id,
          tierId: conflictEvent.tiers[0].id,
          quantity: 1,
          answers: {},
          idempotencyKey: randomUUID(),
        }),
      });
      await r.arrayBuffer();
      return { status: r.status, ms: performance.now() - start };
    }),
  );
  const state = await db.event.findUniqueOrThrow({
      where: { id: conflictEvent.id },
      include: { tiers: true },
    }),
    bookings = await db.booking.count({ where: { eventId: state.id } }),
    tickets = await db.ticket.count({
      where: { booking: { eventId: state.id } },
    });
  const writeInvariant = {
    bookings,
    held: state.reservedCount,
    sold: state.tiers[0].sold,
    tickets,
    statusCounts: Object.fromEntries(
      [...new Set(writes.map((x) => x.status))].map((status) => [
        status,
        writes.filter((x) => x.status === status).length,
      ]),
    ),
  };
  const quantile = (xs: number[], q: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)];
  };
  const groups = Array.from(
    new Set(samples.map((x) => x.kind + ":" + x.concurrency)),
  ).map((key) => {
    const rows = samples.filter((x) => x.kind + ":" + x.concurrency === key);
    return {
      key,
      requests: rows.length,
      success: rows.filter((x) => x.status === 200).length,
      failures: rows.filter((x) => x.status !== 200).length,
      medianMs: quantile(
        rows.map((x) => x.ms),
        0.5,
      ),
      p95Ms: quantile(
        rows.map((x) => x.ms),
        0.95,
      ),
    };
  });
  const serverPid = process.env.PHASE10_SERVER_PID || "";
  const serverRssKiB = /^[0-9]+$/.test(serverPid)
    ? Number(
        execFileSync("ps", ["-o", "rss=", "-p", serverPid], {
          encoding: "utf8",
        }).trim(),
      )
    : null;
  await writeFile(
    "/Users/parsa/Desktop/EVENT FINDER/docs/phase10/concurrent-load.json",
    JSON.stringify(
      {
        provider: "SQLite",
        node: process.version,
        optimizedBuild: false,
        fixtureAttendees: count,
        groups,
        sustainedDurationMs: durationMs,
        totalRequests: samples.length,
        clientRss: process.memoryUsage().rss,
        serverRssKiB,
        writeContention: {
          requests: 25,
          accepted: 10,
          expectedConflicts: 15,
          bookings,
          held: state.reservedCount,
          tickets,
          measurements: writes,
        },
        samples,
      },
      null,
      2,
    ),
  );
  await writeFile(
    ".local/phase10-load-fixture.json",
    JSON.stringify({ eventId: id, contentionEventId: state.id }),
    { mode: 0o600 },
  );
  assert.equal(bookings, 10);
  assert.equal(state.reservedCount, 10);
  assert.equal(state.tiers[0].sold, 10);
  assert.equal(tickets, 0);
  assert.equal(writes.filter((x) => x.status === 200).length, 10);
  assert(writes.every((x) => [200, 409].includes(x.status)));
  assert(samples.every((x) => x.status === 200));
  console.log(
    JSON.stringify({
      groups,
      writeContention: "10 holds; 15 conflicts; 0 tickets",
      serverRssKiB,
    }),
  );
}
await db.$disconnect();
