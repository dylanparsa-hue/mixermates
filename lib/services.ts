import { bookedHolder } from "./registration";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { assertLocalDemoMutation } from "./site-config";
import { ageOn, feeFor } from "./rules";
import { audit, eventFence, eventPermission, transaction } from "./domain-core";
import {
  eligibility,
  issueEligibleTickets,
  releaseInventory,
} from "./booking-domain";
import { validEventGrant } from "./invitations";
export async function book(
  userId: string,
  input: {
    eventId: string;
    tierId: string;
    quantity: number;
    answers: Record<string, string>;
    idempotencyKey: string;
    paymentOutcome?: string;
    receiptPath?: string;
  },
) {
  assertLocalDemoMutation();
  return transaction(async (tx) => {
    const prior = await tx.booking.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (prior) {
      if (prior.userId !== userId) throw new Error("403:Invalid booking key.");
      if (
        prior.eventId !== input.eventId ||
        prior.tierId !== input.tierId ||
        prior.quantity !== input.quantity
      )
        throw new Error(
          "409:This booking key was already used for another selection.",
        );
      return prior;
    }
    const [user, event, tier] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId } }),
      tx.event.findUniqueOrThrow({
        where: { id: input.eventId },
        include: { fields: true },
      }),
      tx.eventTicketTier.findUniqueOrThrow({ where: { id: input.tierId } }),
    ]);
    if (event.paymentMode === "TEST_SIMULATOR")
      throw Error(
        "409:Use the event’s Test Payment checkout to create this booking.",
      );
    if (
      event.status !== "PUBLISHED" ||
      event.salesPaused ||
      event.startsAt < new Date()
    )
      throw new Error("400:Registration is currently closed.");
    if (!user.active) throw new Error("403:Active account required.");
    if (
      event.access !== "PUBLIC" &&
      userId !== event.organizerId &&
      !(await validEventGrant(tx, userId, event.id))
    )
      throw new Error("403:An authorized invitation is required.");
    if (
      input.receiptPath &&
      !(await tx.fileUpload.findFirst({
        where: { path: input.receiptPath, userId, private: true },
      }))
    )
      throw new Error("403:Private attachment.");
    if (ageOn(user.dob) < event.age)
      throw new Error(
        `403:This event is ${event.age}+. Your account is not eligible.`,
      );
    if (
      tier.eventId !== event.id ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > tier.maxPerOrder
    )
      throw new Error("400:Please select a valid ticket quantity.");
    if (
      (tier.saleStart && tier.saleStart > new Date()) ||
      (tier.saleEnd && tier.saleEnd < new Date())
    )
      throw new Error("400:This ticket tier is not on sale.");
    input.answers = {
      ...input.answers,
      "Full name": input.answers["Full name"] || user.name,
      Email: input.answers.Email || user.email,
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.answers.Email))
      throw new Error("400:Enter a valid registration email.");
    if (input.answers["Full name"].trim().length < 2)
      throw new Error("400:Enter your full name.");
    for (const f of event.fields) {
      const answer = input.answers[f.label]?.trim();
      if (f.required && !answer) throw new Error(`400:${f.label} is required.`);
      if (
        answer &&
        f.type === "select" &&
        !f.options.split(",").includes(answer)
      )
        throw new Error(`400:Choose a valid option for ${f.label}.`);
      if (
        answer &&
        f.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
      )
        throw new Error(`400:Enter a valid email for ${f.label}.`);
    }
    if (input.answers.rules !== "yes")
      throw new Error("400:Please agree to the event rules.");
    if (
      await tx.booking.findFirst({
        where: {
          userId,
          eventId: event.id,
          status: { in: ["APPROVED", "PENDING_REVIEW"] },
        },
      })
    )
      throw new Error(
        "409:You already have a registration for this event. Find it in My Tickets.",
      );
    const total = tier.price * input.quantity;
    if (total > 0 && input.paymentOutcome === "FAILED") {
      return tx.booking.create({
        data: {
          userId,
          eventId: event.id,
          tierId: tier.id,
          quantity: input.quantity,
          total,
          origin: "DEMO",
          testOnly: true,
          lifecycle: "CANCELLED",
          paymentState: "REJECTED",
          registrationState: "PENDING",
          status: "PAYMENT_FAILED",
          paymentStatus: "FAILED",
          answers: JSON.stringify(input.answers),
          idempotencyKey: input.idempotencyKey,
          payment: {
            create: {
              amount: total,
              fee: 0,
              status: "FAILED",
              origin: "DEMO",
              workflowState: "REJECTED",
            },
          },
        },
      });
    }
    const eventReserved = await tx.event.updateMany({
      where: {
        id: event.id,
        stateVersion: event.stateVersion,
        status: "PUBLISHED",
        salesPaused: false,
        reservedCount: { lte: event.capacity - input.quantity },
      },
      data: {
        reservedCount: { increment: input.quantity },
        stateVersion: { increment: 1 },
      },
    });
    if (!eventReserved.count) throw Error("409:Event capacity is unavailable.");
    const reserved = await tx.eventTicketTier.updateMany({
      where: { id: tier.id, sold: { lte: tier.quantity - input.quantity } },
      data: { sold: { increment: input.quantity } },
    });
    if (reserved.count !== 1)
      throw new Error("409:This ticket tier has sold out.");
    const status = event.approvalRequired ? "PENDING_REVIEW" : "APPROVED";
    const booking = await tx.booking.create({
      data: {
        userId,
        eventId: event.id,
        tierId: tier.id,
        quantity: input.quantity,
        total,
        origin: "DEMO",
        testOnly: true,
        lifecycle: status === "APPROVED" ? "CONFIRMED" : "PENDING",
        paymentState: total ? "CONFIRMED" : "NOT_REQUIRED",
        registrationState: status === "APPROVED" ? "APPROVED" : "PENDING",
        paymentRequired: total > 0,
        approvalRequired: event.approvalRequired,
        evidenceRequired: false,
        inventoryHeld: true,
        reservationCreatedAt: new Date(),
        status,
        paymentStatus: "SUCCEEDED",
        answers: JSON.stringify(input.answers),
        receiptPath: input.receiptPath,
        idempotencyKey: input.idempotencyKey,
        payment: {
          create: {
            amount: total,
            fee: feeFor(total),
            origin: "DEMO",
            workflowState: total ? "CONFIRMED" : "NOT_REQUIRED",
          },
        },
      },
    });
    if (status === "APPROVED")
      await issueEligibleTickets(tx, booking.id, userId);
    await audit(tx, userId, "DEMO_BOOKING_CREATED", booking.id, {
      eventId: event.id,
      entityType: "BOOKING",
      newState: booking.lifecycle,
    });
    await tx.notification.create({
      data: {
        userId,
        title:
          status === "APPROVED"
            ? "You’re on the list ✨"
            : "Invitation request received",
        body:
          status === "APPROVED"
            ? `Your ticket for ${event.title} is ready.`
            : `${event.title}: the organizer will review your request.`,
        link: "/tickets",
      },
    });
    return booking;
  });
}
export async function reviewBooking(
  actorId: string,
  bookingId: string,
  approve: boolean,
) {
  assertLocalDemoMutation();
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { event: true },
    });
    await eventPermission(tx, actorId, b.eventId, "registrations");
    if (b.origin === "REAL" || b.userId === actorId)
      throw Error("403:Independent registration review required.");
    await eventFence(tx, b.event, true);
    if (b.status !== "PENDING_REVIEW")
      throw new Error("409:This registration has already been reviewed.");
    if (approve && b.paymentStatus !== "SUCCEEDED")
      throw new Error("400:Payment requirements have not been satisfied.");
    const changed = await tx.booking.updateMany({
      where: { id: b.id, status: "PENDING_REVIEW" },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        lifecycle: approve ? "CONFIRMED" : "CANCELLED",
        registrationState: approve ? "APPROVED" : "REJECTED",
        version: { increment: 1 },
      },
    });
    if (!changed.count) throw new Error("409:Registration already reviewed.");
    if (approve) await issueEligibleTickets(tx, b.id, actorId);
    else {
      await releaseInventory(tx, b);
      if (b.total > 0) {
        const p = await tx.payment.findUniqueOrThrow({
          where: { bookingId: b.id },
        });
        await tx.refund.create({ data: { paymentId: p.id, amount: p.amount } });
        await tx.payment.update({
          where: { id: p.id },
          data: { status: "REFUNDED", workflowState: "REFUNDED" },
        });
        await tx.booking.update({
          where: { id: b.id },
          data: { paymentStatus: "REFUNDED", paymentState: "REFUNDED" },
        });
      }
    }
    await tx.notification.create({
      data: {
        userId: b.userId,
        title: approve ? "Your invitation is approved" : "Invitation update",
        body: approve
          ? `You’re invited to ${b.event.title}. Your QR ticket is ready.`
          : `Your request for ${b.event.title} was declined. Any demo payment has been refunded.`,
        link: "/tickets",
      },
    });
    await audit(
      tx,
      actorId,
      approve ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
      b.id,
      {
        eventId: b.eventId,
        entityType: "BOOKING",
        previousState: b.status,
        newState: approve ? "APPROVED" : "REJECTED",
      },
    );
    return { status: approve ? "APPROVED" : "REJECTED" };
  });
}
export async function checkIn(
  actorId: string,
  eventId: string,
  token: string,
  method: "QR" | "MANUAL" = "QR",
  entryChecks?: { identityConfirmed: boolean },
) {
  return transaction(async (tx) => {
    const { event } = await eventPermission(tx, actorId, eventId, "checkin");
    if (
      entryChecks &&
      (event.idCheckRequired || event.age >= 18) &&
      !entryChecks.identityConfirmed
    )
      throw Error("400:Check attendee identification before admission.");
    await eventFence(tx, event);
    const ticket = await tx.ticket.findUnique({
      where: { token },
      include: {
        booking: {
          include: {
            user: true,
            tier: true,
            recipientVersion: true,
            payment: {
              include: {
                reviews: true,
                evidence: true,
                simulationAttempts: true,
              },
            },
          },
        },
      },
    });
    if (!ticket || ticket.booking.eventId !== eventId)
      throw new Error("404:Ticket is invalid for this event.");
    if (ticket.booking.payment?.provider === "LOCAL_TEST_SIMULATOR")
      await (await import("./payment-simulator")).assertSimulator(tx);
    if (ticket.status === "CHECKED_IN")
      throw new Error(
        "409:Already checked in. Do not admit this ticket again.",
      );
    const decision = eligibility(
      ticket.booking,
      event,
      ticket.booking.payment,
      { admission: true },
    );
    if (
      ticket.status !== "ACTIVE" ||
      ticket.revokedAt ||
      ticket.origin !== ticket.booking.origin ||
      ticket.testOnly !== ticket.booking.testOnly ||
      !decision.eligible
    )
      throw Error(
        "400:" +
          (decision.eligible
            ? "This ticket is not eligible for entry."
            : decision.reason),
      );
    const claimed = await tx.ticket.updateMany({
      where: { id: ticket.id, status: "ACTIVE" },
      data: { status: "CHECKED_IN" },
    });
    if (!claimed.count) throw new Error("409:Already checked in.");
    const checkInRecord = await tx.ticketCheckIn.create({
      data: { ticketId: ticket.id, staffId: actorId },
    });
    await tx.attendanceRecord.upsert({
      where: { userId_eventId: { userId: ticket.booking.userId, eventId } },
      update: {},
      create: {
        userId: ticket.booking.userId,
        eventId,
        ticketId: ticket.id,
        public: ticket.booking.attendancePublic,
      },
    });
    const count = await tx.attendanceRecord.count({
      where: { userId: ticket.booking.userId },
    });
    const badges = await tx.eventBadge.findMany({
      where: { threshold: { lte: count } },
    });
    for (const badge of badges)
      await tx.userBadge.upsert({
        where: {
          userId_badgeId: { userId: ticket.booking.userId, badgeId: badge.id },
        },
        update: {},
        create: { userId: ticket.booking.userId, badgeId: badge.id },
      });
    await audit(
      tx,
      actorId,
      method === "MANUAL" ? "TICKET_MANUALLY_CHECKED_IN" : "TICKET_CHECKED_IN",
      ticket.id,
      {
        eventId,
        entityType: "TICKET",
        previousState: "ACTIVE",
        newState: "CHECKED_IN",
      },
    );
    await tx.notification.create({
      data: {
        userId: ticket.booking.userId,
        title: "A new stamp in your passport",
        body: `Your attendance at ${event.title} is verified.`,
        link: "/profile",
      },
    });
    return {
      name: await bookedHolder(tx, ticket.booking, ticket.booking.user.name),
      tier: ticket.booking.tier.name,
      status: "CHECKED_IN",
      checkedInAt: checkInRecord.createdAt,
      event: event.title,
    };
  });
}

export async function refundBooking(actorId: string, bookingId: string) {
  assertLocalDemoMutation();
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { event: true, payment: true, tickets: true },
    });
    await eventPermission(tx, actorId, b.eventId, "payments");
    if (b.origin === "REAL")
      throw Error(
        "403:Real organizer-direct refunds need separate verified handling.",
      );
    if (!["APPROVED", "PENDING_REVIEW"].includes(b.status))
      throw new Error("409:This registration is already inactive.");
    if (b.tickets.some((t) => t.status === "CHECKED_IN"))
      throw new Error(
        "409:Checked-in tickets cannot be refunded in this demo.",
      );
    if (b.payment?.payoutId)
      throw new Error(
        "409:This payment is in simulated settlement and cannot be refunded.",
      );
    const changed = await tx.booking.updateMany({
      where: { id: b.id, status: b.status },
      data: {
        status: "CANCELLED",
        lifecycle: "CANCELLED",
        registrationState: "CANCELLED",
        paymentState: b.total ? "REFUNDED" : "NOT_REQUIRED",
        version: { increment: 1 },
        paymentStatus: b.total ? "REFUNDED" : "CANCELLED",
      },
    });
    if (!changed.count) throw new Error("409:Booking already updated.");
    await tx.ticket.updateMany({
      where: { bookingId: b.id },
      data: { status: "CANCELLED" },
    });
    await releaseInventory(tx, b);
    if (b.payment && b.total) {
      await tx.refund.create({
        data: { paymentId: b.payment.id, amount: b.total },
      });
      await tx.payment.update({
        where: { id: b.payment.id },
        data: { status: "REFUNDED", workflowState: "REFUNDED" },
      });
    }
    await tx.notification.create({
      data: {
        userId: b.userId,
        title: "Demo booking refunded",
        body: `Your registration for ${b.event.title} was cancelled and any simulated payment was refunded.`,
        link: "/tickets",
      },
    });
    await audit(tx, actorId, "DEMO_REFUND", b.id, {
      eventId: b.eventId,
      entityType: "BOOKING",
      previousState: b.status,
      newState: "CANCELLED",
      reasonCode: "ISOLATED_DEMO_ONLY",
    });
    return { ok: true };
  });
}
