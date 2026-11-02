import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { db } from "../lib/db";
import {
  secretHash,
  securityChange,
  consumeRateLimit,
  resetPassword,
} from "../lib/security";
import { persistSession } from "../lib/session-security";
import { boundedBody } from "../lib/request-security";
import { validateImage } from "../lib/image-security";
import {
  processNotifications,
  runOperationalJobs,
} from "../lib/operational-jobs";
import {
  reserveBooking,
  approveRegistration,
  issueTickets,
  expireReservation,
  updateEventLifecycle,
  revokeTicket,
} from "../lib/booking-domain";
import {
  createInvitation,
  redeemInvitation,
  revokeInvitation,
} from "../lib/invitations";
import { setEventStaff } from "../lib/staff-permissions";
import { entranceAction, entranceExport } from "../lib/entrance";
import { checkIn } from "../lib/services";
const base = process.env.TEST_BASE_URL || "";
if (
  !process.env.DATABASE_URL?.startsWith("file:") ||
  process.env.ISOLATED_TEST_DATA !== "true" ||
  process.env.DB_PASSWORD !== undefined ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname)
)
  throw Error("Isolated local fictional tests only");
test("Phase 8 security, lifecycle contention, recovery and bounded operations", async (t) => {
  const p = "p8_" + randomUUID().slice(0, 8),
    uids = [p + "org", p + "admin", p + "guest", p + "other", p + "staff"],
    [org, admin, guest, other, staff] = uids,
    eids: string[] = [];
  for (const [i, id] of uids.entries())
    await db.user.create({
      data: {
        id,
        username: id,
        email: id + "@example.test",
        name: id,
        passwordHash: "unused",
        city: "Test",
        dob: new Date("1990-01-01"),
        role: ["ORGANIZER", "ADMIN", "ATTENDEE", "ORGANIZER", "STAFF"][i],
      },
    });
  const session = async (id: string) => {
    const token = randomBytes(32).toString("hex"),
      user = await db.user.findUniqueOrThrow({ where: { id } });
    await db.session.create({
      data: {
        id: secretHash(token),
        userId: id,
        securityVersion: user.securityVersion,
        expires: new Date(Date.now() + 3600000),
      },
    });
    return "vibey-session=" + token;
  };
  const api = async (
    path: string,
    cookie = "",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined
          ? {}
          : { Origin: base, "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const event = async (extra: any = {}) => {
    const id = p + "e" + eids.length;
    eids.push(id);
    return db.event.create({
      data: {
        id,
        slug: id,
        title: "Fictional Phase8",
        description: "Local only",
        category: "House Party",
        genre: "House",
        city: "Test",
        venue: "HIDDEN-SEARCH-" + id,
        privateVenue: "SECRET-ADDRESS-" + id,
        entryInstructions: "SECRET-DOOR-" + id,
        latitude: 0,
        longitude: 0,
        age: 18,
        capacity: 250,
        organizerId: org,
        image: "/images/halloween.jpg",
        startsAt: new Date(Date.now() + 3600000),
        endsAt: new Date(Date.now() + 86400000),
        status: "PUBLISHED",
        origin: "REAL",
        testOnly: true,
        configurationStatus: "FICTIONAL_APPROVED",
        access: "PUBLIC",
        locationVisibility: "HIDDEN",
        approvalRequired: true,
        tiers: { create: { name: "General", price: 0, quantity: 250 } },
        ...extra,
      },
      include: { tiers: true },
    });
  };
  const reserve = (e: any, who = guest, key = randomUUID()) =>
    reserveBooking(who, {
      eventId: e.id,
      tierId: e.tiers[0].id,
      quantity: 1,
      idempotencyKey: key,
      expiresAt: new Date(Date.now() + 3600000),
    });
  const confirmed = async (e: any) => {
    const b = await reserve(e);
    await approveRegistration(org, b.id, true);
    const tickets = await issueTickets(org, b.id);
    return { b, ticket: tickets[0] };
  };
  const note = (extra: any = {}) =>
    db.notification.create({
      data: {
        userId: guest,
        title: "Fictional worker test",
        body: "No real message",
        ...extra,
      },
    });
  t.after(async () => {
    await db.notification.deleteMany({
      where: { OR: [{ userId: { in: uids } }, { dedupeKey: { contains: p } }] },
    });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: uids } } });
    await db.attendanceRecord.deleteMany({ where: { eventId: { in: eids } } });
    await db.ticketCheckIn.deleteMany({
      where: { ticket: { booking: { eventId: { in: eids } } } },
    });
    await db.ticket.deleteMany({
      where: { booking: { eventId: { in: eids } } },
    });
    await db.payment.deleteMany({
      where: { booking: { eventId: { in: eids } } },
    });
    await db.commissionEntry.deleteMany({where:{booking:{ eventId: { in: eids } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ eventId: { in: eids } }}});
    await db.booking.deleteMany({ where: { eventId: { in: eids } } });
    await db.invitationGrant.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventInvitation.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventStaff.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventRegistrationField.deleteMany({
      where: { eventId: { in: eids } },
    });
    await db.eventTicketTier.deleteMany({ where: { eventId: { in: eids } } });
    await db.event.deleteMany({ where: { id: { in: eids } } });
    await db.session.deleteMany({ where: { userId: { in: uids } } });
    await db.passwordReset.deleteMany({ where: { userId: { in: uids } } });
    await db.userCapability.deleteMany({ where: { userId: { in: uids } } });
    await db.fileUpload.deleteMany({ where: { userId: { in: uids } } });
    await db.userBadge.deleteMany({ where: { userId: { in: uids } } });
    await db.user.deleteMany({ where: { id: { in: uids } } });
    await db.$disconnect();
  });
  await t.test(
    "public hidden-location event projection strips private instructions and coordinates",
    async () => {
      const e = await event(),
        r = await api("events/" + e.id),
        text = await r.text();
      assert.equal(r.status, 200);
      assert(!text.includes("SECRET-"));
      assert(!text.includes("HIDDEN-SEARCH"));
      const data = JSON.parse(text);
      assert.equal(data.entryInstructions, "");
      assert.equal(data.latitude, undefined);
    },
  );
  await t.test(
    "hidden venue cannot be recovered through public search oracle",
    async () => {
      const e = await event();
      const r = await api("events?q=" + encodeURIComponent(e.venue));
      assert(!(await r.text()).includes(e.id));
    },
  );
  await t.test(
    "authorization errors have private no-store and no-sniff headers",
    async () => {
      for (const path of ["admin", "ticket/" + p, "receipt/" + p]) {
        const r = await api(path);
        assert(r.status >= 400);
        assert.match(r.headers.get("cache-control") || "", /private.*no-store/);
        assert.equal(r.headers.get("x-content-type-options"), "nosniff");
      }
    },
  );
  await t.test(
    "invalid and explicitly revoked sessions fail admin requests",
    async () => {
      assert.equal((await api("admin", "vibey-session=invalid")).status, 401);
      const cookie = await session(admin);
      await db.session.deleteMany({ where: { userId: admin } });
      assert.equal((await api("admin", cookie)).status, 401);
    },
  );
  await t.test(
    "account suspension and role change invalidate persisted sessions",
    async () => {
      const cookie = await session(other);
      await securityChange(admin, other, { active: false });
      assert.equal((await api("me", cookie).then((r) => r.json())).user, null);
      await securityChange(admin, other, { active: true, role: "ATTENDEE" });
      assert.equal((await api("admin", await session(other))).status, 403);
    },
  );
  await t.test(
    "credential checked before security change cannot mint current session",
    async () => {
      const verified = await db.user.findUniqueOrThrow({
        where: { id: guest },
      });
      await db.user.update({
        where: { id: guest },
        data: { securityVersion: { increment: 1 } },
      });
      await assert.rejects(() => persistSession(guest, verified), /401/);
      assert.equal(await db.session.count({ where: { userId: guest } }), 0);
    },
  );
  await t.test(
    "password replacement cannot reuse previously verified hash",
    async () => {
      const verified = await db.user.findUniqueOrThrow({
        where: { id: guest },
      });
      await db.user.update({
        where: { id: guest },
        data: { passwordHash: "replacement" },
      });
      await assert.rejects(() => persistSession(guest, verified), /401/);
    },
  );
  await t.test("expired recovery token cannot change password", async () => {
    const token = randomBytes(32).toString("hex");
    await db.passwordReset.create({
      data: {
        id: secretHash(token),
        userId: guest,
        expires: new Date(Date.now() - 1000),
      },
    });
    await assert.rejects(
      () => resetPassword(token, "FictionalPassword8!"),
      /expired/,
    );
  });
  await t.test(
    "hostile origin and staff self-promotion remain rejected",
    async () => {
      const cookie = await session(staff);
      assert.equal(
        (
          await api(
            "security/account",
            cookie,
            { userId: staff, role: "ADMIN" },
            { Origin: "https://evil.example" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await api("security/account", cookie, {
            userId: staff,
            role: "ADMIN",
          })
        ).status,
        403,
      );
    },
  );
  await t.test(
    "fixed-window database rate bucket rejects parallel excess requests",
    async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => consumeRateLimit("p8", p, 3, 60000)),
      );
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
      assert.equal(results.filter((r) => r.status === "rejected").length, 2);
    },
  );
  await t.test(
    "stream body is bounded even without Content-Length",
    async () => {
      let cancelled = false;
      const req = new Request("http://localhost/", {
        method: "POST",
        duplex: "half",
        body: new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(1001));
          },
          cancel() {
            cancelled = true;
          },
        }),
      } as any);
      await assert.rejects(() => boundedBody(req, 1000), /413/);
      assert(cancelled);
    },
  );
  await t.test(
    "forged or truncated raster header and SVG content are rejected",
    async () => {
      await assert.rejects(
        () =>
          validateImage(
            Buffer.from([
              137,
              80,
              78,
              71,
              13,
              10,
              26,
              10,
              ...new Array(32).fill(0),
            ]),
            "image/png",
          ),
        /400/,
      );
      await assert.rejects(
        () =>
          validateImage(Buffer.from('<svg onload="alert(1)"/>'), "image/png"),
        /400/,
      );
    },
  );
  await t.test("genuine PNG stays accepted", async () => {
    await validateImage(await QRCode.toBuffer("FICTIONAL PHASE8"), "image/png");
  });
  await t.test(
    "legacy upload enforces MIME, signature and no-store without storing hostile data",
    async () => {
      const before = await db.fileUpload.count({ where: { userId: org } }),
        form = new FormData();
      form.set(
        "file",
        new File(
          [new Uint8Array(await QRCode.toBuffer("FICTIONAL"))],
          "image.png",
          { type: "text/html" },
        ),
      );
      const r = await fetch(base + "/api/upload", {
        method: "POST",
        headers: { Origin: base, Cookie: await session(org) },
        body: form,
      });
      assert.equal(r.status, 400);
      assert.match(r.headers.get("cache-control") || "", /no-store/);
      assert.equal(
        await db.fileUpload.count({ where: { userId: org } }),
        before,
      );
    },
  );
  await t.test(
    "cross-user booking and cross-organizer entrance access denied",
    async () => {
      const e = await event(),
        b = await reserve(e);
      assert.equal(
        (await api("customer/booking/" + b.id, await session(other))).status,
        404,
      );
      await assert.rejects(
        () => entranceAction(other, { eventId: e.id, ticketId: "missing" }),
        /403/,
      );
    },
  );
  await t.test(
    "forwarded, wrong-event and revoked invitations cannot grant access",
    async () => {
      const e = await event({
          access: "INVITATION_ONLY",
          invitationsEnabled: true,
        }),
        wrong = await event(),
        invite = await createInvitation(org, {
          eventId: e.id,
          inviteeId: guest,
          expiresAt: new Date(Date.now() + 3600000),
        });
      await assert.rejects(() => redeemInvitation(other, e.id, invite.token));
      await assert.rejects(() =>
        redeemInvitation(guest, wrong.id, invite.token),
      );
      await revokeInvitation(org, invite.id);
      await assert.rejects(() => redeemInvitation(guest, e.id, invite.token));
    },
  );
  await t.test(
    "parallel identical reservations claim only one stock unit",
    async () => {
      const e = await event(),
        key = randomUUID();
      const r = await Promise.all([
        reserve(e, guest, key),
        reserve(e, guest, key),
      ]);
      assert.equal(r[0].id, r[1].id);
      assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
          .reservedCount,
        1,
      );
    },
  );
  await t.test(
    "expiry racing registration cannot create tickets for expired booking",
    async () => {
      const e = await event(),
        b = await reserve(e);
      await db.booking.update({
        where: { id: b.id },
        data: { reservationExpiresAt: new Date(Date.now() - 1000) },
      });
      await Promise.allSettled([
        expireReservation(org, b.id),
        approveRegistration(org, b.id, true),
      ]);
      assert.equal(await db.ticket.count({ where: { bookingId: b.id } }), 0);
      assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
          .reservedCount,
        0,
      );
    },
  );
  await t.test(
    "QR and manual concurrent admission commit one arrival and private Passport record",
    async () => {
      const e = await event(),
        { ticket } = await confirmed(e);
      const r = await Promise.allSettled([
        entranceAction(
          org,
          { eventId: e.id, token: ticket.token, identityConfirmed: true },
          true,
        ),
        entranceAction(
          org,
          {
            eventId: e.id,
            ticketId: ticket.id,
            identityConfirmed: true,
            method: "MANUAL",
          },
          true,
        ),
      ]);
      assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(
        await db.ticketCheckIn.count({ where: { ticketId: ticket.id } }),
        1,
      );
      const attendance = await db.attendanceRecord.findUniqueOrThrow({
        where: { ticketId: ticket.id },
      });
      assert.equal(attendance.public, false);
    },
  );
  await t.test(
    "staff permission revocation blocks existing scanning session",
    async () => {
      const e = await event(),
        { ticket } = await confirmed(e);
      await setEventStaff(org, {
        eventId: e.id,
        userId: staff,
        active: true,
        canCheckIn: true,
        canViewGuests: true,
      });
      await setEventStaff(org, { eventId: e.id, userId: staff, active: false });
      await assert.rejects(
        () => entranceAction(staff, { eventId: e.id, token: ticket.token }),
        /403/,
      );
    },
  );
  await t.test(
    "suspension versus admission leaves no subsequent valid admission",
    async () => {
      const e = await event(),
        { ticket } = await confirmed(e);
      await Promise.allSettled([
        updateEventLifecycle(admin, e.id, "SUSPENDED"),
        checkIn(org, e.id, ticket.token, "QR", { identityConfirmed: true }),
      ]);
      await assert.rejects(
        () =>
          checkIn(org, e.id, ticket.token, "QR", { identityConfirmed: true }),
        /409/,
      );
      assert(
        (await db.ticketCheckIn.count({ where: { ticketId: ticket.id } })) <= 1,
      );
    },
  );
  await t.test(
    "revocation versus admission never duplicates attendance",
    async () => {
      const e = await event(),
        { ticket } = await confirmed(e);
      await Promise.allSettled([
        revokeTicket(org, ticket.id),
        checkIn(org, e.id, ticket.token, "QR", { identityConfirmed: true }),
      ]);
      await assert.rejects(
        () =>
          checkIn(org, e.id, ticket.token, "QR", { identityConfirmed: true }),
        /400|409/,
      );
      assert(
        (await db.ticketCheckIn.count({ where: { ticketId: ticket.id } })) <= 1,
      );
    },
  );
  await t.test(
    "abandoned final lease creates safe audited failure and one admin alert",
    async () => {
      const n = await note({
        jobStatus: "PROCESSING",
        attempts: 3,
        workerToken: "dead-worker",
        leaseUntil: new Date(Date.now() - 1000),
      });
      await Promise.all([
        processNotifications(admin, undefined, new Date(), 1, n.id),
        processNotifications(admin, undefined, new Date(), 1, n.id),
      ]);
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .lastError,
        "FINAL_LEASE_EXPIRED",
      );
      assert.equal(
        await db.adminAuditLog.count({
          where: { targetId: n.id, reasonCode: "FINAL_LEASE_EXPIRED" },
        }),
        1,
      );
      assert.equal(
        await db.notification.count({
          where: { dedupeKey: `delivery-failed:${n.id}:${admin}` },
        }),
        1,
      );
    },
  );
  await t.test(
    "targeted worker cannot sweep unrelated expired final leases",
    async () => {
      const n = await note({
        jobStatus: "PROCESSING",
        attempts: 3,
        workerToken: "dead-worker",
        leaseUntil: new Date(Date.now() - 1000),
      });
      await processNotifications(
        admin,
        undefined,
        new Date(),
        1,
        "absent-" + p,
      );
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .jobStatus,
        "PROCESSING",
      );
      await processNotifications(admin, undefined, new Date(), 1, n.id);
    },
  );
  await t.test(
    "worker crash before attempt limit recovers once and honors consent",
    async () => {
      let sent = 0;
      const n = await note({
        jobStatus: "PROCESSING",
        attempts: 1,
        workerToken: "dead",
        leaseUntil: new Date(Date.now() - 1000),
      });
      await Promise.all(
        [1, 2].map(() =>
          processNotifications(
            admin,
            {
              send: async () => {
                sent++;
              },
            },
            new Date(),
            1,
            n.id,
          ),
        ),
      );
      assert.equal(sent, 1);
      assert.equal(
        (await db.notification.findUniqueOrThrow({ where: { id: n.id } }))
          .attempts,
        2,
      );
      await db.user.update({
        where: { id: guest },
        data: { promotionalNotifications: false },
      });
      const optional = await note({ category: "PROMOTIONAL" });
      await processNotifications(
        admin,
        {
          send: async () => {
            throw Error("must not deliver");
          },
        },
        new Date(Date.now() + 1000),
        1,
        optional.id,
      );
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
    "reminders drain beyond 100 with accurate counts and repeat safely",
    async () => {
      const e = await event();
      for (let i = 0; i < 105; i++)
        await db.booking.create({
          data: {
            id: p + "reminder" + i,
            userId: guest,
            eventId: e.id,
            tierId: e.tiers[0].id,
            total: 0,
            idempotencyKey: p + "reminder" + i,
            origin: "REAL",
            testOnly: true,
            lifecycle: "CONFIRMED",
            registrationState: "APPROVED",
            paymentRequired: false,
          },
        });
      for (let i = 0; i < 4; i++) await runOperationalJobs(admin);
      const notes = await db.notification.findMany({
        where: { dedupeKey: { startsWith: "reminder:" + p + "reminder" } },
      });
      assert.equal(notes.length, 105);
      const before = notes.length;
      await runOperationalJobs(admin);
      assert.equal(
        await db.notification.count({
          where: { dedupeKey: { startsWith: "reminder:" + p + "reminder" } },
        }),
        before,
      );
    },
  );
  await t.test(
    "damaged compressed image is rejected even when its metadata is valid",
    async () => {
      const damaged = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=",
        "base64",
      );
      await assert.rejects(() => validateImage(damaged, "image/png"), /400/);
    },
  );
  await t.test(
    "reminder runner survives event suspension and serves unrelated eligible booking",
    async () => {
      const changing = await event(),
        stable = await event();
      await confirmed(changing);
      const { b } = await confirmed(stable);
      const results = await Promise.allSettled([
        runOperationalJobs(admin),
        updateEventLifecycle(admin, changing.id, "SUSPENDED"),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
      await runOperationalJobs(admin);
      assert.equal(
        (await db.event.findUniqueOrThrow({ where: { id: changing.id } }))
          .status,
        "SUSPENDED",
      );
      assert.equal(
        await db.notification.count({
          where: { dedupeKey: `reminder:${b.id}:0` },
        }),
        1,
      );
    },
  );
  await t.test(
    "CSV formulas are escaped and exports omit raw credentials",
    async () => {
      const e = await event(),
        { ticket } = await confirmed(e);
      await db.user.update({
        where: { id: guest },
        data: { name: '=HYPERLINK("https://example.test")' },
      });
      const csv = await entranceExport(org, e.id);
      assert(csv.includes("'=HYPERLINK"));
      assert(!csv.includes(ticket.token));
    },
  );
});
