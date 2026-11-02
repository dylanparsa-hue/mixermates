import { simulatorEvent } from "./simulator-policy";
import { Prisma } from "@prisma/client";
import { isolatedTestData } from "./domain-core";
import { isIsolatedDemoEnvironment } from "./site-config";
import { csvRow } from "./reconciliation";
import { z } from "zod";
import { eventDateLabel } from "./event-config";
import { db } from "./db";
import { audit, eventPermission, transaction } from "./domain-core";
import { eligibility } from "./booking-domain";
import { bookedHolder, holderName } from "./registration";
import { checkIn } from "./services";

const bookingInclude = {
  user: true,
  tier: true,
  recipientVersion: true,
  payment: {
    include: { reviews: true, evidence: true, simulationAttempts: true },
  },
} as const;
const input = z
  .object({
    eventId: z.string().min(1).max(191),
    token: z.string().trim().min(20).max(100).optional(),
    ticketId: z.string().min(1).max(191).optional(),
    identityConfirmed: z.boolean().optional(),
    method: z.enum(["QR", "MANUAL"]).default("QR"),
  })
  .strict();
function usable(ticket: any, booking: any, event: any) {
  return (
    ticket.status === "ACTIVE" &&
    !ticket.revokedAt &&
    ticket.origin === booking.origin &&
    ticket.testOnly === booking.testOnly &&
    eligibility(booking, event, booking.payment, { admission: true }).eligible
  );
}
export async function entranceOverview(
  userId: string,
  eventId: string,
  raw: Record<string, unknown> = {},
) {
  return transaction(async (tx) => {
    let permission;
    try {
      permission = await eventPermission(tx, userId, eventId, "guests");
    } catch {
      permission = await eventPermission(tx, userId, eventId, "checkin");
    }
    const { event, user } = permission;
    if (event.paymentMode === "TEST_SIMULATOR")
      await (await import("./payment-simulator")).assertSimulator(tx);
    const assignment = await tx.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    const manage = event.organizerId === userId || user.role === "ADMIN";
    const canViewGuests =
      manage || (!!assignment?.active && !!assignment.canViewGuests);
    const canCheckIn =
      manage || (!!assignment?.active && !!assignment.canCheckIn);
    const search = String(raw.search || "")
        .trim()
        .slice(0, 100),
      tier = String(raw.tier || "").slice(0, 191),
      filter = String(raw.arrival || "ALL"),
      sort = String(raw.sort || "");
    const base: any = { booking: { eventId } };
    const where: any = {
      booking: {
        eventId,
        ...(tier ? { tier: { name: tier } } : {}),
        ...(search
          ? {
              OR: [
                { guestName: { contains: search } },
                { user: { name: { contains: search } } },
                { id: { contains: search } },
              ],
            }
          : {}),
      },
      ...(search
        ? {
            OR: [
              {
                booking: {
                  OR: [
                    { guestName: { contains: search } },
                    { user: { name: { contains: search } } },
                    { id: { contains: search } },
                  ],
                },
              },
              { id: { contains: search } },
            ],
          }
        : {}),
    };
    // Search ticket IDs without requiring a second match on the booking.
    if (search) delete where.booking.OR;
    if (filter === "CHECKED_IN") where.checkIn = { isNot: null };
    if (filter === "NOT_ARRIVED") {
      where.status = "ACTIVE";
      where.checkIn = { is: null };
      where.revokedAt = null;
      where.booking.lifecycle = "CONFIRMED";
    }
    const total = canViewGuests ? await tx.ticket.count({ where }) : 0;
    const pages = Math.max(1, Math.ceil(total / 50)),
      requested = Number(raw.page),
      page =
        Number.isSafeInteger(requested) && requested > 0
          ? Math.min(requested, pages)
          : 1;
    const holderField = await tx.eventRegistrationField.findFirst({
      where: { eventId, label: { contains: "Full name" } },
    });
    const toGuest = (t: any) => ({
      id: t.id,
      bookingId: t.bookingId,
      name: holderName(t.booking.answers, holderField?.id, t.booking.user.name),
      tier: t.booking.tier.name,
      registration: t.booking.registrationState,
      status: t.status,
      eligible: usable(t, t.booking, event),
      checkedInAt: t.checkIn?.createdAt || null,
      method: null as string | null,
    });
    const rows = canViewGuests
      ? await tx.ticket.findMany({
          where,
          include: { checkIn: true, booking: { include: bookingInclude } },
          skip: (page - 1) * 50,
          take: 50,
          orderBy:
            sort === "NAME"
              ? [{ booking: { guestName: "asc" } }, { id: "asc" }]
              : sort === "RECENT_ARRIVALS"
                ? [{ checkIn: { createdAt: "desc" } }, { id: "desc" }]
                : [{ createdAt: "desc" }, { id: "desc" }],
        })
      : [];
    const guests = rows.map(toGuest);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - event.age);
    cutoff.setHours(23, 59, 59, 999);
    const eventOpen =
      event.status === "PUBLISHED" &&
      !event.pendingChangeId &&
      event.endsAt > new Date();
    const stats = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT b.tierId, COUNT(t.id) AS issued,
       SUM(CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END) AS checkedIn,
       SUM(CASE WHEN t.status='ACTIVE' AND t.revokedAt IS NULL AND c.id IS NULL
        AND u.active=1 AND u.dob<=${cutoff} AND ${eventOpen ? 1 : 0}=1
        AND (b.testOnly=0 OR ${isolatedTestData() ? 1 : 0}=1)
        AND t.origin=b.origin AND t.testOnly=b.testOnly
        AND ((b.origin IN ('DEMO','LEGACY_DEMO') AND ${isIsolatedDemoEnvironment() ? 1 : 0}=1 AND b.status='APPROVED' AND b.paymentStatus='SUCCEEDED')
         OR (b.origin='REAL' AND ${event.origin}='REAL' AND b.testOnly=${event.testOnly ? 1 : 0} AND b.lifecycle='CONFIRMED'
          AND b.registrationState IN ('APPROVED','NOT_REQUIRED') AND (b.byobRequired=0 OR b.byobState='APPROVED')
          AND ((b.paymentRequired=0 AND b.total=0 AND b.paymentState='NOT_REQUIRED')
           OR (b.paymentRequired=1 AND ${simulatorEvent(event) ? 1 : 0}=1 AND b.testOnly=1
             AND b.paymentState='CONFIRMED' AND p.origin='REAL' AND p.provider='LOCAL_TEST_SIMULATOR'
             AND p.workflowState='CONFIRMED' AND p.amount=b.total AND p.confirmedAt IS NOT NULL
             AND b.recipientVersionId IS NULL AND b.recipientSnapshot IS NULL AND b.evidenceRequired=0
             AND EXISTS(SELECT 1 FROM SimulationAttempt a WHERE a.paymentId=p.id AND a.kind='PAYMENT' AND a.outcome='SUCCESS' AND a.testOnly=1 AND a.reference LIKE 'TEST-%'))
           OR (b.paymentRequired=1 AND p.provider<>'LOCAL_TEST_SIMULATOR' AND b.paymentState='CONFIRMED' AND p.origin='REAL' AND p.workflowState='CONFIRMED'
             AND p.amount=b.total AND p.confirmedAt IS NOT NULL AND b.recipientSnapshot IS NOT NULL AND v.approvedAt IS NOT NULL
             AND EXISTS(SELECT 1 FROM PaymentReview r WHERE r.paymentId=p.id AND r.decision='CONFIRMED' AND r.fundsVerified=1 AND r.reviewerId<>b.userId)
             AND (b.evidenceRequired=0 OR EXISTS(SELECT 1 FROM PaymentEvidence e WHERE e.paymentId=p.id AND e.kind='PAYMENT' AND e.status='ACCEPTED' AND e.expectedAmount=b.total AND e.recipientVersionId=b.recipientVersionId))))))
        THEN 1 ELSE 0 END) AS notArrived
      FROM Booking b JOIN Ticket t ON t.bookingId=b.id JOIN User u ON u.id=b.userId
      LEFT JOIN TicketCheckIn c ON c.ticketId=t.id LEFT JOIN Payment p ON p.bookingId=b.id
      LEFT JOIN PaymentRecipientVersion v ON v.id=b.recipientVersionId WHERE b.eventId=${eventId} GROUP BY b.tierId`);
    const bookingStats = await tx.booking.groupBy({
      by: ["lifecycle", "status"],
      where: { eventId },
      _count: true,
    });
    const registrations = bookingStats.reduce((n, r) => n + r._count, 0),
      confirmedBookings = bookingStats
        .filter((r) => r.lifecycle === "CONFIRMED" || r.status === "APPROVED")
        .reduce((n, r) => n + r._count, 0);
    const issued = stats.reduce((n, r) => n + Number(r.issued), 0),
      checkedIn = stats.reduce((n, r) => n + Number(r.checkedIn), 0),
      notArrived = stats.reduce((n, r) => n + Number(r.notArrived), 0);
    const [rejected, tiers, last, recentRows, logs] = await Promise.all([
      tx.adminAuditLog.count({
        where: { eventId, action: "ENTRANCE_REJECTED" },
      }),
      tx.eventTicketTier.findMany({
        where: { eventId },
        select: { id: true, name: true },
      }),
      tx.ticketCheckIn.findFirst({
        where: { ticket: { booking: { eventId } } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      canViewGuests
        ? tx.ticket.findMany({
            where: { ...base, checkIn: { isNot: null } },
            orderBy: { checkIn: { createdAt: "desc" } },
            take: 10,
            include: { checkIn: true, booking: { include: bookingInclude } },
          })
        : Promise.resolve([]),
      manage
        ? tx.adminAuditLog.findMany({
            where: {
              eventId,
              action: {
                in: [
                  "TICKET_CHECKED_IN",
                  "TICKET_MANUALLY_CHECKED_IN",
                  "ENTRANCE_REJECTED",
                ],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { user: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);
    // Per-page methods, never an unbounded scan of historical audit records.
    const methods = await tx.adminAuditLog.findMany({
      where: {
        eventId,
        targetId: { in: guests.map((g) => g.id) },
        action: { in: ["TICKET_CHECKED_IN", "TICKET_MANUALLY_CHECKED_IN"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    for (const g of guests)
      g.method = g.checkedInAt
        ? methods.find((l) => l.targetId === g.id)?.action ===
          "TICKET_MANUALLY_CHECKED_IN"
          ? "MANUAL"
          : "QR"
        : null;
    return {
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        status: event.status,
        age: event.age,
        idCheckRequired: event.idCheckRequired,
        testOnly: event.testOnly,
      },
      canViewGuests,
      canCheckIn,
      manage,
      counts: {
        registrations,
        confirmedBookings,
        issued,
        checkedIn,
        notArrived,
        expected: checkedIn + notArrived,
        rejected,
      },
      lastCheckIn: last?.createdAt || null,
      tiers: tiers.map((t) => ({
        name: t.name,
        checkedIn: Number(stats.find((r) => r.tierId === t.id)?.checkedIn || 0),
        notArrived: Number(
          stats.find((r) => r.tierId === t.id)?.notArrived || 0,
        ),
      })),
      guests,
      total,
      page,
      pages,
      pageSize: 50,
      staffActivity: manage
        ? logs.slice(0, 20).map((l) => ({
            id: l.id,
            actor: l.user.name,
            action: l.action,
            reference: l.targetId,
            createdAt: l.createdAt,
          }))
        : [],
      recent: recentRows.map(toGuest),
    };
  });
}
export async function entranceAction(
  userId: string,
  raw: unknown,
  confirm = false,
) {
  const d = input.parse(raw);
  // Reject unauthorized users before reading credentials or recording activity.
  const { event } = await eventPermission(db, userId, d.eventId, "checkin");
  if (d.ticketId) await eventPermission(db, userId, d.eventId, "guests");
  try {
    if (!!d.token === !!d.ticketId)
      throw Error("400:Choose one ticket or private code.");
    const ticket = await db.ticket.findUnique({
      where: d.ticketId ? { id: d.ticketId } : { token: d.token! },
      include: { checkIn: true, booking: { include: bookingInclude } },
    });
    if (!ticket || ticket.booking.eventId !== event.id)
      throw Error("404:Ticket is invalid for this event.");
    if (ticket.status === "CHECKED_IN")
      throw Error(
        "409:Already checked in at " +
          (ticket.checkIn
            ? eventDateLabel(ticket.checkIn.createdAt, event.timezone) +
              (event.timezone === "Asia/Kuala_Lumpur"
                ? " MYT"
                : " (" + event.timezone + ")")
            : "an earlier admission") +
          ". Do not admit again. Reference: " +
          ticket.id,
      );
    if (ticket.booking.payment?.provider === "LOCAL_TEST_SIMULATOR")
      await (await import("./payment-simulator")).assertSimulator();
    if (!usable(ticket, ticket.booking, event))
      throw Error("409:Not valid for entry. Ticket or event is ineligible.");
    if (!confirm)
      return {
        id: ticket.id,
        name: await bookedHolder(db, ticket.booking, ticket.booking.user.name),
        tier: ticket.booking.tier.name,
        event: event.title,
        requiresId: event.idCheckRequired || event.age >= 18,
        testOnly: ticket.testOnly,
      };
    if ((event.idCheckRequired || event.age >= 18) && !d.identityConfirmed)
      throw Error("400:Check attendee identification before admission.");
    // All authority, lifecycle and eligibility checks repeat in the existing serializable transaction.
    return await checkIn(
      userId,
      event.id,
      ticket.token,
      d.ticketId ? "MANUAL" : d.method,
      { identityConfirmed: d.identityConfirmed === true },
    );
  } catch (error) {
    await audit(db, userId, "ENTRANCE_REJECTED", event.id, {
      eventId: event.id,
      entityType: "EVENT",
      reasonCode: confirm ? "ADMISSION_DENIED" : "VALIDATION_DENIED",
    });
    throw error;
  }
}

export async function entranceExportStream(
  userId: string,
  eventId: string,
  raw: Record<string, unknown> = {},
) {
  await eventPermission(db, userId, eventId, "manage");
  await audit(db, userId, "GUEST_LIST_EXPORTED", eventId, {
    eventId,
    entityType: "EVENT",
  });
  const field = await db.eventRegistrationField.findFirst({
    where: { eventId, label: { contains: "Full name" } },
  });
  const search = String(raw.search || "")
      .trim()
      .slice(0, 100),
    tier = String(raw.tier || "").slice(0, 191);
  const where: any = {
    booking: { eventId, ...(tier ? { tier: { name: tier } } : {}) },
    ...(raw.arrival === "CHECKED_IN"
      ? { checkIn: { isNot: null } }
      : raw.arrival === "NOT_ARRIVED"
        ? { status: "ACTIVE", checkIn: { is: null } }
        : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search } },
            { booking: { id: { contains: search } } },
            { booking: { guestName: { contains: search } } },
            { booking: { user: { name: { contains: search } } } },
          ],
        }
      : {}),
  };
  let cursor: string | undefined,
    header = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await eventPermission(db, userId, eventId, "manage");
        if (!header) {
          controller.enqueue(
            new TextEncoder().encode(
              csvRow([
                "Guest",
                "Tier",
                "Ticket reference",
                "Ticket status",
                "Check-in time",
              ]),
            ),
          );
          header = true;
          return;
        }
        const rows = await db.ticket.findMany({
          where,
          orderBy: { id: "asc" },
          take: 200,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            status: true,
            checkIn: { select: { createdAt: true } },
            booking: {
              select: {
                answers: true,
                user: { select: { name: true } },
                tier: { select: { name: true } },
              },
            },
          },
        });
        if (!rows.length) {
          controller.close();
          return;
        }
        cursor = rows[rows.length - 1].id;
        controller.enqueue(
          new TextEncoder().encode(
            rows
              .map((t) =>
                csvRow([
                  holderName(t.booking.answers, field?.id, t.booking.user.name),
                  t.booking.tier.name,
                  t.id,
                  t.status,
                  t.checkIn?.createdAt.toISOString() || "",
                ]),
              )
              .join(""),
          ),
        );
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
export async function entranceExport(userId: string, eventId: string) {
  return new Response(await entranceExportStream(userId, eventId)).text();
}
