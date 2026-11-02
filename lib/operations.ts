import { flagRefundCommission } from "./ticket-commission";
import { simulatorEvent, SIMULATOR_PROVIDER } from "./simulator-policy";
import { refundEligibility } from "./event-operations";
import { recordOperationalFailure } from "./operational-jobs";
import { z } from "zod";
import { db } from "./db";
import {
  actor,
  audit,
  eventPermission,
  notify,
  transaction,
} from "./domain-core";
import { releaseInventory } from "./booking-domain";
import { consumeRateLimit } from "./security";
const id = z.string().min(1).max(191);
const note = z.string().trim().min(5).max(191);
const preferences = z
  .object({
    eventReminders: z.boolean(),
    promotionalNotifications: z.boolean(),
    socialNotifications: z.boolean(),
    organizerAnnouncements: z.boolean(),
  })
  .strict();
const preferenceSelect = {
  eventReminders: true,
  promotionalNotifications: true,
  socialNotifications: true,
  organizerAnnouncements: true,
} as const;
export async function operationsOverview(
  userId: string,
  query = new URLSearchParams(),
  context: { customer?: boolean } = {},
) {
  const u = await actor(db, userId),
    admin = !context.customer && u.role === "ADMIN";
  const own = { event: { organizerId: u.id } };
  const manager =
    !context.customer &&
    (admin ||
      u.role === "ORGANIZER" ||
      u.capabilities.some((c) => c.capability === "ORGANIZER"));
  const bookingScope = admin ? {} : manager ? own : { userId: u.id };
  const eventScope = admin ? {} : { organizerId: u.id };
  const page = Math.max(
    0,
    Math.min(100000, Math.floor(Number(query.get("page"))) || 0),
  );
  const search = (query.get("q") || "").slice(0, 80);
  const reports = await db.report.findMany({
    where: admin ? {} : { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const refunds = await db.refund.findMany({
    where: {
      requestKey: { not: null },
      payment: {
        booking: bookingScope,
        provider: {
          in: [
            "ORGANIZER_DIRECT",
            ...(process.env.NODE_ENV === "development"
              ? [SIMULATOR_PROVIDER]
              : []),
          ],
        },
      },
    },
    include: {
      payment: {
        select: {
          provider: true,
          booking: {
            select: {
              id: true,
              userId: true,
              eventId: true,
              event: { select: { title: true } },
              user: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const refundHistory = await db.adminAuditLog.findMany({
    where: { entityType: "REFUND", targetId: { in: refunds.map((r) => r.id) } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const notices = (
    await db.notification.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  ).map((n) => ({ ...n, link: n.link.replace(/^\/booking\//, "/bookings/") }));
  const unread = await db.notification.count({
    where: { userId: u.id, read: false },
  });
  const prefs = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: preferenceSelect,
  });
  if (!manager)
    return {
      reports,
      refunds,
      refundHistory,
      notices,
      unread,
      preferences: prefs,
    };
  const events = await db.event.findMany({
    where: eventScope,
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      reviewOutcome: true,
      tiers: { select: { id: true, name: true, sold: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const [
    pendingRegistrations,
    pendingPayments,
    confirmedBookings,
    issued,
    arrived,
    confirmedAmount,
    rejectedPayments,
    pendingRefunds,
    bookings,
  ] = await Promise.all([
    db.booking.count({
      where: {
        ...bookingScope,
        registrationState: "PENDING",
        lifecycle: { in: ["RESERVED", "PENDING"] },
      },
    }),
    db.payment.count({
      where: {
        booking: bookingScope,
        workflowState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] },
      },
    }),
    db.booking.count({ where: { ...bookingScope, lifecycle: "CONFIRMED" } }),
    db.ticket.count({ where: { booking: bookingScope } }),
    db.ticketCheckIn.count({ where: { ticket: { booking: bookingScope } } }),
    db.payment.aggregate({
      where: {
        booking: bookingScope,
        provider: "ORGANIZER_DIRECT",
        confirmedAt: { not: null },
      },
      _sum: { amount: true },
    }),
    db.payment.count({
      where: { booking: bookingScope, workflowState: "REJECTED" },
    }),
    db.payment.count({
      where: { booking: bookingScope, workflowState: "REFUND_PENDING" },
    }),
    db.booking.findMany({
      where: bookingScope,
      select: {
        id: true,
        quantity: true,
        total: true,
        lifecycle: true,
        registrationState: true,
        paymentState: true,
        createdAt: true,
        user: { select: { name: true } },
        event: { select: { id: true, title: true } },
        tier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const tierSales = await db.booking.groupBy({
    by: ["tierId"],
    where: { ...bookingScope, lifecycle: "CONFIRMED" },
    _sum: { quantity: true },
  });
  const pendingAmount = await db.payment.aggregate({
    where: {
      booking: bookingScope,
      provider: "ORGANIZER_DIRECT",
      workflowState: {
        in: ["AWAITING_PAYMENT", "PROOF_SUBMITTED", "UNDER_REVIEW"],
      },
    },
    _sum: { amount: true },
  });
  const metrics: Record<string, number> = {
    "Total events": events.length,
    "Upcoming events": events.filter(
      (e) => e.status === "PUBLISHED" && e.startsAt > new Date(),
    ).length,
    "Published events": events.filter((e) => e.status === "PUBLISHED").length,
    "Draft events": events.filter((e) => e.status === "DRAFT").length,
    "Events awaiting review": events.filter(
      (e) => e.status === "PENDING_REVIEW",
    ).length,
    "Pending registrations": pendingRegistrations,
    "Pending payment reviews": pendingPayments,
    "Confirmed bookings": confirmedBookings,
    "Issued tickets": issued,
    "Checked-in attendees": arrived,
    "Confirmed ticket quantity": tierSales.reduce(
      (s, r) => s + (r._sum.quantity || 0),
      0,
    ),
  };
  const users = admin
    ? await db.user.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { username: { contains: search } },
              ],
            }
          : {},
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          active: true,
          verification: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: page * 50,
      })
    : [];
  const logs = await db.adminAuditLog.findMany({
    where: {
      ...(!admin
        ? {
            eventId: { in: events.map((e) => e.id) },
            entityType: { not: "REPORT" },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search } },
              { targetId: { contains: search } },
              { userId: { contains: search } },
              { eventId: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: page * 50,
  });
  if (admin)
    Object.assign(metrics, {
      "Registered accounts": await db.user.count(),
      "Active accounts": await db.user.count({ where: { active: true } }),
      Organizers: await db.user.count({
        where: {
          OR: [
            { role: "ORGANIZER" },
            {
              capabilities: { some: { capability: "ORGANIZER", active: true } },
            },
          ],
        },
      }),
      "Organizer verifications waiting": await db.organizerVerification.count({
        where: { status: "PENDING_REVIEW" },
      }),
      "Suspended events": await db.event.count({
        where: { status: "SUSPENDED" },
      }),
      "Payment QR reviews waiting": await db.paymentRecipientVersion.count({
        where: { status: "PENDING_REVIEW" },
      }),
      "All bookings": await db.booking.count(),
      "Open support cases": await db.report.count({
        where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      }),
    });
  return {
    metrics,
    events: events.map((e) => ({
      ...e,
      tiers: e.tiers.map((t) => ({
        ...t,
        confirmed: tierSales.find((s) => s.tierId === t.id)?._sum.quantity || 0,
      })),
    })),
    bookings,
    users,
    logs,
    reports,
    refunds,
    refundHistory,
    notices,
    unread,
    preferences: prefs,
    finance: {
      confirmedDirect: confirmedAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      pendingPayments,
      rejectedPayments,
      pendingRefunds,
      platformRevenue: null,
    },
    delivery: { channel: "IN_APP", externalEmail: "NOT_CONFIGURED" },
    page,
  };
}
export async function requestRefund(userId: string, input: unknown) {
  const d = z.object({ bookingId: id, reason: note, amount: z.number().int().positive().optional(), requestKey: z.string().uuid().optional() }).strict().parse(input);
  return transaction(async (tx) => {
    await actor(tx, userId);
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
      include: { payment: true, event: true },
    });
    if (b.userId !== userId)
      throw Error("403:Only the booking owner can request a refund.");
    if (b.payment) {
      const existing = await tx.refund.findUnique({
        where: { requestKey: d.requestKey ? `${b.payment.id}:${d.requestKey}` : b.payment.id },
      });
      if (existing) {
        if (d.amount !== undefined && existing.amount !== d.amount) throw Error("409:Refund retry amount changed.");
        return existing;
      }
    }
    if (
      !b.payment ||
      (b.payment.provider !== "ORGANIZER_DIRECT" &&
        !(
          b.payment.provider === SIMULATOR_PROVIDER && simulatorEvent(b.event)
        )) ||
      !b.payment.confirmedAt ||
      !["CONFIRMED", "REFUND_PENDING", "PARTIALLY_REFUNDED"].includes(b.paymentState)
    )
      throw Error(
        "409:No confirmed organizer-direct payment is eligible for refund review.",
      );
    const eligibility = await refundEligibility(tx, b);
    if (!eligibility.allowed) throw Error("409:" + eligibility.reason);
    const prior = await tx.refund.findUnique({
      where: { requestKey: d.requestKey ? `${b.payment.id}:${d.requestKey}` : b.payment.id },
    });
    if (prior) return prior;
    const priorRefunds = await tx.refund.findMany({ where: { paymentId: b.payment.id, status: { not: "REJECTED" } } });
    const committed = priorRefunds.reduce((n,r)=>n+r.amount,0);
    const amount = d.amount ?? b.payment.amount - committed;
    if (amount <= 0 || amount + committed > b.payment.amount) throw Error("400:Refund exceeds the unrefunded confirmed payment.");
    const r = await tx.refund.create({
      data: {
        paymentId: b.payment.id,
        requestKey: d.requestKey ? `${b.payment.id}:${d.requestKey}` : b.payment.id,
        amount,
        status: "REQUESTED",
        reason: d.reason,
      },
    });
    await audit(tx, userId, "REFUND_REQUESTED", r.id, {
      entityType: "REFUND",
      eventId: b.eventId,
      newState: r.status,
    });
    await notify(
      tx,
      b.event.organizerId,
      "refund-request:" + r.id,
      "Refund review requested",
      "A customer requested a refund. No money has been transferred.",
      "/organizer?tab=Refunds",
    );
    await notify(
      tx,
      userId,
      "refund-request-customer:" + r.id,
      "Refund request received",
      "Your organizer will review your request. No refund is confirmed.",
      "/my-bookings",
    );
    return r;
  });
}
export async function reviewRefund(userId: string, input: unknown) {
  const d = z
    .object({
      id,
      version: z.number().int().nonnegative(),
      status: z.enum([
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "AWAITING_ORGANIZER_TRANSFER",
        "TRANSFER_REPORTED",
        "REFUND_CONFIRMED",
      ]),
      notes: note,
      transferReference: z.string().trim().min(10).max(191).optional(),
      received: z.boolean().optional(),
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    const u = await actor(tx, userId);
    const r = await tx.refund.findUniqueOrThrow({
        where: { id: d.id },
        include: { payment: { include: { booking: true } } },
      }),
      b = r.payment.booking;
    if (r.payment.provider === SIMULATOR_PROVIDER)
      throw Error(
        "409:Use the test refund simulator in the booking. No bank transfer can be reported for simulated funds.",
      );
    const customer = d.status === "REFUND_CONFIRMED";
    if (customer) {
      if (
        u.id !== b.userId ||
        d.received !== true ||
        u.id === r.transferredById
      )
        throw Error(
          "403:The customer must independently confirm receipt of the reported transfer.",
        );
    } else {
      await eventPermission(tx, userId, b.eventId, "payments");
      if (u.id === b.userId)
        throw Error("403:Independent refund review required.");
    }
    const transitions: Record<string, string[]> = {
      REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
      UNDER_REVIEW: ["APPROVED", "REJECTED"],
      APPROVED: ["AWAITING_ORGANIZER_TRANSFER"],
      AWAITING_ORGANIZER_TRANSFER: ["TRANSFER_REPORTED"],
      TRANSFER_REPORTED: ["REFUND_CONFIRMED"],
      REJECTED: [],
      REFUND_CONFIRMED: [],
    };
    if (r.version !== d.version || !transitions[r.status]?.includes(d.status))
      throw Error(
        "409:Refund changed or this transition is unavailable. Refresh the request.",
      );
    if (d.status === "TRANSFER_REPORTED" && !d.transferReference)
      throw Error(
        "400:A transfer evidence reference is required. Do not include bank account details.",
      );
    if (d.status === "APPROVED") {
      const eligible = await refundEligibility(tx, { id: b.id });
      if (!eligible.allowed) throw Error("409:" + eligible.reason);
      if (eligible.adminException && u.role !== "ADMIN")
        throw Error(
          "403:This policy requires administrator exception review. A label cannot settle legal rights.",
        );
      if (!["CANCELLED", "EXPIRED"].includes(b.lifecycle)) {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            lifecycle: "CANCELLED",
            status: "CANCELLED",
            registrationState: "CANCELLED",
            paymentState: "REFUND_PENDING",
            paymentStatus: "REFUND_PENDING",
            version: { increment: 1 },
          },
        });
        await releaseInventory(tx, b);
        await tx.ticket.updateMany({
          where: { bookingId: b.id, status: "ACTIVE" },
          data: { status: "REVOKED" },
        });
      } else
        await tx.booking.update({
          where: { id: b.id },
          data: {
            paymentState: "REFUND_PENDING",
            paymentStatus: "REFUND_PENDING",
            version: { increment: 1 },
          },
        });
      await tx.payment.update({
        where: { id: r.paymentId },
        data: { workflowState: "REFUND_PENDING", status: "REFUND_PENDING" },
      });
    }
    if (customer) {
      await flagRefundCommission(tx, b.id, r.id, r.amount);
      const already = await tx.refund.aggregate({where:{paymentId:r.paymentId,status:"REFUND_CONFIRMED"},_sum:{amount:true}});
      const state = (already._sum.amount || 0) + r.amount === r.payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await tx.payment.update({
        where: { id: r.paymentId },
        data: { workflowState: state, status: state },
      });
      await tx.booking.update({
        where: { id: b.id },
        data: {
          paymentState: state,
          paymentStatus: state,
          version: { increment: 1 },
        },
      });
    }
    const fresh = await tx.refund.update({
      where: { id: r.id },
      data: {
        status: d.status,
        decisionNotes: d.notes,
        updatedAt: new Date(),
        version: { increment: 1 },
        ...(customer ? { confirmedById: u.id } : { reviewedById: u.id }),
        ...(d.status === "TRANSFER_REPORTED"
          ? { transferReference: d.transferReference, transferredById: u.id }
          : {}),
      },
    });
    await audit(tx, u.id, "REFUND_" + d.status, r.id, {
      entityType: "REFUND",
      eventId: b.eventId,
      previousState: r.status,
      newState: d.status,
      reasonCode: d.notes,
    });
    await notify(
      tx,
      b.userId,
      `refund:${r.id}:${fresh.version}`,
      "Refund request updated",
      `Status: ${d.status.toLowerCase().replaceAll("_", " ")}. ${customer ? "You confirmed receipt." : "Organizer-direct transfers are handled separately."}`,
      "/my-bookings",
    );
    if (customer) {
      const event = await tx.event.findUniqueOrThrow({
        where: { id: b.eventId },
      });
      await notify(
        tx,
        event.organizerId,
        "refund-receipt:" + r.id,
        "Refund receipt acknowledged",
        "The booking owner attested receipt. This is not independent bank verification.",
        "/organizer?tab=Refunds",
      );
    }
    return fresh;
  });
}
export async function supportRequest(userId: string, input: unknown) {
  const d = z
    .object({
      category: z.enum([
        "PAYMENT",
        "TICKET",
        "BOOKING",
        "CANCELLATION",
        "MISLEADING_EVENT",
        "SUSPICIOUS_ORGANIZER",
        "SAFETY",
        "ACCOUNT",
        "OTHER",
      ]),
      description: z.string().trim().min(10).max(2000),
      bookingId: id.optional(),
      eventId: id.optional(),
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    await actor(tx, userId);
    let eventId = d.eventId;
    if (d.bookingId) {
      const b = await tx.booking.findUniqueOrThrow({
        where: { id: d.bookingId },
      });
      if (b.userId !== userId)
        throw Error("403:Only your own booking can be linked.");
      if (eventId && eventId !== b.eventId)
        throw Error("400:Booking and event do not match.");
      eventId = b.eventId;
    }
    if (eventId) {
      const e = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (
        e.access !== "PUBLIC" &&
        e.organizerId !== userId &&
        !(await tx.booking.findFirst({ where: { eventId, userId } }))
      )
        throw Error("404:Event unavailable.");
    }
    const r = await tx.report.create({
      data: {
        userId,
        category: d.category,
        reason: d.description,
        targetId: eventId || userId,
        eventId,
        bookingId: d.bookingId,
      },
    });
    await audit(tx, userId, "SUPPORT_OPENED", r.id, {
      entityType: "REPORT",
      eventId,
      newState: "OPEN",
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN", active: true },
      select: { id: true },
    });
    for (const a of admins)
      await notify(
        tx,
        a.id,
        "support:" + r.id + ":" + a.id,
        "Support case needs review",
        "A private customer support case is waiting.",
        "/admin?tab=Support",
      );
    if (
      eventId &&
      ["TICKET", "BOOKING", "CANCELLATION", "PAYMENT"].includes(d.category)
    ) {
      const e = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      await notify(
        tx,
        e.organizerId,
        "support-owner:" + r.id,
        "Event support issue received",
        "An event-related service issue is with administrators. Private reporter details remain restricted.",
        "/organizer?tab=Event%20operations&event=" + eventId,
      );
    }
    // Reports stay with administrators; an accused organizer cannot read the reporter's private complaint.
    return r;
  });
}
export async function reviewSupport(userId: string, input: unknown) {
  const d = z
    .object({
      id,
      version: z.number().int().nonnegative(),
      status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
      response: note,
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    const u = await actor(tx, userId);
    if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
    const r = await tx.report.findUniqueOrThrow({ where: { id: d.id } });
    if (r.version !== d.version || !["OPEN", "UNDER_REVIEW"].includes(r.status))
      throw Error("409:Support case changed or closed.");
    const result = await tx.report.update({
      where: { id: r.id },
      data: {
        status: d.status,
        response: d.response,
        assignedToId: u.id,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await audit(tx, u.id, "SUPPORT_" + d.status, r.id, {
      entityType: "REPORT",
      eventId: r.eventId || undefined,
      previousState: r.status,
      newState: d.status,
      reasonCode: d.response,
    });
    await notify(
      tx,
      r.userId,
      `support:${r.id}:${result.version}`,
      "Support case updated",
      "Your private support case has a response.",
      "/my-bookings",
    );
    return result;
  });
}
export async function operationsPost(
  userId: string,
  path: string,
  input: unknown,
) {
  await consumeRateLimit("operations:" + path, userId, 40, 60000);
  if (path === "refund-request") return requestRefund(userId, input);
  if (path === "refund-review") {
    try {
      return await reviewRefund(userId, input);
    } catch (e) {
      await recordOperationalFailure(
        userId,
        "REFUND_TRANSITION_REJECTED",
        typeof (input as any)?.id === "string" ? (input as any).id : "unknown",
      ).catch(() => {});
      throw e;
    }
  }
  if (path === "support-request") return supportRequest(userId, input);
  if (path === "support-review") return reviewSupport(userId, input);
  if (path === "preferences")
    return transaction(async (tx) => {
      await actor(tx, userId);
      const d = preferences.parse(input);
      await tx.user.update({ where: { id: userId }, data: d });
      await audit(tx, userId, "NOTIFICATION_PREFERENCES_UPDATED", userId, {
        entityType: "USER",
      });
      return d;
    });
  if (path === "notice") {
    const d = z.object({ id, read: z.boolean() }).strict().parse(input);
    await actor(db, userId);
    await db.notification.updateMany({
      where: { id: d.id, userId },
      data: { read: d.read },
    });
    return { ok: true };
  }
  throw Error("404:Not found.");
}
