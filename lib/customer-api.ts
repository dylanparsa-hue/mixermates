import { ticketPricing, pricingKey } from "./ticket-pricing";
import { entrySelection } from "./registration";
import { reconciliation, financialExport } from "./reconciliation";
import { listPage, guestList } from "./guest-list";
import { paymentRiskView } from "./payment-risk";
import { customerEventChanges, refundEligibility } from "./event-operations";
import { operationsOverview, operationsPost } from "./operations";
import { bookedHolder } from "./registration";
import { ticketExport } from "./ticket-export";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "./db";
import { currentUser, createSession } from "./auth";
import {
  actor,
  audit,
  eventPermission,
  transaction,
  notify,
} from "./domain-core";
import {
  assertCustomerEnvironment,
  assertEventSalesMode,
  customerEventReady,
} from "./customer-policy";
import {
  validEventGrant,
  redeemInvitation,
  createInvitation,
} from "./invitations";
import { consumeRateLimit, emailInput, registrationInput } from "./security";
import { ageOn } from "./rules";
import {
  reserveBooking,
  approveRegistration,
  cancelBooking,
  issueTickets,
  eligibility,
} from "./booking-domain";
import {
  reviewPayment,
  submitPaymentEvidence,
  reviewByobEvidence,
} from "./payment-foundation";
import { canSeePrivateLocation } from "./event-access";
import { boundedBody } from "./request-security";
import { validateImage } from "./image-security";
import { infrastructureFailure } from "./api-failure";
const include = {
  feeSnapshot: true,
  event: {
    include: {
      organizer: { select: { id: true, name: true, verification: true } },
    },
  },
  tier: true,
  user: { select: { id: true, name: true, active: true, dob: true } },
  recipientVersion: true,
  payment: {
    include: {
      evidence: { orderBy: { createdAt: "desc" as const } },
      reviews: { orderBy: { createdAt: "desc" as const } },
      simulationAttempts: { orderBy: { createdAt: "desc" as const } },
      refunds: { orderBy: { createdAt: "desc" as const } },
    },
  },
  tickets: { select: { id: true, status: true, testOnly: true } },
} as const;
const id = z.string().min(1).max(191);
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const json = (value: any) => NextResponse.json(value, { headers });
async function eventFor(slug: string) {
  return db.event.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      organizer: { select: { id: true, name: true, verification: true } },
      tiers: { orderBy: { sortOrder: "asc" } },
      fields: true,
      paymentDestination: { include: { activeVersion: true } },
    },
  });
}
async function authorizedEvent(slug: string, user: any, existing = false) {
  const e = await eventFor(slug);
  if (!e || !user) throw Error("404:This event is unavailable.");
  const grant = await validEventGrant(db, user.id, e.id);
  const booking = existing
    ? await db.booking.findFirst({ where: { userId: user.id, eventId: e.id } })
    : null;
  if (
    (!customerEventReady(e) && !booking) ||
    (e.access !== "PUBLIC" && !grant && !booking)
  )
    throw Error("404:This invitation is unavailable or has expired.");
  if (!booking) assertEventSalesMode(e.access, !!grant);
  return e;
}
async function eventView(e: any, u: any) {
  const location = await canSeePrivateLocation(e, u);
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    image: e.image.startsWith("/images/")
      ? e.image
      : `/api/customer/artwork/${e.id}`,
    shortDescription: e.shortDescription,
    description: e.description,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    timezone: e.timezone,
    entryInstructions: location ? e.entryInstructions : "",
    city: e.city,
    venue: location
      ? e.privateVenue || e.venue
      : e.access === "PUBLIC" && e.locationVisibility === "PUBLIC"
        ? e.venue
        : "Location shared with confirmed guests",
    organizer: e.organizer.name,
    category: e.category,
    genre: e.genre,
    theme: e.theme,
    age: e.age,
    access: e.access,
    policies: e.policies,
    approvalRequired: e.approvalRequired,
    idCheckRequired: e.idCheckRequired,
    entryOptions: JSON.parse(e.entryOptions || "[]"),
    fields: e.fields
      .filter((f: any) => !f.hidden)
      .map((f: any) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options,
        condition: f.condition,
      })),
    tiers: e.tiers
      .filter((t: any) => t.availability === "AVAILABLE")
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        price: t.price - t.discount,
        originalPrice: t.price,
        discount: t.discount,
        available: Math.max(0, t.quantity - t.sold),
        availability: t.availability,
        minPerOrder: t.minPerOrder,
        maxPerOrder: t.maxPerOrder,
        saleStart: t.saleStart,
        saleEnd: t.saleEnd,
      })),
    platformFeePolicy: e.platformFeePolicy,
    paymentMode: e.paymentMode,
    simulator:
      e.paymentMode === "TEST_SIMULATOR" &&
      (await import("./simulator-policy")).simulatorEvent(e),
    testOnly: e.testOnly,
  };
}
async function ownedBooking(bookingId: string, user: any) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include });
  if (!b || b.userId !== user.id) throw Error("404:Booking unavailable.");
  return b;
}
async function bookingView(b: any, u: any) {
  const e = await eventFor(b.eventId);
  const snapshot = b.recipientSnapshot ? JSON.parse(b.recipientSnapshot) : null;
  const history = await db.adminAuditLog.findMany({
    where: {
      eventId: b.eventId,
      OR: [
        { targetId: b.id },
        { targetId: b.payment?.id || "NONE" },
        { targetId: { in: b.payment?.evidence.map((v: any) => v.id) || [] } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { action: true, createdAt: true, newState: true, reasonCode: true },
  });
  return {
    id: b.id,
    reference: b.id,
    quantity: b.quantity,
    total: b.total,
    feeSnapshot: b.feeSnapshot || null,
    entryPath: b.entryPath,
    lifecycle: b.lifecycle,
    paymentState: b.paymentState,
    registrationState: b.registrationState,
    byobState: b.byobState,
    byobRequired: b.byobRequired,
    paymentRequired: b.paymentRequired,
    reviewHold: b.reviewHold,
    expiresAt: b.reservationExpiresAt,
    createdAt: b.createdAt,
    answers: JSON.parse(b.answers || "{}"),
    tier: { name: b.tier.name },
    event: await eventView(e, u),
    recipient: snapshot
      ? {
          recipientName: snapshot.recipientName,
          recipientReference: snapshot.recipientReference,
          instructions: snapshot.instructions || "",
          methodType: snapshot.methodType,
          versionId: snapshot.versionId,
        }
      : null,
    simulator:
      b.payment?.provider === "LOCAL_TEST_SIMULATOR" &&
      (await import("./simulator-policy")).simulatorEvent(e),
    simulationAttempts: b.payment?.simulationAttempts || [],
    refunds: b.payment?.refunds || [],
    sampleReceiptEnabled:
      (await import("./simulator-policy")).simulatorEnvironment() &&
      b.testOnly &&
      b.payment?.provider === "ORGANIZER_DIRECT",
    qrUrl:
      b.paymentRequired && b.payment?.provider !== "LOCAL_TEST_SIMULATOR"
        ? `/api/customer/qr/${b.id}`
        : null,
    evidence:
      b.payment?.evidence.map((v: any) => ({
        id: v.id,
        kind: v.kind,
        status: v.status,
        createdAt: v.createdAt,
        url: `/api/customer/evidence/${v.id}`,
      })) || [],
    reviews:
      b.payment?.reviews.map((v: any) => ({
        decision: v.decision,
        notes: v.notes,
        createdAt: v.createdAt,
        receivedAmount: v.receivedAmount,
      })) || [],
    changes: await customerEventChanges(
      b,
      e ? await canSeePrivateLocation(e, u) : false,
    ),
    refundEligibility: await refundEligibility(db, b),
    originalTerms: {
      startsAt: JSON.parse(b.eventTermsSnapshot || "{}").startsAt,
      endsAt: JSON.parse(b.eventTermsSnapshot || "{}").endsAt,
    },
    history,
    tickets: b.tickets,
    testOnly: b.testOnly,
  };
}
export async function reviewQueue(
  user: any,
  eventId?: string,
  pageRaw?: unknown,
  qrPending = false,
) {
  const events = await db.event.findMany({
    where: {
      ...(eventId ? { id: eventId } : {}),
      ...(user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { organizerId: user.id },
              {
                staff: {
                  some: {
                    userId: user.id,
                    active: true,
                    OR: [
                      { canReviewPayments: true },
                      { canApproveRegistrations: true },
                      { canViewGuests: true },
                    ],
                  },
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      title: true,
      capacity: true,
      reservedCount: true,
      organizerId: true,
      tiers: { select: { quantity: true, sold: true } },
    },
  });
  const result = [];
  for (const event of events) {
    let finance = false,
      registration = false,
      guests = false;
    try {
      await eventPermission(db, user.id, event.id, "payments");
      finance = true;
    } catch {}
    try {
      await eventPermission(db, user.id, event.id, "registrations");
      registration = true;
    } catch {}
    try {
      await eventPermission(db, user.id, event.id, "guests");
      guests = true;
    } catch {}
    const total = await db.booking.count({
      where: {
        eventId: event.id,
        origin: "REAL",
        ...(qrPending ? { payment: { provider: "ORGANIZER_DIRECT" }, paymentState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] } } : {}),
        ...(!finance && !registration ? { lifecycle: "CONFIRMED" } : {}),
      },
    });
    const pages = Math.max(1, Math.ceil(total / 50)),
      page = Math.min(listPage(pageRaw), pages);
    const questions = registration
      ? await db.eventRegistrationField.findMany({
          where: { eventId: event.id },
          select: { id: true, label: true, type: true },
        })
      : [];
    const rows = await db.booking.findMany({
      where: {
        eventId: event.id,
        origin: "REAL",
        ...(qrPending ? { payment: { provider: "ORGANIZER_DIRECT" }, paymentState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] } } : {}),
        ...(!finance && !registration ? { lifecycle: "CONFIRMED" } : {}),
      },
      include,
      take: 50,
      skip: (page - 1) * 50,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const bookings = await Promise.all(
      rows.map(async (b) => ({
        id: b.id,
        reference: b.id,
        name: b.user.name,
        quantity: b.quantity,
        total: finance ? b.total : null,
        tier: b.tier.name,
        lifecycle: b.lifecycle,
        paymentState: finance ? b.paymentState : null,
        paymentProvider: finance ? b.payment?.provider : null,
        registrationState: b.registrationState,
        byobState: b.byobState,
        byobRequired: b.byobRequired,
        reviewHold: b.reviewHold,
        testOnly: b.testOnly,
        createdAt: b.createdAt,
        recipient:
          finance && b.recipientSnapshot
            ? JSON.parse(b.recipientSnapshot)
            : null,
        answers: registration ? JSON.parse(b.answers) : {},
        questions,
        evidence:
          b.payment?.evidence
            .filter((v) => (v.kind === "PAYMENT" ? finance : registration))
            .map((v) => ({
              id: v.id,
              kind: v.kind,
              status: v.status,
              createdAt: v.createdAt,
              url: `/api/customer/evidence/${v.id}`,
            })) || [],
        reviews: finance
          ? b.payment?.reviews.map((v) => ({
              id: v.id,
              decision: v.decision,
              notes: v.notes,
              createdAt: v.createdAt,
              receivedAmount: v.receivedAmount,
              reviewerId: v.reviewerId,
            }))
          : [],
        tickets: b.tickets,
      })),
    );
    result.push({
      ...event,
      manage: event.organizerId === user.id || user.role === "ADMIN",
      finance,
      registration,
      guests,
      bookings,
      total,
      page,
      pages,
      metrics: {
        pending: await db.booking.count({
          where: {
            eventId: event.id,
            origin: "REAL",
            lifecycle: { in: ["RESERVED", "PENDING"] },
          },
        }),
        proofSubmitted: finance
          ? await db.booking.count({
              where: {
                eventId: event.id,
                origin: "REAL",
                paymentState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] },
              },
            })
          : null,
        confirmedFunds: finance
          ? (
              await db.payment.aggregate({
                where: {
                  booking: { eventId: event.id, origin: "REAL" },
                  confirmedAt: { not: null },
                  reviews: {
                    some: { decision: "CONFIRMED", fundsVerified: true },
                  },
                },
                _sum: { amount: true },
              })
            )._sum.amount || 0
          : null,
        confirmed: await db.booking.count({
          where: { eventId: event.id, origin: "REAL", lifecycle: "CONFIRMED" },
        }),
        tickets: await db.ticket.count({
          where: { booking: { eventId: event.id, origin: "REAL" } },
        }),
        checkedIn: await db.ticket.count({
          where: {
            booking: { eventId: event.id, origin: "REAL" },
            status: "CHECKED_IN",
          },
        }),
        available: Math.max(0, event.capacity - event.reservedCount),
      },
    });
  }
  return result;
}
export function evidenceLimit() {
  const value = Number(process.env.EVIDENCE_MAX_BYTES || 10000000);
  return Number.isSafeInteger(value) && value >= 1000 && value <= 10000000
    ? value
    : 10000000;
}
export function imageMime(bytes: Buffer) {
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    bytes.length >= 16 &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
async function customerHandle(req: NextRequest) {
  if (process.env.MIXERMATES_TEST_LAB === "enabled") {
    if (process.env.NODE_ENV !== "development") throw Error("404:Not found.");
    await (await import("./test-lab")).labContext(req);
  }
  const p = req.nextUrl.pathname.replace("/api/customer/", "");
  const user = await currentUser();
  if (req.method === "POST") {
    const origin = req.headers.get("origin");
    if (
      !origin ||
      ![req.nextUrl.origin, process.env.APP_ORIGIN].includes(origin)
    )
      throw Error("403:A same-origin request is required.");
  }
  if (p.startsWith("simulator/")) {
    const sim = await import("./payment-simulator");
    await sim.assertSimulator(db, req);
    if (!user || req.method !== "POST") throw Error("404:Not found.");
    await consumeRateLimit("local-simulator", user.id, 120, 60000);
    const data = JSON.parse((await boundedBody(req, 10000)).toString());
    if (p === "simulator/payment")
      return json(await sim.simulatePayment(user.id, data));
    if (p === "simulator/refund")
      return json(await sim.simulateRefund(user.id, data));
    if (p === "simulator/receipt")
      return json(await sim.sampleReceipt(user.id, id.parse(data.bookingId)));
    if (p === "simulator/scenarios")
      return json(
        await (
          await import("./simulator-fixtures")
        ).freshSimulatorScenarios(user.id),
      );
    throw Error("404:Not found.");
  }
  const auth = ["login", "register"].includes(p);
  if (auth) {
    assertCustomerEnvironment();
    if (req.method !== "POST") throw Error("404:Not found.");
    const data = JSON.parse((await boundedBody(req, 20000)).toString());
    const context = z
      .object({
        slug: id.optional(),
        bookingId: id.optional(),
        history: z.boolean().optional(),
        token: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .refine(
        (v) => !!v.slug || !!v.bookingId || v.history === true,
        "Open an event invitation or saved booking.",
      )
      .parse(data.context);
    const existingBooking = context.bookingId
      ? await db.booking.findUnique({
          where: { id: context.bookingId },
          select: { userId: true, eventId: true },
        })
      : null;
    const e = await eventFor(
      context.slug || existingBooking?.eventId || "unavailable",
    );
    if (!customerEventReady(e) && !existingBooking && !context.history)
      throw Error("404:Event entry unavailable.");
    const email = emailInput.parse(data.email);
    await consumeRateLimit("customer-auth", email, 20);
    await consumeRateLimit(
      "customer-auth-ip",
      req.headers.get("x-forwarded-for") || "local",
      30,
    );
    let u;
    if (p === "login") {
      const existing = await db.user.findUnique({ where: { email } });
      const matched = await compare(
        z.string().min(1).max(128).parse(data.password),
        existing?.passwordHash ||
          "$2b$12$N.1Hr.Yw3oZfB9b0FXgCxO0FLZpAk.MzOTqZfe0bJ69oNbJ7yYh6W",
      );
      if (!matched || !existing?.active)
        throw Error("401:Email or password is incorrect.");
      u = existing;
    } else {
      if (!e || context.history || e.access !== "PUBLIC")
        throw Error(
          "403:Use the existing account named in your private invitation.",
        );
      const { context: _, ...fields } = data;
      const d = registrationInput.parse(fields);
      if (ageOn(new Date(d.dob)) < 18)
        throw Error("400:You must be at least 18 to use this booking flow.");
      const { password, ...safe } = d;
      u = await db.user.create({
        data: {
          ...safe,
          dob: new Date(d.dob),
          passwordHash: await hash(password, 12),
        },
      });
    }
    if (existingBooking && existingBooking.userId !== u.id)
      throw Error("404:Booking unavailable.");
    if (
      context.history &&
      !(await db.booking.findFirst({ where: { userId: u.id, origin: "REAL" } }))
    )
      throw Error(
        "404:Open an event invitation to start your first registration.",
      );
    if (context.token) await redeemInvitation(u.id, e!.id, context.token);
    else if (
      !existingBooking &&
      !context.history &&
      e!.access !== "PUBLIC" &&
      !(await validEventGrant(db, u.id, e!.id))
    )
      throw Error("404:Use a valid invitation for your account.");
    await createSession(u.id, u);
    return json({ ok: true });
  }
  if (!user) throw Error("401:Sign in with your event invitation to continue.");
  if (req.method === "POST")
    await consumeRateLimit(
      "customer:" + p,
      user.id,
      p === "upload" ? 20 : 60,
      60000,
    );
  // Organizer review pages remain available with sales disabled; they never open customer discovery.
  if (req.method === "POST" && p === "invite") {
    assertCustomerEnvironment();
    const data = z
      .object({ eventId: id, username: z.string().trim().min(3).max(24) })
      .strict()
      .parse(JSON.parse((await boundedBody(req, 10000)).toString()));
    const { event } = await eventPermission(
      db,
      user.id,
      data.eventId,
      "manage",
    );
    const invitee = await db.user.findUnique({
      where: { username: data.username.toLowerCase() },
      select: { id: true, active: true },
    });
    if (!invitee?.active)
      throw Error(
        "404:Ask the attendee to confirm their existing account username.",
      );
    if (
      !customerEventReady(await eventFor(event.id)) ||
      !event.invitationsEnabled
    )
      throw Error("409:This event is not ready for invitations.");
    const invitation = await createInvitation(user.id, {
      eventId: event.id,
      inviteeId: invitee.id,
      expiresAt: new Date(
        Math.min(Date.now() + 7 * 86400000, event.startsAt.getTime()),
      ),
    });
    return json({
      link: `${req.nextUrl.origin}/join/${event.slug}#invite=${invitation.token}`,
    });
  }
  if (req.method === "GET" && p.startsWith("reconciliation-export/"))
    return new NextResponse(
      await financialExport(
        user.id,
        id.parse(p.split("/")[1]),
        req.nextUrl.searchParams.get("filter") || "ALL",
      ),
      {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=financial-review.csv",
        },
      },
    );
  if (req.method === "GET" && p.startsWith("reconciliation/"))
    return json(
      await reconciliation(
        user.id,
        id.parse(p.split("/")[1]),
        Object.fromEntries(req.nextUrl.searchParams),
      ),
    );
  if (req.method === "GET" && p.startsWith("guests/"))
    return json(
      await guestList(
        user.id,
        id.parse(p.split("/")[1]),
        Object.fromEntries(req.nextUrl.searchParams),
      ),
    );
  if (req.method === "GET" && p.startsWith("risk/"))
    return json(await paymentRiskView(user.id, id.parse(p.split("/")[1])));
  if (req.method === "GET" && p === "reviews")
    return json(
      await reviewQueue(
        user,
        req.nextUrl.searchParams.get("event") || undefined,
        req.nextUrl.searchParams.get("page"),
        req.nextUrl.searchParams.get("filter") === "QR_PENDING",
      ),
    );
  if (req.method === "POST" && p === "review") {
    const d = z
      .object({
        bookingId: id,
        kind: z.enum(["PAYMENT", "REGISTRATION", "BYOB", "RETRY"]),
        approve: z.boolean().optional(),
        decision: z.enum(["UNDER_REVIEW", "CONFIRMED", "REJECTED"]).optional(),
        evidenceId: id.optional(),
        fundsVerified: z.boolean().optional(),
        receivedAmount: z.number().int().nonnegative().optional(),
        notes: z.string().trim().min(5).max(191),
        recipientVersionId: id.optional(),
      })
      .strict()
      .parse(JSON.parse((await boundedBody(req, 20000)).toString()));
    const b = await db.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
    });
    if (d.kind === "PAYMENT") {
      await eventPermission(db, user.id, b.eventId, "payments");
      if (d.recipientVersionId !== b.recipientVersionId)
        throw Error("409:The recipient does not match this booking.");
      await reviewPayment(user.id, b.id, {
        evidenceId: id.parse(d.evidenceId),
        decision: d.decision!,
        fundsVerified: d.fundsVerified,
        receivedAmount: d.receivedAmount,
        notes: d.notes,
      });
    } else if (d.kind === "REGISTRATION")
      await approveRegistration(
        user.id,
        b.id,
        z.boolean().parse(d.approve),
        d.notes,
      );
    else if (d.kind === "BYOB") {
      const ev = await db.paymentEvidence.findUniqueOrThrow({
        where: { id: id.parse(d.evidenceId) },
        include: { payment: true },
      });
      if (ev.payment.bookingId !== b.id)
        throw Error("400:Evidence does not belong to this booking.");
      await reviewByobEvidence(
        user.id,
        ev.id,
        z.boolean().parse(d.approve),
        d.notes,
      );
    } else await issueTickets(user.id, b.id);
    await transaction(async (tx) => {
      await audit(tx, user.id, "BOOKING_REVIEW_NOTE", b.id, {
        eventId: b.eventId,
        entityType: "BOOKING",
        reasonCode: d.notes,
      });
    });
    return json({ ok: true });
  }
  if (req.method === "GET" && p.startsWith("evidence/")) {
    const ev = await db.paymentEvidence.findUniqueOrThrow({
      where: { id: p.split("/")[1] },
      include: { receiptUpload: true, payment: { include: { booking: true } } },
    });
    const b = ev.payment.booking;
    if (user.id !== b.userId)
      await eventPermission(
        db,
        user.id,
        b.eventId,
        ev.kind === "PAYMENT" ? "payments" : "registrations",
      );
    return new NextResponse(new Uint8Array(ev.receiptUpload.data!), {
      headers: {
        ...headers,
        "Content-Type": ev.receiptUpload.mime!,
        "Content-Disposition": 'inline; filename="private-evidence"',
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
  if (req.method === "GET" && p.startsWith("attachment/")) {
    const f = await db.fileUpload.findUniqueOrThrow({
      where: { id: p.split("/")[1] },
    });
    if (!f.private || !f.data) throw Error("404:Attachment unavailable.");
    if (user.id !== f.userId) {
      const rows = await db.booking.findMany({
        where: { answers: { contains: f.id } },
        select: { eventId: true, answers: true },
      });
      let allowed = false;
      for (const b of rows)
        if (Object.values(JSON.parse(b.answers)).includes(f.id)) {
          try {
            await eventPermission(db, user.id, b.eventId, "registrations");
            allowed = true;
          } catch {}
        }
      if (!allowed) throw Error("403:Private attachment.");
    }
    return new NextResponse(new Uint8Array(f.data), {
      headers: {
        ...headers,
        "Content-Type": f.mime!,
        "Content-Disposition": 'inline; filename="private-attachment"',
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
  assertCustomerEnvironment();
  if (req.method === "GET" && p === "operations")
    return json(
      await operationsOverview(user.id, req.nextUrl.searchParams, {
        customer: true,
      }),
    );
  if (req.method === "POST" && p.startsWith("operations/"))
    return json(
      await operationsPost(
        user.id,
        p.slice(11),
        JSON.parse((await boundedBody(req, 20000)).toString()),
      ),
    );
  if (req.method === "GET") {
    if (p === "me")
      return json({ id: user.id, name: user.name, testOnly: true });
    if (p === "bookings") {
      const rows = await db.booking.findMany({
        where: { userId: user.id, origin: "REAL" },
        include,
        orderBy: { createdAt: "desc" },
      });
      return json(await Promise.all(rows.map((b) => bookingView(b, user))));
    }
    if (p === "notifications")
      return json(
        await db.notification.findMany({
          where: { userId: user.id },
          select: { id: true, title: true, body: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      );
    if (p.startsWith("event/"))
      return json(
        await eventView(
          await authorizedEvent(p.split("/")[1], user, true),
          user,
        ),
      );
    if (p.startsWith("booking/"))
      return json(
        await bookingView(await ownedBooking(p.split("/")[1], user), user),
      );
    if (p.startsWith("qr/")) {
      const b = await ownedBooking(p.split("/")[1], user);
      const v = b.recipientVersion;
      if (
        !b.reviewHold &&
        b.lifecycle !== "CONFIRMED" &&
        (!b.reservationExpiresAt || b.reservationExpiresAt <= new Date())
      )
        throw Error(
          "409:Reservation expired. Contact the organizer before paying.",
        );
      if (
        !v?.approvedAt ||
        v.status !== "APPROVED" ||
        v.disabledAt ||
        !["RESERVED", "PENDING", "CONFIRMED"].includes(b.lifecycle)
      )
        throw Error(
          "409:These payment instructions are unavailable. Contact the organizer; do not pay a replacement QR.",
        );
      const destination = await db.paymentDestination.findUniqueOrThrow({
        where: { id: v.destinationId },
      });
      if (destination.status !== "APPROVED")
        throw Error(
          "409:The organizer has disabled these payment instructions.",
        );
      const file = await db.fileUpload.findUniqueOrThrow({
        where: { id: v.qrAssetId },
      });
      return new NextResponse(new Uint8Array(file.data!), {
        headers: {
          ...headers,
          "Content-Type": file.mime!,
          "Content-Disposition": req.nextUrl.searchParams.has("download")
            ? 'attachment; filename="organizer-payment-qr.png"'
            : "inline",
        },
      });
    }
    if (p.startsWith("ticket-export/")) {
      const ticket = await db.ticket.findUniqueOrThrow({
        where: { id: p.split("/")[1] },
        include: { booking: { include: { ...include, user: true } } },
      });
      if (ticket.booking.userId !== user.id)
        throw Error("404:Ticket unavailable.");
      const b = ticket.booking,
        valid =
          ticket.status === "ACTIVE" &&
          !ticket.revokedAt &&
          ticket.origin === ticket.booking.origin &&
          ticket.testOnly === ticket.booking.testOnly &&
          eligibility(b, b.event, b.payment, { admission: true }).eligible;
      let artwork: Buffer | null = null,
        mime = "image/jpeg";
      if (/^\/images\/[\w-]+\.(jpg|png|webp)$/.test(b.event.image)) {
        artwork = await readFile(
          path.join(process.cwd(), "public", b.event.image),
        );
        mime = b.event.image.endsWith(".png")
          ? "image/png"
          : b.event.image.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";
      } else {
        const file = await db.fileUpload.findUnique({
          where: { path: b.event.image },
        });
        if (file?.data && !file.private) {
          artwork = Buffer.from(file.data);
          mime = file.mime || mime;
        }
      }
      const safe = req.nextUrl.searchParams.get("share") === "1",
        event = await eventView(await eventFor(b.eventId), user);
      const svg = await ticketExport(
        ticket,
        event,
        await bookedHolder(db, b, user.name),
        valid,
        safe,
        artwork,
        mime,
      );
      return new NextResponse(svg, {
        headers: {
          ...headers,
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="mixermates-${safe ? "share-preview" : "private-ticket"}-${ticket.id}.svg"`,
          "Content-Security-Policy":
            "default-src 'none'; img-src data:; sandbox",
        },
      });
    }
    if (p.startsWith("ticket/")) {
      const ticket = await db.ticket.findUniqueOrThrow({
        where: { id: p.split("/")[1] },
        include: { booking: { include: { ...include, user: true } } },
      });
      if (ticket.booking.userId !== user.id)
        throw Error("404:Ticket unavailable.");
      const b = ticket.booking;
      const valid =
        ticket.status === "ACTIVE" &&
        !ticket.revokedAt &&
        ticket.origin === ticket.booking.origin &&
        ticket.testOnly === ticket.booking.testOnly &&
        eligibility(b, b.event, b.payment, { admission: true }).eligible;
      return json({
        id: ticket.id,
        status: ticket.status,
        testOnly: ticket.testOnly,
        token: valid ? ticket.token : "",
        qr: valid
          ? await QRCode.toDataURL(ticket.token, { width: 420, margin: 2 })
          : "",
        holder: await bookedHolder(db, b, user.name),
        tier: b.tier.name,
        event: await eventView(await eventFor(b.eventId), user),
      });
    }
    if (p.startsWith("artwork/")) {
      const e = await authorizedEvent(p.split("/")[1], user, true);
      const f = await db.fileUpload.findUnique({ where: { path: e.image } });
      if (!f?.data || f.private) throw Error("404:Artwork unavailable.");
      return new NextResponse(new Uint8Array(f.data), {
        headers: { ...headers, "Content-Type": f.mime! },
      });
    }
  }
  if (req.method === "POST" && p === "upload") {
    const max = evidenceLimit(),
      bytes = await boundedBody(req, max + 100000);
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") || "" },
      body: new Uint8Array(bytes),
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > max || file.size === 0)
      throw Error(
        "413:Choose one image up to " + Math.floor(max / 1000000) + " MB.",
      );
    const content = Buffer.from(await file.arrayBuffer()),
      mime = imageMime(content);
    if (!mime || file.type !== mime)
      throw Error(
        "400:Upload a genuine PNG, JPG or WebP image. PDF files are not accepted.",
      );
    await validateImage(content, mime);
    const bookingId = form.get("bookingId"),
      eventId = form.get("eventId"),
      fieldId = form.get("fieldId");
    let booking: any;
    if (typeof bookingId === "string" && bookingId) {
      booking = await ownedBooking(bookingId, user);
      if (
        !["RESERVED", "PENDING"].includes(booking.lifecycle) ||
        (!booking.reviewHold &&
          (!booking.reservationExpiresAt ||
            booking.reservationExpiresAt <= new Date()))
      )
        throw Error(
          "409:This booking no longer accepts proof. Contact the organizer; do not pay again.",
        );
    } else {
      const event = await authorizedEvent(id.parse(eventId), user);
      if (
        !event.fields.some(
          (f: any) => f.id === fieldId && f.type === "file" && !f.hidden,
        )
      )
        throw Error("400:Choose a configured private file question.");
    }
    const saved = await db.fileUpload.create({
      data: {
        userId: user.id,
        private: true,
        mime,
        data: content,
        path: "evidence-" + randomBytes(20).toString("hex"),
      },
    });
    if (booking) {
      try {
        await submitPaymentEvidence(
          user.id,
          booking.id,
          saved.id,
          z.enum(["PAYMENT", "BYOB"]).parse(form.get("kind")),
          {
            ...(form.get("claimedAmount")
              ? { claimedAmount: Number(form.get("claimedAmount")) }
              : {}),
            ...(form.get("claimedRecipient")
              ? { claimedRecipient: String(form.get("claimedRecipient")) }
              : {}),
            ...(form.get("paymentReference")
              ? { paymentReference: String(form.get("paymentReference")) }
              : {}),
          },
        );
      } catch (e) {
        await db.fileUpload.delete({ where: { id: saved.id } });
        throw e;
      }
    }
    return json({ id: saved.id, submitted: !!booking });
  }
  const d = JSON.parse((await boundedBody(req, 50000)).toString());
  if (p === "redeem") {
    const e = await eventFor(id.parse(d.slug));
    if (!customerEventReady(e)) throw Error("404:Event unavailable.");
    await redeemInvitation(user.id, e!.id, z.string().parse(d.token));
    return json({ ok: true });
  }
  if (p === "quote") {
    const input = z.object({ eventId: id, tierId: id, quantity: z.number().int().min(1).max(10), entryKey: z.string().max(80).optional() }).strict().parse(d);
    const e = await authorizedEvent(input.eventId, user);
    const t = e.tiers.find(t => t.id === input.tierId && t.availability === "AVAILABLE");
    if (!t || input.quantity < t.minPerOrder || input.quantity > t.maxPerOrder) throw Error("409:Ticket selection unavailable.");
    const option = entrySelection(e, input.entryKey);
    const price = option?.price ?? t.price, discount = option ? 0 : t.discount;
    return json({ ...ticketPricing(price, input.quantity, e.platformFeePolicy, discount * input.quantity), pricingKey: pricingKey(e.platformFeePolicy, price, discount, input.quantity) });
  }
  if (p === "reserve") {
    const input = z
      .object({
        eventId: id,
        tierId: id,
        quantity: z.number().int().min(1).max(10),
        entryKey: z.string().max(80).optional(),
        pricingKey: z.string().max(200).optional(),
        answers: z.record(z.string(), z.unknown()),
        idempotencyKey: z.string().min(10).max(191),
      })
      .strict()
      .parse(d);
    const e = await authorizedEvent(input.eventId, user);
    if (!customerEventReady(e)) throw Error("409:Registration is unavailable.");
    const minutes = Number(process.env.RESERVATION_MINUTES || 60);
    const deadline = new Date(
      Math.min(
        Date.now() + Math.max(15, Math.min(1440, minutes || 60)) * 60000,
        e.startsAt.getTime(),
      ),
    );
    const b = await reserveBooking(user.id, { ...input, expiresAt: deadline });
    if (!b.paymentRequired && !b.approvalRequired && !b.byobRequired)
      await transaction((tx) =>
        import("./booking-domain").then((m) =>
          m.issueEligibleTickets(tx, b.id, user.id),
        ),
      );
    return json({ id: b.id, reference: b.id });
  }
  if (p === "cancel") {
    await ownedBooking(id.parse(d.bookingId), user);
    return json(await cancelBooking(user.id, d.bookingId));
  }
  throw Error("404:Not found.");
}
export async function customerRoute(req: NextRequest) {
  try {
    return await customerHandle(req);
  } catch (e: any) {
    const unavailable = infrastructureFailure(e);
    if (unavailable)
      return NextResponse.json(
        { error: unavailable.message },
        { status: unavailable.status, headers },
      );
    const m = e.message?.match(/^(\d{3}):(.*)$/);
    const status = m
      ? Number(m[1])
      : e.code === "P2025"
        ? 404
        : e.code === "P2002"
          ? 409
          : e instanceof z.ZodError || e instanceof SyntaxError
            ? 400
            : 500;
    if (status >= 500)
      console.error("Customer request failed", {
        code: typeof e?.code === "string" ? e.code : "INTERNAL_ERROR",
      });
    return NextResponse.json(
      {
        error: m
          ? m[2]
          : e instanceof z.ZodError
            ? e.issues[0]?.message
            : status === 404
              ? "Record unavailable."
              : status === 409
                ? "This request conflicts with a saved record."
                : "Unable to complete this request. Please check the details and try again.",
      },
      { status, headers },
    );
  }
}
