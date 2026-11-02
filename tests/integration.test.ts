import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
if (process.env.ISOLATED_TEST_DATA !== "true" || !["localhost","127.0.0.1","[::1]"].includes(new URL(base).hostname) || !process.env.DATABASE_URL?.startsWith("file:") || process.env.DB_PASSWORD !== undefined) throw Error("Integration tests require explicit isolated local data and a loopback test URL.");
class Client {
  cookie = "";
  async call(route: string, body?: any, origin?: string) {
    const r = await fetch(`${base}/api/${route}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const c = r.headers.get("set-cookie");
    if (c) this.cookie = c.split(";")[0];
    return { status: r.status, data: await r.json() };
  }
}
test("database-backed application journeys and authorization", async (t) => {
  const stamp = randomUUID().slice(0, 8);
  const a = new Client(),
    b = new Client(),
    minor = new Client(),
    org = new Client(),
    staff = new Client(),
    admin = new Client(),
    anon = new Client();
  const userIds: string[] = [];
  const receiptPaths: string[] = [];
  let ownedReceipt = "";
  const eventIds: string[] = [];
  const names: string[] = [];
  try {
    await t.test(
      "public discovery works and private venue is excluded",
      async () => {
        const r = await anon.call("events");
        assert.equal(r.status, 200);
        assert.ok(r.data.length >= 6);
        assert.equal(r.data.some((e:any)=>e.id === "halloween"),false);
        assert.ok(r.data.every((e:any)=>e.access === "PUBLIC" && !("privateVenue" in e)));
        assert.equal((await anon.call("events/halloween-house-party")).status,404);
        const s = await anon.call("events?city=Penang");
        assert.ok(s.data.every((e: any) => e.city === "Penang"));
        assert.equal((await anon.call("tickets")).status, 401);
      },
    );
    for (const [c, n, dob] of [
      [a, "a", "1997-01-01"],
      [b, "b", "1998-01-01"],
      [minor, "minor", "2010-01-01"],
      [org, "organizer", "1990-01-01"],
    ] as const) {
      const r = await c.call("register", {
        name: `Test ${n} ${stamp}`,
        username: `test_${n}_${stamp}`,
        email: `test_${n}_${stamp}@example.test`,
        password: "TestSecure2026!",
        dob,
        city: "Kuala Lumpur",
      });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      userIds.push(r.data.id);
      names.push(r.data.name);
    }
    await t.test(
      "public images are served from durable database bytes while private files stay inaccessible",
      async () => {
        const bytes = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=", "base64"));
        const form = new FormData();
        form.set("file", new File([bytes], "image.png", { type: "image/png" }));
        const uploaded = await fetch(`${base}/api/upload`, {
          method: "POST",
          headers: { cookie: a.cookie },
          body: form,
        });
        assert.equal(uploaded.status, 200);
        const { path: imagePath } = await uploaded.json();
        const stored = await db.fileUpload.findUniqueOrThrow({
          where: { path: imagePath },
        });
        assert.deepEqual(new Uint8Array(stored.data!), bytes);
        const image = await fetch(`${base}${imagePath}`);
        assert.equal(image.status, 200);
        assert.equal(image.headers.get("content-type"), "image/png");
        assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
        await db.fileUpload.update({
          where: { path: imagePath },
          data: { private: true },
        });
        assert.equal((await fetch(`${base}${imagePath}`)).status, 404);
        assert.equal((await fetch(`${base}/uploads/not-an-image`)).status, 404);
      },
    );
    await t.test(
      "registration survives logout and hashed-password login",
      async () => {
        await a.call("logout", {});
        assert.equal((await a.call("me")).data.user, null);
        assert.equal(
          (
            await a.call("login", {
              email: `test_a_${stamp}@example.test`,
              password: "wrong",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await a.call("login", {
              email: `test_a_${stamp}@example.test`,
              password: "TestSecure2026!",
            })
          ).status,
          200,
        );
        const saved = await db.user.findUniqueOrThrow({
          where: { id: userIds[0] },
        });
        assert.ok(saved.passwordHash.startsWith("$2"));
        assert.equal(saved.attendancePublic, false);
      },
    );
    await db.user.update({
      where: { id: userIds[3] },
      data: { verification: "VERIFIED", role: "ORGANIZER" },
    });
    await staff.call("demo", { id: "staff" });
    await admin.call("demo", { id: "admin" });
    await t.test("admin and CSRF checks are enforced server-side", async () => {
      assert.equal((await a.call("admin")).status, 403);
      assert.equal((await admin.call("admin")).status, 200);
      assert.equal(
        (await a.call("save", { eventId: "halloween" }, "https://evil.example"))
          .status,
        403,
      );
    });
    const event = {
      title: `Integration Halloween ${stamp}`,
      description: "A private fictional house event for integration tests.",
      category: "House Party",
      genre: "House",
      city: "Kuala Lumpur",
      venue: "Approximate test area",
      privateVenue: "PRIVATE TEST ADDRESS",
      image: "/images/halloween.jpg",
      startsAt: "2026-12-01T12:00:00.000Z",
      endsAt: "2026-12-01T18:00:00.000Z",
      age: 18,
      capacity: 2,
      access: "PRIVATE",
      approvalRequired: true,
      theme: "Halloween",
      status: "PUBLISHED",
      price: 3500,
      ticketName: "Test entry",
      latitude: 3.139,
      longitude: 101.6869,
      fields: [
        { label: "Invited by", type: "text", required: true, options: "" },
      ],
    };
    const created = await org.call("event", event);
    assert.equal(created.status, 200, JSON.stringify(created.data));
    eventIds.push(created.data.id);
    let e = (await org.call(`events/${created.data.id}`)).data;
    const eventId = e.id;
    let tierId = e.tiers[0].id;
    await t.test(
      "event creation/editing belongs to its organizer",
      async () => {
        assert.equal(
          (await a.call("event", { ...event, id: eventId })).status,
          403,
        );
        assert.equal(
          (
            await org.call("event", {
              ...event,
              id: eventId,
              title: `Updated test ${stamp}`,
            })
          ).status,
          200,
        );
        assert.equal((await a.call("pause", { eventId })).status, 403);
        assert.equal(
          (
            await staff.call("checkin", {
              eventId,
              token: "x".repeat(64),
              identityConfirmed: true,
            })
          ).status,
          403,
        );
      },
    );
    tierId = (await org.call(`events/${eventId}`)).data.tiers[0].id;
    // Private registrations require persisted, account-bound authorization.
    await db.event.update({where:{id:eventId},data:{invitationsEnabled:true}});
    for (const [client,userId] of [[a,userIds[0]],[b,userIds[1]]] as const) {
      const invite=await org.call("invitations",{eventId,inviteeId:userId,expiresAt:new Date(Date.now()+3600000).toISOString()});
      assert.equal(invite.status,200);
      assert.equal((await client.call("invitations/redeem",{eventId,token:invite.data.token})).status,200);
    }
    const payload = {
      eventId,
      tierId,
      quantity: 1,
      answers: { rules: "yes", "Invited by": "Test invitation" },
      idempotencyKey: randomUUID(),
      paymentOutcome: "SUCCEEDED",
    };
    await t.test("minors cannot register for adult nightlife", async () => {
      assert.equal(
        (await minor.call("book", { ...payload, idempotencyKey: randomUUID() }))
          .status,
        403,
      );
    });
    await t.test(
      "failed demo payment never reserves stock or issues a ticket",
      async () => {
        const r = await b.call("book", {
          ...payload,
          paymentOutcome: "FAILED",
          idempotencyKey: randomUUID(),
        });
        assert.equal(r.data.status, "PAYMENT_FAILED");
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: tierId },
            })
          ).sold,
          0,
        );
        assert.equal(
          await db.ticket.count({ where: { bookingId: r.data.id } }),
          0,
        );
      },
    );
    await t.test(
      "required registration answers are validated on the server",
      async () => {
        assert.equal(
          (
            await a.call("book", {
              ...payload,
              answers: { rules: "yes" },
              idempotencyKey: randomUUID(),
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "sample receipt uploads are private and bound to their owner",
      async () => {
        const form = new FormData();
        form.set("private", "true");
        form.set(
          "file",
          new Blob(
            [
              Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=",
                "base64",
              ),
            ],
            { type: "image/png" },
          ),
          "sample.png",
        );
        const upload = await fetch(`${base}/api/upload`, {
          method: "POST",
          headers: { cookie: a.cookie },
          body: form,
        });
        assert.equal(upload.status, 200);
        const receipt = await upload.json();
        receiptPaths.push(receipt.path);
        assert.equal(
          (
            await b.call("book", {
              ...payload,
              receiptPath: receipt.path,
              idempotencyKey: randomUUID(),
            })
          ).status,
          403,
        );
        ownedReceipt = receipt.path;
        const bad = new FormData();
        bad.set(
          "file",
          new Blob(["<svg></svg>"], { type: "image/svg+xml" }),
          "bad.svg",
        );
        assert.equal(
          (
            await fetch(`${base}/api/upload`, {
              method: "POST",
              headers: { cookie: a.cookie },
              body: bad,
            })
          ).status,
          400,
        );
      },
    );
    const booking = await a.call("book", {
      ...payload,
      receiptPath: ownedReceipt,
    });
    assert.equal(booking.status, 200, JSON.stringify(booking.data));
    const bookingId = booking.data.id;
    await t.test(
      "pending booking persists, is idempotent, and has no ticket",
      async () => {
        assert.equal(booking.data.status, "PENDING_REVIEW");
        assert.equal((await a.call("book", payload)).data.id, bookingId);
        assert.equal(
          (await a.call("book", { ...payload, idempotencyKey: randomUUID() }))
            .status,
          409,
        );
        const r = await a.call("tickets");
        assert.ok(r.data.some((b: any) => b.id === bookingId));
        assert.equal(
          r.data.find((b: any) => b.id === bookingId).tickets.length,
          0,
        );
        assert.ok(!JSON.stringify(r.data).includes("PRIVATE TEST ADDRESS"));
        assert.equal(
          (await b.call("review", { bookingId, approve: true })).status,
          403,
        );
      },
    );
    await t.test(
      "private receipt access requires booking ownership or event ownership",
      async () => {
        assert.equal(
          (
            await fetch(`${base}/api/receipt/${bookingId}`, {
              headers: { cookie: org.cookie },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await fetch(`${base}/api/receipt/${bookingId}`, {
              headers: { cookie: b.cookie },
            })
          ).status,
          403,
        );
        assert.equal(
          (await fetch(`${base}/api/receipt/${bookingId}`)).status,
          401,
        );
      },
    );
    await t.test(
      "approval issues a unique secure QR and reveals venue to owner only",
      async () => {
        assert.equal(
          (await org.call("review", { bookingId, approve: true })).status,
          200,
        );
        assert.equal(
          (await org.call("review", { bookingId, approve: true })).status,
          409,
        );
        const r = await a.call("tickets");
        const own = r.data.find((item: any) => item.id === bookingId);
        assert.equal(own.tickets.length, 1);
        assert.match(own.tickets[0].token, /^[a-f0-9]{64}$/);
        const qr = await a.call(`ticket/${own.tickets[0].id}`);
        assert.ok(qr.data.qr.startsWith("data:image/png;base64,"));
        assert.equal(qr.data.event.venue, "PRIVATE TEST ADDRESS");
        assert.equal((await anon.call(`events/${eventId}`)).status,404);
        assert.equal((await b.call(`ticket/${own.tickets[0].id}`)).status, 403);
      },
    );
    const own = (await a.call("tickets")).data.find(
      (item: any) => item.id === bookingId,
    );
    const token = own.tickets[0].token;
    await t.test(
      "passport changes only after one authorized check-in, duplicate race is rejected",
      async () => {
        assert.equal((await a.call("profile")).data.attendance.length, 0);
        assert.equal(
          (await a.call("checkin", { eventId, token, identityConfirmed: true }))
            .status,
          403,
        );
        const results = await Promise.all([
          org.call("checkin", { eventId, token, identityConfirmed: true }),
          org.call("checkin", { eventId, token, identityConfirmed: true }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        assert.equal((await a.call("profile")).data.attendance.length, 1);
        assert.equal(
          (await a.call("tickets")).data.find((x: any) => x.id === bookingId)
            .tickets[0].status,
          "CHECKED_IN",
        );
        assert.equal(
          await db.ticketCheckIn.count({
            where: { ticketId: own.tickets[0].id },
          }),
          1,
        );
        assert.equal(
          (await a.call("profile")).data.badges[0].badge.name,
          "First Night Out",
        );
        assert.equal(
          (await org.call("event", { ...event, id: eventId })).status,
          409,
        );
      },
    );
    await t.test(
      "inventory cannot be oversold and rejection releases it once",
      async () => {
        const second = await b.call("book", {
          ...payload,
          idempotencyKey: randomUUID(),
        });
        assert.equal(second.status, 200);
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: tierId },
            })
          ).sold,
          2,
        );
        const third = await org.call("book", {
          ...payload,
          idempotencyKey: randomUUID(),
        });
        assert.equal(third.status, 409);
        assert.equal(
          (
            await org.call("review", {
              bookingId: second.data.id,
              approve: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: tierId },
            })
          ).sold,
          1,
        );
        assert.equal(
          (
            await org.call("review", {
              bookingId: second.data.id,
              approve: false,
            })
          ).status,
          409,
        );
        assert.equal(
          (await b.call("tickets")).data.find(
            (x: any) => x.id === second.data.id,
          ).paymentStatus,
          "REFUNDED",
        );
      },
    );
    await t.test(
      "profile editing and explicit attendance consent persist",
      async () => {
        for (const [c, id] of [
          [a, userIds[0]],
          [b, userIds[1]],
        ] as const) {
          const me = (await c.call("me")).data.user;
          assert.equal(
            (
              await c.call("profile", {
                name: me.name,
                city: me.city,
                bio: "Test profile updated",
                interests: "House,Techno",
                instagram: "test_profile",
                instagramPublic: false,
                attendancePublic: false,
                discoverable: true,
                achievementsPublic: false,
              })
            ).status,
            200,
          );
        }
        assert.equal(
          (await a.call("attendance-privacy", { bookingId, public: true }))
            .status,
          200,
        );
        assert.equal(
          (
            await db.attendanceRecord.findFirstOrThrow({
              where: { userId: userIds[0] },
            })
          ).public,
          true,
        );
        assert.equal(
          (await b.call("attendance-privacy", { bookingId, public: true }))
            .status,
          403,
        );
        assert.equal(
          (await a.call("attendance-privacy", { bookingId, public: false }))
            .status,
          200,
        );
        assert.equal(
          (
            await db.attendanceRecord.findFirstOrThrow({
              where: { userId: userIds[0] },
            })
          ).public,
          false,
        );
      },
    );
    await t.test(
      "public profiles do not expose private memories or contact details",
      async () => {
        const result = await b.call(`people/test_a_${stamp}`);
        assert.equal(result.status, 200);
        assert.equal(result.data.attendance.length, 0);
        assert.equal(result.data.user.instagram, "");
        assert.equal("email" in result.data.user, false);
        assert.equal("dob" in result.data.user, false);
      },
    );
    await t.test(
      "profile websites validate their protocol and save to the database",
      async () => {
        const me = (await a.call("me")).data.user;
        assert.equal(
          (await a.call("profile", { ...me, website: "javascript:alert(1)" }))
            .status,
          400,
        );
        assert.equal(
          (
            await a.call("profile", {
              ...me,
              website: "https://example.com/music",
            })
          ).status,
          200,
        );
        assert.equal(
          (await b.call(`people/test_a_${stamp}`)).data.user.website,
          "https://example.com/music",
        );
      },
    );
    await t.test("retired clubs and direct messages return 410 without exposing historical records",async()=>{
      assert.equal((await a.call("clubs")).status,410);
      assert.equal((await a.call("club",{action:"join",clubId:"historical"})).status,410);
      assert.equal((await a.call("message",{conversationId:"historical",text:"no"})).status,410);
    });
    await t.test("friend requests persist through cancel, accept, remove, block and unblock without internal IDs",async()=>{
      const keyA=`test_a_${stamp}`,keyB=`test_b_${stamp}`;
      assert.equal((await a.call("social",{targetId:keyB,action:"request"})).status,200);
      assert.equal((await a.call("social",{targetId:keyB,action:"request"})).status,409);
      assert.equal((await b.call("people")).data.requests.filter((r:any)=>r.fromId===keyA).length,1);
      assert.equal((await a.call("social",{targetId:keyB,action:"cancel"})).status,200);
      assert.equal((await b.call("people")).data.requests.length,0);
      assert.equal((await a.call("social",{targetId:keyB,action:"request"})).status,200);
      assert.equal((await b.call("social",{targetId:keyA,action:"accept"})).status,200);
      const people=(await a.call("people")).data;
      assert(people.friends.length);assert.equal(people.conversations,undefined);
      assert(people.people.every((p:any)=>p.id===p.username&&!p.email));
      assert.equal((await a.call("social",{targetId:keyB,action:"remove"})).status,200);
      assert.equal((await a.call("people")).data.friends.length,0);
      assert.equal((await b.call("social",{targetId:keyA,action:"block"})).status,200);
      assert.equal((await a.call("social",{targetId:keyB,action:"request"})).status,403);
      assert.equal((await b.call("blocked-accounts")).data[0].username,keyA);
      assert.equal((await b.call("social",{targetId:keyA,action:"unblock"})).status,200);
      assert.equal((await b.call("people")).data.friends.length,0);
      assert.equal((await minor.call("social",{targetId:keyA,action:"request"})).status,403);
    });
    await t.test(
      "promotion requires admin review and creates a labeled stored placement",
      async () => {
        assert.equal(
          (
            await org.call("promotion", {
              eventId,
              package: "Homepage Spotlight",
            })
          ).status,
          200,
        );
        const p = await db.eventPromotion.findFirstOrThrow({
          where: { eventId },
        });
        assert.equal(p.status, "PENDING");
        assert.equal(
          (
            await a.call("admin-action", {
              kind: "promotion",
              id: p.id,
              approve: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await admin.call("admin-action", {
              kind: "promotion",
              id: p.id,
              approve: true,
            })
          ).status,
          200,
        );
        assert.equal((await anon.call(`events/${eventId}`)).status, 404);
        assert.equal((await org.call(`events/${eventId}`)).status, 200);
      },
    );
    await t.test(
      "approved booking refunds invalidate entry and release inventory",
      async () => {
        const r = await b.call("book", {
          ...payload,
          idempotencyKey: randomUUID(),
        });
        assert.equal(r.status, 200);
        await org.call("review", { bookingId: r.data.id, approve: true });
        const ticket = (await b.call("tickets")).data.find(
          (x: any) => x.id === r.data.id,
        ).tickets[0];
        assert.equal(
          (await a.call("refund", { bookingId: r.data.id })).status,
          403,
        );
        assert.equal(
          (await org.call("refund", { bookingId: r.data.id })).status,
          200,
        );
        assert.equal(
          (
            await org.call("checkin", {
              eventId,
              token: ticket.token,
              identityConfirmed: true,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: tierId },
            })
          ).sold,
          1,
        );
      },
    );
    await t.test(
      "simulated settlement can only be claimed once and completed by admins",
      async () => {
        const r = await org.call("payout", {});
        assert.equal(r.status, 200);
        assert.equal(r.data.amount, 3325);
        assert.equal((await org.call("payout", {})).status, 400);
        assert.equal(
          (
            await a.call("admin-action", {
              kind: "payout",
              id: r.data.id,
              approve: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await admin.call("admin-action", {
              kind: "payout",
              id: r.data.id,
              approve: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await admin.call("admin-action", {
              kind: "payout",
              id: r.data.id,
              approve: true,
            })
          ).status,
          409,
        );
      },
    );
    await t.test("in-app notifications and save/unsave persist", async () => {
      const ns = (await a.call("notifications")).data;
      assert.ok(ns.length >= 3);
      await a.call("notifications", {});
      assert.ok((await a.call("notifications")).data.every((n: any) => n.read));
      await a.call("save", { eventId });
      assert.equal((await a.call("profile")).data.saved.length, 1);
      await a.call("save", { eventId });
      assert.equal((await a.call("profile")).data.saved.length, 0);
    });
  } finally {
    const promos = await db.eventPromotion.findMany({
      where: { eventId: { in: eventIds } },
    });
    const payouts = await db.payout.findMany({
      where: { organizerId: { in: userIds } },
    });
    const bs = await db.booking.findMany({
      where: { eventId: { in: eventIds } },
    });
    const bIds = bs.map((b) => b.id);
    const ts = await db.ticket.findMany({ where: { bookingId: { in: bIds } } });
    const tIds = ts.map((t) => t.id);
    const ps = await db.payment.findMany({
      where: { bookingId: { in: bIds } },
    });
    await db.ticketCheckIn.deleteMany({ where: { ticketId: { in: tIds } } });
    await db.attendanceRecord.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await db.ticket.deleteMany({ where: { id: { in: tIds } } });
    await db.refund.deleteMany({
      where: { paymentId: { in: ps.map((p) => p.id) } },
    });
    await db.payment.deleteMany({ where: { bookingId: { in: bIds } } });
    await db.payout.deleteMany({ where: { organizerId: { in: userIds } } });
    await db.commissionEntry.deleteMany({where:{booking:{ id: { in: bIds } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ id: { in: bIds } }}});
    await db.booking.deleteMany({ where: { id: { in: bIds } } });
    await db.eventPromotion.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await db.eventActivity.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.invitationGrant.deleteMany({where:{eventId:{in:eventIds}}});
    await db.eventInvitation.deleteMany({where:{eventId:{in:eventIds}}});
    await db.event.deleteMany({ where: { id: { in: eventIds } } });
    await db.conversation.deleteMany({
      where: { OR: [{ userA: { in: userIds } }, { userB: { in: userIds } }] },
    });
    await db.friendship.deleteMany({
      where: { OR: [{ userA: { in: userIds } }, { userB: { in: userIds } }] },
    });
    await db.friendRequest.deleteMany({
      where: { OR: [{ fromId: { in: userIds } }, { toId: { in: userIds } }] },
    });
    await db.follow.deleteMany({
      where: { OR: [{ fromId: { in: userIds } }, { toId: { in: userIds } }] },
    });
    await db.block.deleteMany({
      where: { OR: [{ fromId: { in: userIds } }, { toId: { in: userIds } }] },
    });
    await db.userBadge.deleteMany({ where: { userId: { in: userIds } } });
    await db.adminAuditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          {
            targetId: {
              in: [
                ...eventIds,
                ...bIds,
                ...tIds,
                ...promos.map((p) => p.id),
                ...payouts.map((p) => p.id),
              ],
            },
          },
        ],
      },
    });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    for (const name of receiptPaths)
      await unlink(path.join(process.cwd(), "uploads/private", name)).catch(
        () => {},
      );
    await db.$disconnect();
  }
});
