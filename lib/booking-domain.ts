import {
  simulatorEvent,
  simulatorPaymentConfirmed,
  SIMULATOR_PROVIDER,
} from "./simulator-policy";
import { ticketPricing, pricingKey } from "./ticket-pricing";
import { customerEventReady } from "./customer-policy";
import {
  entrySelection,
  validateRegistration,
  holderName,
} from "./registration";
import { publicationProblems } from "./event-management";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { isIsolatedDemoEnvironment } from "./site-config";
import { ageOn } from "./rules";
import {
  actor,
  audit,
  eventFence,
  eventPermission,
  isolatedTestData,
  notify,
  transaction,
  type Tx,
} from "./domain-core";
import { validEventGrant } from "./invitations";
export const bookingTransitions: Record<string, readonly string[]> = {
  DRAFT: ["RESERVED", "CANCELLED"],
  RESERVED: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"],
  PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
  EXPIRED: [],
};
export function assertBookingTransition(from: string, to: string) {
  if (from !== to && !bookingTransitions[from]?.includes(to))
    throw Error("409:Invalid booking transition.");
}
export function eligibility(
  booking: any,
  event: any,
  payment: any,
  options: { admission?: boolean; now?: Date } = {},
) {
  const now = options.now || new Date();
  if (event?.pendingChangeId)
    return {
      eligible: false,
      reason: "Event changes are awaiting review; entry is temporarily paused.",
    };
  if (
    !event ||
    booking.eventId !== event.id ||
    event.status !== "PUBLISHED" ||
    event.endsAt <= now
  )
    return { eligible: false, reason: "Event is not eligible for admission." };
  if (!booking.user?.active || ageOn(booking.user.dob, now) < event.age)
    return {
      eligible: false,
      reason: "Account or age requirement is not satisfied.",
    };
  if (booking.testOnly && !isolatedTestData())
    return {
      eligible: false,
      reason: "Test tickets cannot be used for real admission.",
    };
  if (
    event.paymentMode === "TEST_SIMULATOR" &&
    (booking.origin !== "REAL" || payment?.provider !== SIMULATOR_PROVIDER)
  )
    return {
      eligible: false,
      reason: "Simulator events require the trusted test checkout.",
    };
  if (["DEMO", "LEGACY_DEMO"].includes(booking.origin)) {
    if (
      !isIsolatedDemoEnvironment() ||
      !booking.testOnly ||
      booking.status !== "APPROVED" ||
      booking.paymentStatus !== "SUCCEEDED"
    )
      return {
        eligible: false,
        reason: "Demo records cannot authorize real admission.",
      };
    return { eligible: true, reason: "Isolated fictional demo only." };
  }
  if (
    booking.origin !== "REAL" ||
    event.origin !== "REAL" ||
    booking.testOnly !== event.testOnly ||
    !["RESERVED", "PENDING", "CONFIRMED"].includes(booking.lifecycle)
  )
    return { eligible: false, reason: "Booking is inactive." };
  if (
    booking.lifecycle !== "CONFIRMED" &&
    (!booking.inventoryHeld ||
      !booking.reservationExpiresAt ||
      (!booking.reviewHold && booking.reservationExpiresAt <= now))
  )
    return {
      eligible: false,
      reason: "Reservation is expired or unavailable.",
    };
  if (!["APPROVED", "NOT_REQUIRED"].includes(booking.registrationState))
    return { eligible: false, reason: "Registration approval is pending." };
  if (booking.byobRequired && booking.byobState !== "APPROVED")
    return {
      eligible: false,
      reason: "Required BYOB evidence is not approved.",
    };
  if (booking.paymentRequired && payment?.provider === SIMULATOR_PROVIDER) {
    if (!simulatorPaymentConfirmed(booking, event, payment))
      return {
        eligible: false,
        reason: "A trusted local simulator confirmation is required.",
      };
  } else if (booking.paymentRequired) {
    const confirmation = payment?.reviews?.some(
      (review: any) =>
        review.decision === "CONFIRMED" &&
        review.fundsVerified &&
        review.reviewerId !== booking.userId,
    );
    if (
      booking.paymentState !== "CONFIRMED" ||
      payment?.origin !== "REAL" ||
      payment.workflowState !== "CONFIRMED" ||
      payment.amount !== booking.total ||
      !payment.confirmedAt ||
      !confirmation ||
      !booking.recipientVersionId ||
      !booking.recipientSnapshot ||
      !booking.recipientVersion?.approvedAt
    )
      return {
        eligible: false,
        reason: "Independent payment confirmation is required.",
      };
    if (
      booking.evidenceRequired &&
      !payment.evidence?.some(
        (e: any) =>
          e.kind === "PAYMENT" &&
          e.status === "ACCEPTED" &&
          e.expectedAmount === booking.total &&
          e.recipientVersionId === booking.recipientVersionId,
      )
    )
      return {
        eligible: false,
        reason: "Required payment evidence is not approved.",
      };
  } else if (booking.total !== 0 || booking.paymentState !== "NOT_REQUIRED")
    return {
      eligible: false,
      reason: "Free-entry conditions are inconsistent.",
    };
  if (options.admission && booking.lifecycle !== "CONFIRMED")
    return { eligible: false, reason: "Booking is not confirmed." };
  return { eligible: true, reason: "All required conditions are satisfied." };
}
const bookingInclude = {
  event: true,
  user: true,
  recipientVersion: true,
  payment: {
    include: { reviews: true, evidence: true, simulationAttempts: true },
  },
  tickets: true,
} as const;
export async function issueEligibleTickets(
  tx: Tx,
  bookingId: string,
  actorId: string,
) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: bookingInclude,
  });
  if (booking.payment?.provider === SIMULATOR_PROVIDER)
    await (await import("./payment-simulator")).assertSimulator(tx);
  const result = eligibility(booking, booking.event, booking.payment);
  if (!result.eligible) throw Error("409:" + result.reason);
  await eventFence(tx, booking.event, true);
  if (booking.tickets.some((t) => !["ACTIVE", "CHECKED_IN"].includes(t.status)))
    throw Error("409:Previously revoked tickets cannot be reissued.");
  if (booking.tickets.length === booking.quantity) return booking.tickets;
  if (booking.tickets.length > booking.quantity)
    throw Error("409:Ticket quantity requires reconciliation.");
  for (let sequence = 0; sequence < booking.quantity; sequence++) {
    const existing = booking.tickets[sequence];
    if (existing) continue;
    await tx.ticket.create({
      data: {
        bookingId,
        sequence,
        origin: booking.origin,
        testOnly: booking.testOnly,
        issuedAt: new Date(),
        token: randomBytes(32).toString("hex"),
        status: "ACTIVE",
      },
    });
  }
  if (booking.lifecycle !== "CONFIRMED") {
    assertBookingTransition(booking.lifecycle, "CONFIRMED");
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        lifecycle: "CONFIRMED",
        status: "APPROVED",
        version: { increment: 1 },
      },
    });
  }
  await audit(tx, actorId, "TICKETS_ISSUED", bookingId, {
    eventId: booking.eventId,
    entityType: "BOOKING",
    newState: "CONFIRMED",
  });
  await notify(
    tx,
    booking.userId,
    `tickets:${bookingId}`,
    "Your ticket is ready",
    `${booking.event.title}: admission requirements are complete.`,
  );
  return tx.ticket.findMany({
    where: { bookingId },
    orderBy: { sequence: "asc" },
  });
}
export async function issueTickets(actorId: string, bookingId: string) {
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    try {
      await eventPermission(tx, actorId, b.eventId, "registrations");
    } catch {
      await eventPermission(tx, actorId, b.eventId, "payments");
    }
    return issueEligibleTickets(tx, bookingId, actorId);
  });
}
// Internal Phase 2 foundation rehearsal only. No HTTP checkout is enabled by this function.
export async function reserveBooking(
  userId: string,
  input: {
    eventId: string;
    tierId: string;
    quantity: number;
    idempotencyKey: string;
    expiresAt: Date;
    paymentRequired?: boolean;
    answers?: Record<string, unknown>;
    entryKey?: string;
    pricingKey?: string;
  },
) {
  if (!isolatedTestData())
    throw Error("503:Real ticket sales remain disabled.");
  const d = z
    .object({
      eventId: z.string().min(1).max(191),
      tierId: z.string().min(1).max(191),
      quantity: z.number().int().min(1).max(10),
      idempotencyKey: z.string().min(10).max(191),
      expiresAt: z.coerce.date(),
      paymentRequired: z.boolean().optional(),
      answers: z.record(z.string(), z.unknown()).optional(),
      entryKey: z.string().max(80).optional(),
      pricingKey: z.string().max(200).optional(),
    })
    .strict()
    .parse(input);
  if (
    d.expiresAt <= new Date() ||
    d.expiresAt.getTime() > Date.now() + 86400000
  )
    throw Error(
      "400:An explicit future reservation deadline within 24 hours is required.",
    );
  return transaction(async (tx) => {
    const user = await actor(tx, userId);
    const prior = await tx.booking.findUnique({
      where: { idempotencyKey: d.idempotencyKey },
    });
    if (prior) {
      if (
        prior.userId !== userId ||
        prior.eventId !== d.eventId ||
        prior.tierId !== d.tierId ||
        prior.quantity !== d.quantity ||
        (d.entryKey !== undefined && prior.entryPath !== d.entryKey)
      )
        throw Error("409:Idempotency key selection mismatch.");
      return prior;
    }
    const event = await tx.event.findUniqueOrThrow({
      where: { id: d.eventId },
      include: {
        organizer: true,
        tiers: true,
        paymentDestination: { include: { activeVersion: true } },
      },
    });
    if (d.answers !== undefined && !customerEventReady(event))
      throw Error("409:This event is not approved for customer registration.");
    const tier = await tx.eventTicketTier.findUniqueOrThrow({
      where: { id: d.tierId },
    });
    if (
      event.origin !== "REAL" ||
      !event.testOnly ||
      event.status !== "PUBLISHED" ||
      event.salesPaused ||
      event.startsAt <= new Date() ||
      tier.eventId !== event.id ||
      d.quantity > tier.maxPerOrder ||
      d.quantity < tier.minPerOrder ||
      tier.availability !== "AVAILABLE" ||
      (tier.saleStart && tier.saleStart > new Date()) ||
      (tier.saleEnd && tier.saleEnd < new Date())
    )
      throw Error("409:Reservation is unavailable.");
    if (ageOn(user.dob) < event.age)
      throw Error("403:Age requirement not satisfied.");
    const grant =
      event.access === "PUBLIC"
        ? null
        : await validEventGrant(tx, userId, event.id);
    if (event.access !== "PUBLIC" && !grant)
      throw Error("403:An authorized invitation is required.");
    const option =
      d.answers === undefined && d.entryKey === undefined
        ? null
        : entrySelection(event, d.entryKey);
    const answers =
      d.answers === undefined
        ? "{}"
        : await validateRegistration(tx, event, user, d.answers, d.entryKey);
    const unitPrice = option ? option.price : tier.price;
    const pricing = ticketPricing(unitPrice, d.quantity, event.platformFeePolicy, option ? 0 : tier.discount * d.quantity);
    if (d.pricingKey && d.pricingKey !== pricingKey(event.platformFeePolicy, unitPrice, option ? 0 : tier.discount, d.quantity))
      throw Error("409:Ticket pricing changed. Refresh and review the new total before booking.");
    const total = pricing.customerTotal, paymentRequired = total > 0;
    if (
      d.paymentRequired !== undefined &&
      d.paymentRequired !== paymentRequired
    )
      throw Error("400:Payment requirements are server controlled.");
    const simulated = event.paymentMode === "TEST_SIMULATOR";
    if (simulated) {
      await (await import("./payment-simulator")).assertSimulator(tx);
      if (!simulatorEvent(event)) throw Error("404:Test checkout unavailable.");
    }
    const destination = event.paymentDestination,
      version = destination?.activeVersion;
    if (
      paymentRequired &&
      !simulated &&
      (!destination ||
        destination.organizerId !== event.organizerId ||
        destination.status !== "APPROVED" ||
        !version ||
        version.destinationId !== destination.id ||
        version.status !== "APPROVED" ||
        !version.approvedAt ||
        version.disabledAt)
    )
      throw Error("409:Approved payment instructions are unavailable.");
    const eventClaim = await tx.event.updateMany({
      where: {
        id: event.id,
        status: "PUBLISHED",
        salesPaused: false,
        stateVersion: event.stateVersion,
        reservedCount: { lte: event.capacity - d.quantity },
      },
      data: {
        reservedCount: { increment: d.quantity },
        stateVersion: { increment: 1 },
      },
    });
    if (eventClaim.count !== 1)
      throw Error("409:Event capacity is unavailable.");
    const tierClaim = await tx.eventTicketTier.updateMany({
      where: { id: tier.id, sold: { lte: tier.quantity - d.quantity } },
      data: { sold: { increment: d.quantity } },
    });
    if (tierClaim.count !== 1) throw Error("409:Ticket tier is sold out.");
    const guestField = await tx.eventRegistrationField.findFirst({
      where: { eventId: event.id, label: { contains: "Full name" } },
    });
    const guestName = holderName(answers, guestField?.id, user.name);
    const booking = await tx.booking.create({
      data: {
        guestName,
        userId,
        eventId: event.id,
        tierId: tier.id,
        quantity: d.quantity,
        total,
        feeSnapshot: { create: { ...pricing, eventVersion: event.stateVersion } },
        answers,
        entryPath: option?.key || "STANDARD",
        byobRequired: option?.relationship === "BYOB",
        byobState: option?.relationship === "BYOB" ? "PENDING" : "NOT_REQUIRED",
        idempotencyKey: d.idempotencyKey,
        origin: "REAL",
        testOnly: true,
        lifecycle: "RESERVED",
        status: "PENDING_REVIEW",
        paymentStatus: paymentRequired ? "AWAITING_PAYMENT" : "NOT_REQUIRED",
        paymentState: paymentRequired ? "AWAITING_PAYMENT" : "NOT_REQUIRED",
        registrationState: event.approvalRequired ? "PENDING" : "NOT_REQUIRED",
        paymentRequired,
        approvalRequired: event.approvalRequired,
        evidenceRequired: paymentRequired && !simulated,
        eventTermsSnapshot: JSON.stringify({
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          venue: event.venue,
          privateVenue: event.privateVenue,
          termsVersion: event.termsVersion,
        }),
        refundPolicySnapshot: event.refundPolicy,
        reservationCreatedAt: new Date(),
        reservationExpiresAt: d.expiresAt,
        inventoryHeld: true,
        invitationGrantId: grant?.id,
        recipientVersionId: paymentRequired && !simulated ? version!.id : null,
        recipientSnapshot:
          paymentRequired && !simulated
            ? JSON.stringify({
                versionId: version!.id,
                destinationId: destination!.id,
                recipientName: version!.recipientName,
                recipientReference: version!.recipientReference,
                qrAssetId: version!.qrAssetId,
                methodType: destination!.methodType,
                instructions: version!.instructions,
                displayName: version!.displayName,
              })
            : null,
        payment: {
          create: {
            amount: total,
            fee: 0,
            status: paymentRequired ? "AWAITING_PAYMENT" : "NOT_REQUIRED",
            workflowState: paymentRequired
              ? "AWAITING_PAYMENT"
              : "NOT_REQUIRED",
            origin: "REAL",
            provider: simulated ? SIMULATOR_PROVIDER : "ORGANIZER_DIRECT",
          },
        },
      },
    });
    await audit(tx, userId, "RESERVATION_CREATED", booking.id, {
      eventId: event.id,
      entityType: "BOOKING",
      newState: "RESERVED",
    });
    await notify(
      tx,
      event.organizerId,
      `registration-owner:${booking.id}`,
      "New registration",
      `${event.title} has a registration awaiting its required checks.`,
    );
    if (paymentRequired)
      await notify(
        tx,
        userId,
        `instructions:${booking.id}`,
        "Payment instructions available",
        "Use the approved organizer details in your private booking. MixerMates does not hold funds.",
      );
    await notify(
      tx,
      userId,
      `reserved:${booking.id}`,
      "Registration received",
      "Your registration is reserved pending its required reviews.",
    );
    return booking;
  });
}
export async function releaseInventory(
  tx: Tx,
  b: {
    id: string;
    eventId: string;
    tierId: string;
    quantity: number;
    inventoryHeld: boolean;
  },
) {
  if (!b.inventoryHeld) return;
  const claimed = await tx.booking.updateMany({
    where: { id: b.id, inventoryHeld: true },
    data: { inventoryHeld: false, inventoryReleasedAt: new Date() },
  });
  if (!claimed.count) return;
  const event = await tx.event.updateMany({
    where: { id: b.eventId, reservedCount: { gte: b.quantity } },
    data: {
      reservedCount: { decrement: b.quantity },
      stateVersion: { increment: 1 },
    },
  });
  const tier = await tx.eventTicketTier.updateMany({
    where: { id: b.tierId, sold: { gte: b.quantity } },
    data: { sold: { decrement: b.quantity } },
  });
  if (event.count !== 1 || tier.count !== 1)
    throw Error("409:Inventory reconciliation is required.");
}
export async function cancelBooking(actorId: string, bookingId: string) {
  return transaction(async (tx) => {
    const user = await actor(tx, actorId);
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { tickets: true, event: true },
    });
    if (user.id !== b.userId)
      await eventPermission(tx, actorId, b.eventId, "registrations");
    if (b.lifecycle === "CANCELLED" || b.lifecycle === "EXPIRED") return b;
    if (b.tickets.some((t) => t.status === "CHECKED_IN"))
      throw Error(
        "409:Checked-in registrations require an explicit exception review.",
      );
    assertBookingTransition(b.lifecycle, "CANCELLED");
    const claim = await tx.booking.updateMany({
      where: { id: b.id, version: b.version },
      data: {
        lifecycle: "CANCELLED",
        status: "CANCELLED",
        registrationState: "CANCELLED",
        version: { increment: 1 },
        ...(b.paymentState === "CONFIRMED"
          ? { paymentState: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" }
          : {}),
      },
    });
    if (!claim.count) throw Error("409:Booking changed.");
    if (b.paymentState === "CONFIRMED")
      await tx.payment.updateMany({
        where: { bookingId: b.id },
        data: { workflowState: "REFUND_PENDING", status: "REFUND_PENDING" },
      });
    await tx.ticket.updateMany({
      where: { bookingId: b.id, status: { not: "CHECKED_IN" } },
      data: {
        status: "CANCELLED",
        revokedAt: new Date(),
        revocationReason: "BOOKING_CANCELLED",
      },
    });
    await releaseInventory(tx, b);
    await audit(tx, actorId, "BOOKING_CANCELLED", b.id, {
      eventId: b.eventId,
      entityType: "BOOKING",
      previousState: b.lifecycle,
      newState: "CANCELLED",
    });
    await notify(
      tx,
      b.userId,
      `cancelled:${b.id}`,
      "Registration cancelled",
      "Any organizer-direct refund requires a separate verified process.",
    );
    return tx.booking.findUniqueOrThrow({ where: { id: b.id } });
  });
}
export async function expireReservation(
  actorId: string,
  bookingId: string,
  now = new Date(),
) {
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { tickets: true },
    });
    await eventPermission(tx, actorId, b.eventId, "registrations");
    if (b.lifecycle === "EXPIRED") return b;
    if (
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      !b.reservationExpiresAt ||
      b.reservationExpiresAt > now
    )
      throw Error("409:Reservation is not eligible for expiry.");
    if (
      b.tickets.length ||
      b.reviewHold ||
      ["CONFIRMED", "REFUND_PENDING", "REFUNDED"].includes(b.paymentState)
    )
      throw Error(
        "409:Submitted evidence or confirmed funds require explicit review, not automatic expiry.",
      );
    const claim = await tx.booking.updateMany({
      where: { id: b.id, version: b.version, lifecycle: b.lifecycle },
      data: {
        lifecycle: "EXPIRED",
        status: "EXPIRED",
        version: { increment: 1 },
        ...(b.paymentState === "CONFIRMED"
          ? { paymentState: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" }
          : {}),
      },
    });
    if (!claim.count) throw Error("409:Reservation changed.");
    if (b.paymentState === "CONFIRMED")
      await tx.payment.updateMany({
        where: { bookingId: b.id },
        data: { workflowState: "REFUND_PENDING", status: "REFUND_PENDING" },
      });
    await releaseInventory(tx, b);
    await audit(tx, actorId, "RESERVATION_EXPIRED", b.id, {
      eventId: b.eventId,
      entityType: "BOOKING",
      previousState: b.lifecycle,
      newState: "EXPIRED",
    });
    await notify(
      tx,
      b.userId,
      `expired:${b.id}`,
      "Reservation expired",
      "Your temporary reservation has ended.",
    );
    return tx.booking.findUniqueOrThrow({ where: { id: b.id } });
  });
}
export async function approveRegistration(
  actorId: string,
  bookingId: string,
  approve: boolean,
  notes = "",
) {
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: bookingInclude,
    });
    await eventPermission(tx, actorId, b.eventId, "registrations");
    if (actorId === b.userId)
      throw Error("403:You cannot approve your own registration.");
    const target = approve ? "APPROVED" : "REJECTED";
    if (b.registrationState === target) return b;
    if (
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      b.registrationState !== "PENDING" ||
      !b.reservationExpiresAt ||
      (!b.reviewHold && b.reservationExpiresAt <= new Date())
    )
      throw Error("409:Registration cannot be reviewed in its current state.");
    await eventFence(tx, b.event, true);
    const result = await tx.booking.updateMany({
      where: { id: b.id, version: b.version, registrationState: "PENDING" },
      data: {
        registrationState: target,
        lifecycle: approve ? "PENDING" : "CANCELLED",
        status: approve ? "PENDING_REVIEW" : "REJECTED",
        version: { increment: 1 },
        ...(!approve && b.paymentState === "CONFIRMED"
          ? { paymentState: "REFUND_PENDING", paymentStatus: "REFUND_PENDING" }
          : {}),
      },
    });
    if (!result.count) throw Error("409:Registration changed.");
    if (!approve) {
      await releaseInventory(tx, b);
      if (b.paymentState === "CONFIRMED")
        await tx.payment.updateMany({
          where: { bookingId: b.id },
          data: { workflowState: "REFUND_PENDING", status: "REFUND_PENDING" },
        });
    }
    await audit(tx, actorId, `REGISTRATION_${target}`, b.id, {
      reasonCode: notes || undefined,
      eventId: b.eventId,
      entityType: "BOOKING",
      previousState: b.registrationState,
      newState: target,
    });
    await notify(
      tx,
      b.userId,
      `registration:${b.id}:${target}`,
      "Registration update",
      approve
        ? "Your registration was approved; other admission requirements still apply."
        : "Your registration was declined. Any payment refund requires a separate process.",
    );
    const fresh = await tx.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: bookingInclude,
    });
    if (approve && eligibility(fresh, fresh.event, fresh.payment).eligible)
      await issueEligibleTickets(tx, b.id, actorId);
    return fresh;
  });
}
export async function updateEventLifecycle(
  actorId: string,
  eventId: string,
  status: string,
  review?: { notes: string; reviewerId: string; outcome: string },
) {
  if (
    ![
      "DRAFT",
      "PENDING_REVIEW",
      "PUBLISHED",
      "SUSPENDED",
      "CANCELLED",
      "COMPLETED",
    ].includes(status)
  )
    throw Error("400:Invalid event state.");
  return transaction(async (tx) => {
    const user = await actor(tx, actorId);
    const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
    if (
      user.role !== "ADMIN" &&
      !(user.id === event.organizerId && status === "CANCELLED")
    )
      throw Error("403:Administrator access required.");
    if (event.status === status) return event;
    if (
      event.pendingChangeId &&
      !["CANCELLED", "SUSPENDED", "COMPLETED"].includes(status)
    )
      throw Error(
        "409:Resolve the pending change before moving the event lifecycle.",
      );
    const allowed: Record<string, string[]> = {
      DRAFT: ["PENDING_REVIEW", "CANCELLED"],
      PENDING_REVIEW: ["PUBLISHED", "DRAFT", "CANCELLED"],
      PUBLISHED: ["SUSPENDED", "CANCELLED", "COMPLETED"],
      SUSPENDED: ["PUBLISHED", "CANCELLED"],
      CANCELLED: [],
      COMPLETED: [],
    };
    if (!allowed[event.status]?.includes(status))
      throw Error("409:Invalid event lifecycle transition.");
    if (status === "PUBLISHED" && event.creationKey) {
      const issues = await publicationProblems(tx, event);
      if (issues.length) throw Error("409:" + issues.join(" "));
    }
    if (event.id === "halloween" && status === "PUBLISHED")
      throw Error("409:Halloween configuration remains unconfirmed.");
    // Free organizer entitlement; moderation and paid-readiness checks above remain authoritative.
    await tx.event.update({
      where: { id: eventId },
      data: {
        status,
        ...(["CANCELLED", "SUSPENDED", "COMPLETED"].includes(status)
          ? { pendingChangeId: null }
          : {}),
        stateVersion: { increment: 1 },
        ...(review
          ? {
              reviewNotes: review.notes,
              reviewedAt: new Date(),
              reviewedById: review.reviewerId,
              reviewOutcome: review.outcome,
            }
          : {}),
        ...(["CANCELLED", "SUSPENDED", "COMPLETED"].includes(status)
          ? { salesPaused: true }
          : { salesPaused: false }),
      },
    });
    if (["CANCELLED", "SUSPENDED", "COMPLETED"].includes(status))
      await tx.eventChange.updateMany({
        where: { eventId, status: "PENDING_REVIEW" },
        data: {
          status: "INVALIDATED",
          reviewerId: actorId,
          reviewedAt: new Date(),
          reviewNotes: "Event lifecycle changed; the request cannot apply.",
        },
      });
    await audit(tx, actorId, "EVENT_STATE_CHANGED", eventId, {
      eventId,
      entityType: "EVENT",
      previousState: event.status,
      newState: status,
    });
    if (review)
      await notify(
        tx,
        event.organizerId,
        `event-reviewed:${eventId}:${event.stateVersion}`,
        "Event review update",
        review.notes ||
          "Your publication review was completed. Ticket sales remain disabled.",
      );
    if (status === "CANCELLED") {
      const bookings = await tx.booking.findMany({
        where: {
          eventId,
          lifecycle: { in: ["RESERVED", "PENDING", "CONFIRMED"] },
        },
      });
      for (const b of bookings) {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            lifecycle: "CANCELLED",
            status: "CANCELLED",
            registrationState: "CANCELLED",
            version: { increment: 1 },
            ...(b.paymentState === "CONFIRMED"
              ? {
                  paymentState: "REFUND_PENDING",
                  paymentStatus: "REFUND_PENDING",
                }
              : {}),
          },
        });
        await releaseInventory(tx, b);
        if (b.paymentState === "CONFIRMED")
          await tx.payment.updateMany({
            where: { bookingId: b.id },
            data: { workflowState: "REFUND_PENDING", status: "REFUND_PENDING" },
          });
        await notify(
          tx,
          b.userId,
          `event-cancel:${b.id}`,
          "Event cancelled",
          "The organizer must separately review any refund due.",
        );
      }
      await tx.ticket.updateMany({
        where: {
          booking: { eventId },
          status: { in: ["ACTIVE", "PENDING_ISSUANCE"] },
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revocationReason: "EVENT_CANCELLED",
        },
      });
    }
    return tx.event.findUniqueOrThrow({ where: { id: eventId } });
  });
}
export async function revokeTicket(actorId: string, ticketId: string) {
  return transaction(async (tx) => {
    const t = await tx.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: { booking: true },
    });
    await eventPermission(tx, actorId, t.booking.eventId, "registrations");
    if (t.status === "REVOKED") return t;
    if (t.status === "CHECKED_IN")
      throw Error(
        "409:Attendance history requires explicit exception handling.",
      );
    const result = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revocationReason: "AUTHORIZED_REVOCATION",
      },
    });
    await audit(tx, actorId, "TICKET_REVOKED", ticketId, {
      eventId: t.booking.eventId,
      entityType: "TICKET",
      previousState: t.status,
      newState: "REVOKED",
    });
    await notify(
      tx,
      t.booking.userId,
      `revoke:${t.id}`,
      "Ticket revoked",
      "Contact your organizer about the admission decision.",
    );
    return result;
  });
}
