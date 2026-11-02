import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
import {
  createInvitation,
  redeemInvitation,
  revokeInvitation,
} from "../lib/invitations";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
} from "../lib/payment-foundation";
import {
  expireReservation,
  cancelBooking,
  issueTickets,
  revokeTicket,
  updateEventLifecycle,
} from "../lib/booking-domain";
import { setEventStaff } from "../lib/staff-permissions";
import { checkIn } from "../lib/services";
import { salesModeAllows } from "../lib/customer-policy";
const base = process.env.TEST_BASE_URL || "";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Explicit isolated loopback SQLite required.");
test("Phase 4 scoped customer checkout, independent reviews and admission", async (t) => {
  const prefix = "p4_" + randomUUID().slice(0, 8),
    uids: string[] = [],
    eids: string[] = [],
    destinations: string[] = [];
  const password = "FictionalPhase4Test!";
  const pw = await hash(password, 4);
  const user = async (role = "ATTENDEE") => {
    const id = prefix + "_" + uids.length;
    uids.push(id);
    return db.user.create({
      data: {
        id,
        email: id + "@example.test",
        username: id,
        name: id,
        passwordHash: pw,
        dob: new Date("1990-01-01"),
        city: "Test",
        role,
        verification: role === "ORGANIZER" ? "VERIFIED" : "UNVERIFIED",
      },
    });
  };
  const org = await user("ORGANIZER"),
    admin = await user("ADMIN"),
    a = await user(),
    b = await user(),
    scanner = await user("STAFF"),
    foreign = await user("ORGANIZER");
  const api = async (path: string, cookie: string | null, body?: any) =>
    fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "X-Forwarded-For": "phase4-" + prefix,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined
          ? {}
          : { Origin: base, "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const login = async (u: any) => {
    const r = await api("login", null, { email: u.email, password });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0];
  };
  const cookies = {
    org: await login(org),
    admin: await login(admin),
    a: await login(a),
    b: await login(b),
    scanner: await login(scanner),
    foreign: await login(foreign),
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=",
    "base64",
  );
  const qr = await db.fileUpload.create({
    data: {
      userId: org.id,
      path: prefix + "qr",
      mime: "image/png",
      private: true,
      data: png,
    },
  });
  const v = await submitPaymentDestination(org.id, {
    methodType: "TOUCH_N_GO",
    label: "Fictional local destination",
    recipientName: "FICTIONAL OWNER",
    qrAssetId: qr.id,
  });
  destinations.push(v.destinationId);
  await reviewPaymentDestination(admin.id, v.id, true, {
    notes: "Fictional fixture reviewed only.",
    procedure: "Checked explicit isolated sample and fictional test organizer.",
  });
  const event = async (extra: any = {}) => {
    const id = prefix + "e" + eids.length;
    eids.push(id);
    return db.event.create({
      data: {
        id,
        slug: id,
        title: "Fictional Phase 4",
        description: "Fictional isolated test event",
        category: "House Party",
        genre: "House",
        latitude: 0,
        longitude: 0,
        theme: "Halloween",
        city: "Test",
        venue: "Test area",
        privateVenue: "PRIVATE ADDRESS MUST NOT LEAK",
        image: "/images/halloween.jpg",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 2 * 86400000),
        capacity: 10,
        age: 18,
        organizerId: org.id,
        origin: "REAL",
        testOnly: true,
        status: "PUBLISHED",
        reviewOutcome: "APPROVED",
        configurationStatus: "FICTIONAL_APPROVED",
        access: "INVITATION_ONLY",
        invitationsEnabled: true,
        approvalRequired: true,
        paymentDestinationId: v.destinationId,
        locationVisibility: "HIDDEN",
        policies: "Fictional test only; no real funds.",
        tiers: {
          create: {
            id: id + "t",
            name: "General Admission",
            price: 3500,
            quantity: 10,
            minPerOrder: 1,
            maxPerOrder: 2,
          },
        },
        fields: {
          create: [
            {
              id: id + "name",
              label: "Full name as on IC",
              type: "text",
              required: true,
            },
            { id: id + "age", label: "Age", type: "number", required: true },
            {
              id: id + "instagram",
              label: "Instagram username",
              type: "text",
              required: true,
            },
          ],
        },
        ...extra,
      },
    });
  };
  const e = await event();
  let invite: any, booking: any, evidence: any;
  const answers = (x: any) => ({
    [x.id + "name"]: "Fictional Test Person",
    [x.id + "age"]: "25",
    [x.id + "instagram"]: "fictional_test",
  });
  const reserve = (x: any, cookie = cookies.a, more: any = {}) =>
    api("customer/reserve", cookie, {
      eventId: x.id,
      tierId: x.id + "t",
      quantity: 1,
      answers: answers(x),
      idempotencyKey: randomUUID(),
      ...more,
    });
  const upload = async (
    bookingId: string,
    cookie = cookies.a,
    bytes: Buffer = png,
    type = "image/png",
    kind = "PAYMENT",
  ) => {
    const form = new FormData();
    form.set("bookingId", bookingId);
    form.set("kind", kind);
    form.set("file", new Blob([new Uint8Array(bytes)], { type }), "proof.png");
    return fetch(base + "/api/customer/upload", {
      method: "POST",
      headers: { Origin: base, Cookie: cookie },
      body: form,
    });
  };
  const review = (body: any, cookie = cookies.org) =>
    api("customer/review", cookie, {
      bookingId: booking.id,
      notes: "Explicit fictional local review only",
      ...body,
    });
  try {
    await t.test(
      "sales modes remain independent and disabled denies every sale",
      () => {
        assert(!salesModeAllows("disabled", "PUBLIC", true));
        assert(salesModeAllows("invite_only", "INVITATION_ONLY", true));
        assert(!salesModeAllows("invite_only", "PUBLIC", true));
        assert(!salesModeAllows("invite_only", "PRIVATE", false));
        assert(salesModeAllows("approved_events", "PUBLIC", false));
        assert(!salesModeAllows("approved_events", "PRIVATE", false));
      },
    );
    await t.test(
      "anonymous and unrelated customer cannot view a guessed private event",
      async () => {
        assert.equal((await api("customer/event/" + e.id, null)).status, 401);
        assert.equal(
          (await api("customer/event/" + e.id, cookies.a)).status,
          404,
        );
      },
    );
    await t.test(
      "identity-bound login returns to the intended event without exposing discovery",
      async () => {
        invite = await createInvitation(org.id, {
          eventId: e.id,
          inviteeId: a.id,
          expiresAt: new Date(Date.now() + 3600000),
        });
        const wrong = await api("customer/login", null, {
          email: b.email,
          password,
          context: { slug: e.slug, token: invite.token },
        });
        assert.equal(wrong.status, 404);
        const valid = await api("customer/login", null, {
          email: a.email,
          password,
          context: { slug: e.slug, token: invite.token },
        });
        assert.equal(valid.status, 200);
        cookies.a = valid.headers.get("set-cookie")!.split(";")[0];
        const r = await api("customer/event/" + e.id, cookies.a);
        assert.equal(r.status, 200);
        const body = await r.text();
        assert(!body.includes("PRIVATE ADDRESS"));
        assert(!body.includes("recipientName"));
        assert(!body.includes("passwordHash"));
      },
    );
    await t.test(
      "private registration validates required fields, age, hidden fields and price tampering",
      async () => {
        assert.equal(
          (await reserve(e, cookies.a, { answers: {} })).status,
          400,
        );
        assert.equal(
          (
            await reserve(e, cookies.a, {
              answers: { ...answers(e), [e.id + "age"]: "17" },
            })
          ).status,
          400,
        );
        assert.equal((await reserve(e, cookies.a, { total: 0 })).status, 400);
        assert.equal(
          (
            await reserve(e, cookies.a, {
              answers: { ...answers(e), unknown: "private" },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "invalid quantities, foreign tiers and expired sales windows fail",
      async () => {
        assert.equal(
          (await reserve(e, cookies.a, { quantity: -1 })).status,
          400,
        );
        assert.equal(
          (await reserve(e, cookies.a, { quantity: 3 })).status,
          409,
        );
        assert.equal(
          (await reserve(e, cookies.a, { tierId: "unknown" })).status,
          404,
        );
        await db.eventTicketTier.update({
          where: { id: e.id + "t" },
          data: { saleEnd: new Date(Date.now() - 1000) },
        });
        assert.equal((await reserve(e)).status, 409);
        await db.eventTicketTier.update({
          where: { id: e.id + "t" },
          data: { saleEnd: null },
        });
      },
    );
    await t.test(
      "server reserves exact price and deduplicates repeated HTTP submissions",
      async () => {
        const key = randomUUID();
        const r = await reserve(e, cookies.a, { idempotencyKey: key });
        assert.equal(r.status, 200, await r.clone().text());
        booking = await db.booking.findUniqueOrThrow({
          where: { id: (await r.json()).id },
        });
        assert.equal(booking.total, 3500);
        assert.equal(booking.quantity, 1);
        assert.equal(booking.recipientVersionId, v.id);
        assert.equal(
          JSON.parse(booking.answers)[e.id + "instagram"],
          "fictional_test",
        );
        const retry = await reserve(e, cookies.a, { idempotencyKey: key });
        assert.equal((await retry.json()).id, booking.id);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
            .reservedCount,
          1,
        );
      },
    );
    await t.test(
      "pending booking, instructions and history persist and are owner-only",
      async () => {
        const r = await api("customer/booking/" + booking.id, cookies.a);
        assert.equal(r.status, 200);
        const b = await r.json();
        assert.equal(b.total, 3500);
        assert.equal(b.recipient.recipientName, "FICTIONAL OWNER");
        assert.equal(b.tickets.length, 0);
        assert(!JSON.stringify(b).includes("PRIVATE ADDRESS"));
        assert.equal(
          (await api("customer/booking/" + booking.id, cookies.b)).status,
          404,
        );
        assert.equal(
          (await api("customer/qr/" + booking.id, cookies.b)).status,
          404,
        );
        assert.equal(
          (await api("customer/qr/" + booking.id, cookies.a)).status,
          200,
        );
      },
    );
    await t.test(
      "replacing approved QR does not rewrite historical booking instructions",
      async () => {
        const newV = await submitPaymentDestination(
          org.id,
          {
            methodType: "TOUCH_N_GO",
            label: "Fictional local destination",
            recipientName: "FICTIONAL REPLACEMENT",
            qrAssetId: qr.id,
          },
          v.destinationId,
        );
        await reviewPaymentDestination(admin.id, newV.id, true, {
          procedure:
            "Checked fictional replacement sample and local owner only.",
        });
        const b = await (
          await api("customer/booking/" + booking.id, cookies.a)
        ).json();
        assert.equal(b.recipient.recipientName, "FICTIONAL OWNER");
        assert.equal(b.recipient.versionId, v.id);
        assert.equal(
          (await api("customer/qr/" + booking.id, cookies.a)).status,
          200,
        );
      },
    );
    await t.test(
      "foreign owner, disabled and pending destinations cannot create new paid reservations",
      async () => {
        await db.paymentDestination.update({
          where: { id: v.destinationId },
          data: { status: "DISABLED" },
        });
        assert.equal((await reserve(e)).status, 409);
        await db.paymentDestination.update({
          where: { id: v.destinationId },
          data: { status: "APPROVED" },
        });
        const d = await db.paymentDestination.create({
          data: {
            organizerId: foreign.id,
            methodType: "TOUCH_N_GO",
            label: "Foreign test",
            status: "APPROVED",
          },
        });
        destinations.push(d.id);
        await db.event.update({
          where: { id: e.id },
          data: { paymentDestinationId: d.id },
        });
        assert.equal((await reserve(e)).status, 409);
        await db.event.update({
          where: { id: e.id },
          data: { paymentDestinationId: v.destinationId },
        });
      },
    );
    await t.test(
      "hostile origin, spoofed image, MIME mismatch and over-10MB evidence are denied",
      async () => {
        assert.equal(
          (
            await fetch(base + "/api/customer/cancel", {
              method: "POST",
              headers: {
                Cookie: cookies.a,
                Origin: "https://hostile.invalid",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ bookingId: booking.id }),
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await upload(
              booking.id,
              cookies.a,
              Buffer.from("<html>fake</html>"),
            )
          ).status,
          400,
        );
        assert.equal(
          (await upload(booking.id, cookies.a, png, "image/jpeg")).status,
          400,
        );
        assert.equal(
          (await upload(booking.id, cookies.a, Buffer.alloc(10000001))).status,
          413,
        );
      },
    );
    await t.test(
      "valid evidence stays private and receipt alone never confirms money or admission",
      async () => {
        const r = await upload(booking.id);
        assert.equal(r.status, 200, await r.clone().text());
        evidence = await db.paymentEvidence.findFirstOrThrow({
          where: {
            paymentId: (
              await db.payment.findUniqueOrThrow({
                where: { bookingId: booking.id },
              })
            ).id,
          },
        });
        const b = await db.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: { tickets: true },
        });
        assert.equal(b.paymentState, "PROOF_SUBMITTED");
        assert.equal(b.reviewHold, true);
        assert.equal(b.tickets.length, 0);
        const file = await db.fileUpload.findUniqueOrThrow({
          where: { id: evidence.receiptUploadId },
        });
        assert(file.private);
      },
    );
    await t.test(
      "customer and finance reviewers alone access payment evidence",
      async () => {
        assert.equal(
          (await api("customer/evidence/" + evidence.id, cookies.a)).status,
          200,
        );
        assert.equal(
          (await api("customer/evidence/" + evidence.id, cookies.org)).status,
          200,
        );
        assert.equal(
          (await api("customer/evidence/" + evidence.id, cookies.b)).status,
          403,
        );
        assert.equal(
          (await api("customer/evidence/" + evidence.id, cookies.foreign))
            .status,
          403,
        );
        await setEventStaff(org.id, {
          eventId: e.id,
          userId: scanner.id,
          active: true,
          canCheckIn: true,
          canViewGuests: true,
        });
        cookies.scanner = await login(scanner);
        assert.equal(
          (await api("customer/evidence/" + evidence.id, cookies.scanner))
            .status,
          403,
        );
      },
    );
    await t.test(
      "submitted-on-time proof holds stock through the original reservation deadline",
      async () => {
        await db.booking.update({
          where: { id: booking.id },
          data: { reservationExpiresAt: new Date(Date.now() - 1000) },
        });
        await assert.rejects(expireReservation(org.id, booking.id), /409/);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: e.id } }))
            .reservedCount,
          1,
        );
      },
    );
    await t.test(
      "customer, scanner and unrelated organizer cannot confirm incoming funds",
      async () => {
        const body = {
          kind: "PAYMENT",
          evidenceId: evidence.id,
          decision: "CONFIRMED",
          fundsVerified: true,
          receivedAmount: 3500,
          recipientVersionId: booking.recipientVersionId,
        };
        for (const cookie of [cookies.a, cookies.scanner, cookies.foreign])
          assert.equal((await review(body, cookie)).status, 403);
      },
    );
    await t.test(
      "wrong amount, recipient and missing independent check reject confirmation",
      async () => {
        for (const patch of [
          { receivedAmount: 1 },
          { recipientVersionId: "wrong" },
          { fundsVerified: false },
        ]) {
          const r = await review({
            kind: "PAYMENT",
            evidenceId: evidence.id,
            decision: "CONFIRMED",
            fundsVerified: true,
            receivedAmount: 3500,
            recipientVersionId: booking.recipientVersionId,
            ...patch,
          });
          assert([400, 409].includes(r.status));
        }
        assert.equal(
          await db.ticket.count({ where: { bookingId: booking.id } }),
          0,
        );
      },
    );
    await t.test(
      "rejection permits a private correction without deleting prior submissions",
      async () => {
        assert.equal(
          (
            await review({
              kind: "PAYMENT",
              evidenceId: evidence.id,
              decision: "REJECTED",
              recipientVersionId: booking.recipientVersionId,
            })
          ).status,
          200,
        );
        const r = await upload(
          booking.id,
          cookies.a,
          Buffer.concat([png, Buffer.from("corrected")]),
        );
        assert.equal(r.status, 200, await r.clone().text());
        assert.equal(
          await db.paymentEvidence.count({
            where: { paymentId: evidence.paymentId },
          }),
          2,
        );
        evidence = await db.paymentEvidence.findFirstOrThrow({
          where: { paymentId: evidence.paymentId },
          orderBy: { createdAt: "desc" },
        });
      },
    );
    await t.test(
      "confirmed funds remain separate from registration and duplicate review is idempotent",
      async () => {
        const body = {
          kind: "PAYMENT",
          evidenceId: evidence.id,
          decision: "CONFIRMED",
          fundsVerified: true,
          receivedAmount: 3500,
          recipientVersionId: booking.recipientVersionId,
        };
        assert.equal((await review(body)).status, 200);
        assert.equal((await review(body)).status, 200);
        const b = await db.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: { tickets: true, payment: { include: { reviews: true } } },
        });
        assert.equal(b.paymentState, "CONFIRMED");
        assert.equal(b.registrationState, "PENDING");
        assert.equal(b.tickets.length, 0);
        const confirmations = b.payment!.reviews.filter(
          (v) => v.decision === "CONFIRMED",
        );
        assert.equal(confirmations.length, 1);
        assert.equal(confirmations[0].receivedAmount, 3500);
        assert.equal(
          confirmations[0].recipientVersionId,
          booking.recipientVersionId,
        );
      },
    );
    await t.test(
      "registration approval issues exactly one TEST ticket and notification",
      async () => {
        assert.equal(
          (await review({ kind: "REGISTRATION", approve: true })).status,
          200,
        );
        assert.equal(
          (await review({ kind: "REGISTRATION", approve: true })).status,
          200,
        );
        const tickets = await db.ticket.findMany({
          where: { bookingId: booking.id },
        });
        assert.equal(tickets.length, 1);
        assert(tickets[0].testOnly);
        assert.equal(
          await db.notification.count({
            where: { userId: a.id, dedupeKey: "tickets:" + booking.id },
          }),
          1,
        );
      },
    );
    await t.test(
      "only ticket owner sees admission QR, venue releases only after eligibility",
      async () => {
        const ticket = await db.ticket.findFirstOrThrow({
          where: { bookingId: booking.id },
        });
        assert.equal(
          (await api("customer/ticket/" + ticket.id, cookies.b)).status,
          404,
        );
        const r = await api("customer/ticket/" + ticket.id, cookies.a);
        assert.equal(r.status, 200);
        const data = await r.json();
        assert(data.qr.startsWith("data:image/png"));
        assert.equal(data.holder, "Fictional Test Person");
        const exported = await api(
          "customer/ticket-export/" + ticket.id,
          cookies.a,
        );
        assert.equal(exported.status, 200);
        assert(
          exported.headers.get("content-disposition")?.includes("attachment"),
        );
        const privateSvg = await exported.text();
        assert(privateSvg.includes('id="entry-qr"'));
        assert(privateSvg.includes("Fictional Test Person"));
        const shared = await (
          await api(
            "customer/ticket-export/" + ticket.id + "?share=1",
            cookies.a,
          )
        ).text();
        assert(!shared.includes('id="entry-qr"'));
        assert(!shared.includes("PRIVATE ADDRESS"));
        assert(!shared.includes("Fictional Test Person"));
        assert(!shared.includes(ticket.token));
        assert.equal(
          (await api("customer/ticket-export/" + ticket.id, cookies.b)).status,
          404,
        );
        assert.equal(data.event.venue, "PRIVATE ADDRESS MUST NOT LEAK");
        const b = await (
          await api("customer/booking/" + booking.id, cookies.a)
        ).json();
        assert.equal(b.event.venue, "PRIVATE ADDRESS MUST NOT LEAK");
      },
    );
    await t.test(
      "wrong-event, revoked and duplicate QR checks do not create extra attendance",
      async () => {
        const ticket = await db.ticket.findFirstOrThrow({
          where: { bookingId: booking.id },
        });
        const other = await event();
        await assert.rejects(checkIn(org.id, other.id, ticket.token), /404/);
        const results = await Promise.allSettled([
          checkIn(scanner.id, e.id, ticket.token),
          checkIn(scanner.id, e.id, ticket.token, "MANUAL"),
        ]);
        assert.equal(results.filter((v) => v.status === "fulfilled").length, 1);
        assert.equal(
          await db.attendanceRecord.count({
            where: { userId: a.id, eventId: e.id },
          }),
          1,
        );
      },
    );
    await t.test(
      "booking history and essential in-app updates are private and persisted",
      async () => {
        const rows = await (await api("customer/bookings", cookies.a)).json();
        assert(
          rows.some(
            (b: any) => b.id === booking.id && b.lifecycle === "CONFIRMED",
          ),
        );
        const messages = await (
          await api("customer/notifications", cookies.a)
        ).json();
        assert(
          messages.some(
            (n: any) => n.title === "Payment instructions available",
          ),
        );
        assert(messages.some((n: any) => n.title === "Your ticket is ready"));
        assert.equal(
          (await api("customer/reviews", cookies.foreign)).status,
          200,
        );
        const queue = await (
          await api("customer/reviews", cookies.foreign)
        ).json();
        assert(!JSON.stringify(queue).includes(booking.id));
      },
    );
    await t.test(
      "concurrent final-seat customer requests cannot oversell",
      async () => {
        const x = await event({
          access: "PUBLIC",
          capacity: 1,
          tiers: {
            create: {
              id: prefix + "last",
              name: "Last seat",
              quantity: 1,
              price: 0,
              minPerOrder: 1,
              maxPerOrder: 1,
            },
          },
          approvalRequired: false,
          fields: { create: [] },
        });
        const requests = await Promise.all([
          reserve(x, cookies.a, { tierId: prefix + "last", answers: {} }),
          reserve(x, cookies.b, { tierId: prefix + "last", answers: {} }),
        ]);
        assert.equal(requests.filter((r) => r.status === 200).length, 1);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: x.id } }))
            .reservedCount,
          1,
        );
      },
    );
    await t.test(
      "expired unpaid reservation releases exactly once and rejects late proof",
      async () => {
        const x = await event({ access: "PUBLIC" });
        const r = await reserve(x);
        const b = await db.booking.findUniqueOrThrow({
          where: { id: (await r.json()).id },
        });
        await db.booking.update({
          where: { id: b.id },
          data: { reservationExpiresAt: new Date(Date.now() - 1000) },
        });
        assert.equal((await upload(b.id)).status, 409);
        await expireReservation(org.id, b.id);
        await expireReservation(org.id, b.id);
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: x.id } }))
            .reservedCount,
          0,
        );
        await assert.rejects(issueTickets(org.id, b.id), /409/);
      },
    );
    await t.test(
      "free RSVP needs no payment and configured BYOB remains an independent gate",
      async () => {
        const x = await event({
          access: "PUBLIC",
          approvalRequired: false,
          tiers: {
            create: {
              id: prefix + "free",
              name: "Free RSVP",
              price: 0,
              quantity: 10,
              maxPerOrder: 1,
            },
          },
          fields: { create: [] },
        });
        const free = await reserve(x, cookies.a, {
          tierId: prefix + "free",
          answers: {},
        });
        assert.equal(free.status, 200);
        const id = (await free.json()).id;
        assert.equal(await db.ticket.count({ where: { bookingId: id } }), 1);
        const y = await event({
          access: "PUBLIC",
          approvalRequired: false,
          entryOptions: JSON.stringify([
            { key: "byob", label: "Test BYOB", price: 0, relationship: "BYOB" },
          ]),
          fields: { create: [] },
        });
        const r = await reserve(y, cookies.a, {
          answers: {},
          entryKey: "byob",
        });
        assert.equal(r.status, 200);
        const byobBooking = (await r.json()).id;
        assert.equal(
          await db.ticket.count({ where: { bookingId: byobBooking } }),
          0,
        );
        const ev = await upload(
          byobBooking,
          cookies.a,
          Buffer.concat([png, Buffer.from("byob")]),
          "image/png",
          "BYOB",
        );
        assert.equal(ev.status, 200);
        const evidence = await db.paymentEvidence.findFirstOrThrow({
          where: { payment: { bookingId: byobBooking } },
        });
        assert.equal(
          (
            await api("customer/review", cookies.org, {
              bookingId: byobBooking,
              kind: "BYOB",
              evidenceId: evidence.id,
              approve: true,
              notes: "Fictional bottle proof checked",
            })
          ).status,
          200,
        );
        assert.equal(
          await db.ticket.count({ where: { bookingId: byobBooking } }),
          1,
        );
      },
    );
    await t.test(
      "cancelled and suspended events reject new checkout; revoked tickets have no active QR",
      async () => {
        const x = await event({ access: "PUBLIC" });
        await updateEventLifecycle(admin.id, x.id, "SUSPENDED");
        assert.equal((await reserve(x)).status, 404);
        await updateEventLifecycle(admin.id, x.id, "CANCELLED");
        assert.equal((await reserve(x)).status, 404);
        const y = await event({
          access: "PUBLIC",
          approvalRequired: false,
          fields: { create: [] },
          tiers: {
            create: {
              id: prefix + "revoke",
              name: "Free",
              price: 0,
              quantity: 10,
            },
          },
        });
        const r = await reserve(y, cookies.a, {
          tierId: prefix + "revoke",
          answers: {},
        });
        const id = (await r.json()).id;
        const ticket = await db.ticket.findFirstOrThrow({
          where: { bookingId: id },
        });
        await revokeTicket(org.id, ticket.id);
        const data = await (
          await api("customer/ticket/" + ticket.id, cookies.a)
        ).json();
        assert.equal(data.qr, "");
        await assert.rejects(checkIn(org.id, y.id, ticket.token), /400/);
      },
    );

    await t.test(
      "confirmed funds survive an issuance failure and retry never requests payment twice",
      async () => {
        const x = await event({ access: "PUBLIC" });
        const r = await reserve(x);
        const id = (await r.json()).id;
        const proof = await upload(
          id,
          cookies.a,
          Buffer.concat([png, Buffer.from("issuance-failure")]),
        );
        assert.equal(proof.status, 200);
        const b = await db.booking.findUniqueOrThrow({ where: { id } }),
          ev = await db.paymentEvidence.findFirstOrThrow({
            where: { payment: { bookingId: id } },
          });
        assert.equal(
          (
            await api("customer/review", cookies.org, {
              bookingId: id,
              kind: "REGISTRATION",
              approve: true,
              notes: "Fictional registration checked",
            })
          ).status,
          200,
        );
        const trigger = prefix + "_issuance_failure";
        await db.$executeRawUnsafe(
          `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "Ticket" WHEN NEW."bookingId" = '${id}' BEGIN SELECT RAISE(ABORT, 'fictional issuance failure'); END`,
        );
        try {
          const response = await api("customer/review", cookies.org, {
            bookingId: id,
            kind: "PAYMENT",
            evidenceId: ev.id,
            decision: "CONFIRMED",
            fundsVerified: true,
            receivedAmount: 3500,
            recipientVersionId: b.recipientVersionId,
            notes: "Fictional funds independently checked",
          });
          assert.equal(response.status, 200);
          assert.equal(
            (await db.booking.findUniqueOrThrow({ where: { id } }))
              .paymentState,
            "CONFIRMED",
          );
          assert.equal(await db.ticket.count({ where: { bookingId: id } }), 0);
        } finally {
          await db.$executeRawUnsafe(`DROP TRIGGER "${trigger}"`);
        }
        assert.equal(
          (
            await api("customer/review", cookies.org, {
              bookingId: id,
              kind: "RETRY",
              notes: "Retry after fictional issuance recovery",
            })
          ).status,
          200,
        );
        assert.equal(await db.ticket.count({ where: { bookingId: id } }), 1);
        assert.equal(
          await db.paymentReview.count({
            where: { paymentId: ev.paymentId, decision: "CONFIRMED" },
          }),
          1,
        );
      },
    );
    await t.test(
      "customer evidence above the organizer QR limit is accepted privately below 10 MB",
      async () => {
        const x = await event({ access: "PUBLIC" });
        const r = await reserve(x, cookies.b);
        const id = (await r.json()).id;
        const image = Buffer.concat([png, Buffer.alloc(4500000, 7)]);
        const response = await upload(id, cookies.b, image);
        assert.equal(response.status, 200, await response.clone().text());
        const evidence = await db.paymentEvidence.findFirstOrThrow({
          where: { payment: { bookingId: id } },
          include: { receiptUpload: true },
        });
        assert(evidence.receiptUpload.private);
        assert.equal(evidence.receiptUpload.data!.length, image.length);
      },
    );
    await t.test(
      "saved booking and history login continuity retains owner scope after session rotation",
      async () => {
        const response = await api("customer/login", null, {
          email: a.email,
          password,
          context: { bookingId: booking.id },
        });
        assert.equal(response.status, 200);
        cookies.a = response.headers.get("set-cookie")!.split(";")[0];
        assert.equal(
          (await api("customer/booking/" + booking.id, cookies.a)).status,
          200,
        );
        const history = await api("customer/login", null, {
          email: a.email,
          password,
          context: { history: true },
        });
        assert.equal(history.status, 200);
        cookies.a = history.headers.get("set-cookie")!.split(";")[0];
        assert.equal((await api("customer/bookings", cookies.a)).status, 200);
      },
    );

    await t.test(
      "all configured registration types validate server-side, including private files and conditions",
      async () => {
        const key = prefix + "e" + eids.length;
        const definitions = [
          ["short", "text", ""],
          ["long", "textarea", ""],
          ["email", "email", ""],
          ["phone", "tel", ""],
          ["number", "number", ""],
          ["dropdown", "select", "One,Two"],
          ["choice", "radio", "Yes,No"],
          ["checks", "checkbox", "A,B"],
          ["file", "file", ""],
          ["consent", "consent", ""],
        ].map(([name, type, options]) => ({
          id: key + name,
          label: name,
          type,
          options,
          required: true,
        }));
        const x = await event({
          access: "PUBLIC",
          fields: {
            create: [
              ...definitions,
              {
                id: key + "hidden",
                label: "Internal hidden",
                type: "text",
                hidden: true,
                required: false,
              },
              {
                id: key + "conditional",
                label: "BYOB only",
                type: "text",
                condition: "byob",
                required: true,
              },
            ],
          },
        });
        const form = new FormData();
        form.set("eventId", x.id);
        form.set("fieldId", key + "file");
        form.set(
          "file",
          new Blob([new Uint8Array(png)], { type: "image/png" }),
          "private.png",
        );
        const uploaded = await fetch(base + "/api/customer/upload", {
          method: "POST",
          headers: { Origin: base, Cookie: cookies.a },
          body: form,
        });
        assert.equal(uploaded.status, 200);
        const file = (await uploaded.json()).id;
        const values: any = {
          [key + "short"]: "Fictional",
          [key + "long"]: "Fictional longer answer",
          [key + "email"]: "test@example.test",
          [key + "phone"]: "+60123456789",
          [key + "number"]: "22",
          [key + "dropdown"]: "One",
          [key + "choice"]: "Yes",
          [key + "checks"]: ["A"],
          [key + "file"]: file,
          [key + "consent"]: true,
        };
        for (const patch of [
          { [key + "short"]: "   " },
          { [key + "email"]: "invalid" },
          { [key + "phone"]: "letters" },
          { [key + "dropdown"]: "Foreign" },
          { [key + "checks"]: ["Unknown"] },
          { [key + "consent"]: false },
          { [key + "hidden"]: "Injected" },
          { [key + "conditional"]: "Injected" },
        ])
          assert.equal(
            (await reserve(x, cookies.a, { answers: { ...values, ...patch } }))
              .status,
            400,
          );
        assert.equal(
          (await reserve(x, cookies.b, { answers: values })).status,
          400,
        );
        const saved = await reserve(x, cookies.a, { answers: values });
        assert.equal(saved.status, 200, await saved.clone().text());
        const row = await db.booking.findUniqueOrThrow({
          where: { id: (await saved.json()).id },
        });
        assert.deepEqual(JSON.parse(row.answers)[key + "checks"], ["A"]);
        assert.equal(JSON.parse(row.answers)[key + "file"], file);
      },
    );
    await t.test(
      "new adult account registration stays on an approved public event and cannot claim private invitations",
      async () => {
        const x = await event({ access: "PUBLIC" });
        const fields = {
          name: "Fictional New Attendee",
          username: prefix + "_new",
          email: prefix + "new@example.test",
          password,
          dob: "1998-01-01",
          city: "Test",
        };
        const response = await api("customer/register", null, {
          ...fields,
          context: { slug: x.slug },
        });
        assert.equal(response.status, 200, await response.clone().text());
        const cookie = response.headers.get("set-cookie")!.split(";")[0];
        const me = await (await api("customer/me", cookie)).json();
        uids.push(me.id);
        assert.equal(
          (await api("customer/event/" + x.slug, cookie)).status,
          200,
        );
        assert.equal(
          (await api("customer/event/" + e.slug, cookie)).status,
          404,
        );
        assert.equal(
          (
            await api("customer/register", null, {
              ...fields,
              email: prefix + "other@example.test",
              username: prefix + "_other",
              context: { slug: e.slug, token: invite.token },
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "actual Halloween draft remains unresolved and never becomes bookable",
      async () => {
        const h = await db.event.findUniqueOrThrow({
          where: { id: "halloween" },
        });
        assert.equal(h.status, "DRAFT");
        assert.equal(h.configurationStatus, "UNCONFIRMED");
        assert.equal(
          (await api("customer/event/halloween", cookies.a)).status,
          404,
        );
      },
    );
  } finally {
    const bs = await db.booking.findMany({
        where: { eventId: { in: eids } },
        select: { id: true },
      }),
      bids = bs.map((b) => b.id);
    const payments = await db.payment.findMany({
        where: { bookingId: { in: bids } },
        select: { id: true },
      }),
      pids = payments.map((p) => p.id);
    await db.attendanceRecord.deleteMany({ where: { eventId: { in: eids } } });
    await db.ticketCheckIn.deleteMany({
      where: { ticket: { bookingId: { in: bids } } },
    });
    await db.ticket.deleteMany({ where: { bookingId: { in: bids } } });
    await db.paymentReview.deleteMany({ where: { paymentId: { in: pids } } });
    await db.paymentEvidence.deleteMany({ where: { paymentId: { in: pids } } });
    await db.refund.deleteMany({ where: { paymentId: { in: pids } } });
    await db.payment.deleteMany({ where: { id: { in: pids } } });
    await db.commissionEntry.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.booking.deleteMany({ where: { id: { in: bids } } });
    await db.invitationGrant.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventInvitation.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventStaff.deleteMany({ where: { eventId: { in: eids } } });
    await db.eventRegistrationField.deleteMany({
      where: { eventId: { in: eids } },
    });
    await db.eventTicketTier.deleteMany({ where: { eventId: { in: eids } } });
    await db.event.deleteMany({ where: { id: { in: eids } } });
    await db.paymentDestination.updateMany({
      where: { id: { in: destinations } },
      data: { activeVersionId: null },
    });
    await db.paymentRecipientVersion.deleteMany({
      where: { destinationId: { in: destinations } },
    });
    await db.paymentDestination.deleteMany({
      where: { id: { in: destinations } },
    });
    await db.fileUpload.deleteMany({ where: { userId: { in: uids } } });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: uids } } });
    await db.notification.deleteMany({ where: { userId: { in: uids } } });
    await db.userBadge.deleteMany({ where: { userId: { in: uids } } });
    await db.user.deleteMany({ where: { id: { in: uids } } });
    await db.$disconnect();
  }
});
