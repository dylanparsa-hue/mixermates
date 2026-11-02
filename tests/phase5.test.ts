import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
import { entranceOverview, entranceAction } from "../lib/entrance";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  revokeTicket,
  updateEventLifecycle,
} from "../lib/booking-domain";
import { setEventStaff } from "../lib/staff-permissions";
import { checkIn } from "../lib/services";
import { secretHash } from "../lib/security";
const base = process.env.TEST_BASE_URL || "";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  process.env.DB_PASSWORD !== undefined ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname)
)
  throw Error("Isolated localhost SQLite required.");
test("Phase 5 entrance, ticket privacy and contention", async (t) => {
  const prefix = "p5_" + randomUUID().slice(0, 8);
  const ids: string[] = [],
    events: string[] = [];
  const user = async (role = "ATTENDEE") => {
    const id = prefix + ids.length;
    ids.push(id);
    return db.user.create({
      data: {
        id,
        name: id,
        username: id,
        email: id + "@example.test",
        passwordHash: await hash("FictionalPhase5!", 4),
        dob: new Date("1990-01-01"),
        city: "Test",
        role,
      },
    });
  };
  const admin = await user("ADMIN"),
    org = await user("ORGANIZER"),
    staff = await user("STAFF"),
    guest = await user(),
    outsider = await user(),
    guestOnly = await user("STAFF");
  const event = async () => {
    const id = prefix + "event" + events.length;
    events.push(id);
    return db.event.create({
      data: {
        id,
        slug: id,
        title: "Phase 5 fictional rehearsal",
        description: "Fictional only",
        category: "House Party",
        genre: "House",
        image: "/images/halloween.jpg",
        city: "Test",
        venue: "Hidden",
        privateVenue: "SECRET TEST ADDRESS",
        latitude: 0,
        longitude: 0,
        startsAt: new Date(Date.now() + 3600000),
        endsAt: new Date(Date.now() + 86400000),
        age: 18,
        organizerId: org.id,
        capacity: 100,
        origin: "REAL",
        testOnly: true,
        status: "PUBLISHED",
        configurationStatus: "TEST_ONLY",
        approvalRequired: true,
        tiers: {
          create: { name: "VIP", price: 0, quantity: 100, maxPerOrder: 2 },
        },
      },
      include: { tiers: true },
    });
  };
  const e = await event(),
    wrong = await event();
  const assign = (
    active = true,
    canViewGuests = true,
    canCheckIn = true,
    userId = staff.id,
  ) =>
    setEventStaff(org.id, {
      eventId: e.id,
      userId,
      active,
      canViewGuests,
      canCheckIn,
    });
  const ticket = async (quantity = 1) => {
    const b = await reserveBooking(guest.id, {
      eventId: e.id,
      tierId: e.tiers[0].id,
      quantity,
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    });
    await approveRegistration(org.id, b.id, true);
    await issueTickets(org.id, b.id);
    return db.ticket.findMany({ where: { bookingId: b.id } });
  };
  const cookie = async (userId: string) => {
    const token = randomUUID() + randomUUID();
    await db.session.create({
      data: {
        id: secretHash(token),
        userId,
        securityVersion: (
          await db.user.findUniqueOrThrow({ where: { id: userId } })
        ).securityVersion,
        expires: new Date(Date.now() + 3600000),
      },
    });
    return "vibey-session=" + token;
  };
  const call = async (path: string, userId?: string, body?: any) =>
    fetch(base + "/api/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(userId ? { Cookie: await cookie(userId) } : {}),
        Origin: base,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    await assign();
    await t.test(
      "ordinary and foreign event users cannot inspect entrance",
      async () => {
        await assert.rejects(entranceOverview(outsider.id, e.id), /403/);
        await assert.rejects(entranceOverview(staff.id, wrong.id), /403/);
        assert.equal((await call("entrance/" + e.id)).status, 401);
      },
    );
    await t.test(
      "pending registration contributes no expected admissions or attendance",
      async () => {
        const b = await reserveBooking(guest.id, {
          eventId: e.id,
          tierId: e.tiers[0].id,
          quantity: 1,
          idempotencyKey: randomUUID(),
          expiresAt: new Date(Date.now() + 3600000),
        });
        const d = await entranceOverview(org.id, e.id);
        assert.equal(d.counts.expected, 0);
        assert.equal(
          await db.attendanceRecord.count({ where: { eventId: e.id } }),
          0,
        );
        assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
      },
    );
    const pair = await ticket(2);
    const a = pair[0],
      b = pair[1];
    await t.test(
      "multiple tickets preserve distinct opaque credentials and refresh data",
      async () => {
        assert.notEqual(a.token, b.token);
        assert.match(a.token, /^[a-f0-9]{64}$/);
        const x = await (await call("ticket/" + a.id, guest.id)).json();
        assert.equal(x.token, a.token);
        assert(x.qr.startsWith("data:image/png"));
        assert.equal(
          (await (await call("ticket/" + a.id, guest.id)).json()).token,
          x.token,
        );
      },
    );
    await t.test(
      "ticket owner and export authorization enforced; safe preview has no secrets",
      async () => {
        assert.equal((await call("ticket/" + a.id, outsider.id)).status, 403);
        assert.equal(
          (await call("ticket-export/" + a.id, outsider.id)).status,
          403,
        );
        const r = await call("ticket-export/" + a.id + "?share=1", guest.id);
        assert.equal(r.status, 200);
        const svg = await r.text();
        for (const secret of [
          a.token,
          a.id,
          guest.name,
          "SECRET TEST ADDRESS",
          'id="entry-qr"',
        ])
          assert(!svg.includes(secret));
        assert.match(r.headers.get("cache-control")!, /no-store/);
      },
    );
    await t.test("guest export is owner-only, audited, minimal and protects CSV formula injection",async()=>{
      assert.equal((await call("entrance-export/"+e.id,staff.id)).status,403);
      await db.user.update({where:{id:guest.id},data:{name:"  =FICTIONAL()"}});
      const response=await call("entrance-export/"+e.id,org.id);assert.equal(response.status,200);const csv=await response.text();assert(csv.includes("'  =FICTIONAL()"));assert(!csv.includes(guest.email));assert(!csv.includes(a.token));assert.equal(await db.adminAuditLog.count({where:{eventId:e.id,action:"GUEST_LIST_EXPORTED"}}),1);
      await db.user.update({where:{id:guest.id},data:{name:guest.name}});
    });
    await t.test(
      "scan preview exposes only permitted fields and does not admit",
      async () => {
        const p = await entranceAction(staff.id, {
          eventId: e.id,
          token: a.token,
        });
        assert.equal(p.name, guest.name);
        assert("requiresId" in p);
        assert.equal(p.requiresId, true);
        assert(!("token" in p));
        assert.equal(
          await db.ticketCheckIn.count({ where: { ticketId: a.id } }),
          0,
        );
        assert.equal(
          await db.attendanceRecord.count({ where: { eventId: e.id } }),
          0,
        );
      },
    );
    await t.test(
      "identity acknowledgement is mandatory for age restricted admission",
      async () => {
        await assert.rejects(
          entranceAction(staff.id, { eventId: e.id, token: a.token }, true),
          /identification/,
        );
      },
    );
    await t.test(
      "ID acknowledgement repeats inside the admission transaction",
      async () => {
        await assert.rejects(
          checkIn(staff.id, e.id, a.token, "QR", { identityConfirmed: false }),
          /identification/,
        );
        assert.equal(
          await db.ticketCheckIn.count({ where: { ticketId: a.id } }),
          0,
        );
      },
    );
    await t.test(
      "cancelled, refunded and invalid tickets expose no active credential",
      async () => {
        const [invalid] = await ticket();
        for (const status of ["CANCELLED", "REFUNDED", "INVALID"]) {
          await db.ticket.update({
            where: { id: invalid.id },
            data: { status },
          });
          await assert.rejects(
            entranceAction(staff.id, { eventId: e.id, token: invalid.token }),
            /Not valid/,
          );
          const response = await (
            await call("ticket/" + invalid.id, guest.id)
          ).json();
          assert.equal(response.token, "");
          assert.equal(response.qr, "");
        }
      },
    );
    await t.test("wrong event and unknown token rejected", async () => {
      await assert.rejects(
        entranceAction(org.id, { eventId: wrong.id, token: a.token }),
        /invalid/,
      );
      await assert.rejects(
        entranceAction(staff.id, { eventId: e.id, token: "f".repeat(64) }),
        /invalid/,
      );
    });
    await t.test(
      "QR and manual race commit exactly one admission, audit and private Passport",
      async () => {
        const r = await Promise.allSettled([
          entranceAction(
            staff.id,
            { eventId: e.id, token: a.token, identityConfirmed: true },
            true,
          ),
          entranceAction(
            org.id,
            { eventId: e.id, ticketId: a.id, identityConfirmed: true },
            true,
          ),
        ]);
        assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
        assert.equal(
          await db.ticketCheckIn.count({ where: { ticketId: a.id } }),
          1,
        );
        assert.equal(
          await db.attendanceRecord.count({
            where: { userId: guest.id, eventId: e.id, public: false },
          }),
          1,
        );
        assert.equal(
          await db.adminAuditLog.count({
            where: {
              targetId: a.id,
              action: {
                in: ["TICKET_CHECKED_IN", "TICKET_MANUALLY_CHECKED_IN"],
              },
            },
          }),
          1,
        );
      },
    );
    await t.test(
      "duplicate includes original admission time and creates no attendance",
      async () => {
        await assert.rejects(
          entranceAction(staff.id, { eventId: e.id, token: a.token }),
          /Already checked in at/,
        );
        assert.equal(
          await db.attendanceRecord.count({
            where: { userId: guest.id, eventId: e.id },
          }),
          1,
        );
      },
    );
    await t.test(
      "used ticket cannot expose active QR or credential",
      async () => {
        const r = await (await call("ticket/" + a.id, guest.id)).json();
        assert.equal(r.qr, "");
        assert.equal(r.token, "");
        const svg = await (
          await call("ticket-export/" + a.id, guest.id)
        ).text();
        assert(!svg.includes('id="entry-qr"'));
      },
    );
    await t.test(
      "manual admission persists method and updates counts across readers",
      async () => {
        await entranceAction(
          staff.id,
          { eventId: e.id, ticketId: b.id, identityConfirmed: true },
          true,
        );
        const [x, y] = await Promise.all([
          entranceOverview(org.id, e.id),
          entranceOverview(staff.id, e.id),
        ]);
        assert.equal(x.counts.checkedIn, 2);
        assert.deepEqual(x.counts, y.counts);
        assert.equal(x.guests.find((g) => g.id === b.id)?.method, "MANUAL");
        await assert.rejects(
          entranceAction(
            staff.id,
            { eventId: e.id, ticketId: b.id, identityConfirmed: true },
            true,
          ),
          /Already checked/,
        );
        assert.equal(
          await db.attendanceRecord.count({
            where: { userId: guest.id, eventId: e.id },
          }),
          1,
        );
      },
    );
    await t.test(
      "scanner-only capability omits guest list, financial records and credentials",
      async () => {
        await assign(true, false);
        const d = await entranceOverview(staff.id, e.id);
        assert.deepEqual(d.guests, []);
        assert.equal(d.canCheckIn, true);
        const json = JSON.stringify(d);
        assert(!json.includes(a.token));
        assert(!json.includes("recipientSnapshot"));
        await assert.rejects(
          entranceAction(staff.id, { eventId: e.id, ticketId: b.id }),
          /403/,
        );
        await assign();
      },
    );
    await t.test(
      "guest-list-only staff cannot admit and cannot self elevate",
      async () => {
        await assign(true, true, false, guestOnly.id);
        assert.equal(
          (await entranceOverview(guestOnly.id, e.id)).canCheckIn,
          false,
        );
        await assert.rejects(
          entranceAction(guestOnly.id, { eventId: e.id, token: a.token }),
          /403/,
        );
        await assert.rejects(
          setEventStaff(guestOnly.id, {
            eventId: e.id,
            userId: guestOnly.id,
            active: true,
            canCheckIn: true,
          }),
          /403/,
        );
      },
    );
    const [revoked] = await ticket();
    await t.test(
      "revocation invalidates preview and private export",
      async () => {
        await revokeTicket(org.id, revoked.id);
        await assert.rejects(
          entranceAction(staff.id, { eventId: e.id, token: revoked.token }),
          /Not valid/,
        );
        const d = await (await call("ticket/" + revoked.id, guest.id)).json();
        assert.equal(d.qr, "");
        assert.equal(d.token, "");
      },
    );
    const [racing] = await ticket();
    await t.test(
      "two scanners and repeated requests cannot admit more than once",
      async () => {
        const results = await Promise.allSettled(
          Array.from({ length: 5 }, () =>
            entranceAction(
              staff.id,
              { eventId: e.id, token: racing.token, identityConfirmed: true },
              true,
            ),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      },
    );
    const [racingRevoke] = await ticket();
    await t.test(
      "concurrent revoke and scan produce a serializable outcome",
      async () => {
        await Promise.allSettled([
          revokeTicket(org.id, racingRevoke.id),
          checkIn(staff.id, e.id, racingRevoke.token),
        ]);
        const current = await db.ticket.findUniqueOrThrow({
          where: { id: racingRevoke.id },
          include: { checkIn: true },
        });
        assert(["REVOKED", "CHECKED_IN"].includes(current.status));
        assert.equal(!!current.checkIn, current.status === "CHECKED_IN");
      },
    );
    const [racingSuspend] = await ticket();
    await t.test(
      "suspension races serialize; subsequent admissions fail",
      async () => {
        await Promise.allSettled([
          updateEventLifecycle(admin.id, e.id, "SUSPENDED"),
          checkIn(staff.id, e.id, racingSuspend.token),
        ]);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } })).status,
          "SUSPENDED",
        );
        await assert.rejects(
          entranceAction(
            staff.id,
            { eventId: e.id, token: racingSuspend.token },
            true,
          ),
        );
        await db.event.update({
          where: { id: e.id },
          data: { status: "PUBLISHED" },
        });
      },
    );
    await t.test(
      "revoked staff immediately lose sessions and all entrance operations",
      async () => {
        const c = await cookie(staff.id);
        await assign(false);
        assert.equal(
          (
            await fetch(base + "/api/entrance/" + e.id, {
              headers: { Cookie: c },
            })
          ).status,
          401,
        );
        await assert.rejects(entranceOverview(staff.id, e.id), /403/);
        await assert.rejects(
          entranceAction(staff.id, { eventId: e.id, token: b.token }),
          /403/,
        );
      },
    );
    await t.test("rejection audit never records raw tokens", async () => {
      const logs = JSON.stringify(
        await db.adminAuditLog.findMany({ where: { eventId: e.id } }),
      );
      for (const ticket of [a, b, revoked, racing])
        assert(!logs.includes(ticket.token));
    });
  } finally {
    const bookings = await db.booking.findMany({
      where: { eventId: { in: events } },
    });
    const bids = bookings.map((x) => x.id),
      payments = await db.payment.findMany({
        where: { bookingId: { in: bids } },
      }),
      pids = payments.map((x) => x.id),
      tickets = await db.ticket.findMany({
        where: { bookingId: { in: bids } },
      }),
      tids = tickets.map((x) => x.id);
    await db.ticketCheckIn.deleteMany({ where: { ticketId: { in: tids } } });
    await db.attendanceRecord.deleteMany({
      where: { eventId: { in: events } },
    });
    await db.ticket.deleteMany({ where: { id: { in: tids } } });
    await db.paymentReview.deleteMany({ where: { paymentId: { in: pids } } });
    await db.paymentEvidence.deleteMany({ where: { paymentId: { in: pids } } });
    await db.refund.deleteMany({ where: { paymentId: { in: pids } } });
    await db.payment.deleteMany({ where: { id: { in: pids } } });
    await db.commissionEntry.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.booking.deleteMany({ where: { id: { in: bids } } });
    await db.invitationGrant.deleteMany({ where: { eventId: { in: events } } });
    await db.eventInvitation.deleteMany({ where: { eventId: { in: events } } });
    await db.event.deleteMany({ where: { id: { in: events } } });

    await db.notification.deleteMany({ where: { userId: { in: ids } } });
    await db.userBadge.deleteMany({ where: { userId: { in: ids } } });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
