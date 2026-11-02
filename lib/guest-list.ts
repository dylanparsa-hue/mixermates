import { Prisma } from "@prisma/client";
import { db } from "./db";
import { eventPermission } from "./domain-core";
export function listPage(value: unknown) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export function guestQuery(raw: Record<string, unknown> = {}) {
  const pick = (key: string, values: string[], fallback = "ALL") =>
    values.includes(String(raw[key])) ? String(raw[key]) : fallback;
  return {
    page: listPage(raw.page),
    search: String(raw.search || "")
      .trim()
      .slice(0, 100),
    tier: String(raw.tier || "").slice(0, 191),
    registration: pick("registration", [
      "PENDING",
      "APPROVED",
      "NOT_REQUIRED",
      "REJECTED",
      "CANCELLED",
    ]),
    payment: pick("payment", [
      "AWAITING_PAYMENT",
      "PROOF_SUBMITTED",
      "UNDER_REVIEW",
      "CONFIRMED",
      "REJECTED",
      "REFUND_PENDING",
      "REFUNDED",
      "DISPUTED",
      "NOT_REQUIRED",
    ]),
    arrival: pick("arrival", ["CHECKED_IN", "NOT_ARRIVED"]),
    lifecycle: pick("lifecycle", [
      "RESERVED",
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
      "EXPIRED",
      "REJECTED",
    ]),
    sort: pick("sort", ["NAME", "OLDEST", "RECENT_ARRIVALS"], "NEWEST"),
  };
}
export async function guestList(
  userId: string,
  eventId: string,
  raw: Record<string, unknown> = {},
) {
  const { event, user } = await eventPermission(db, userId, eventId, "guests");
  let finance = event.organizerId === userId || user.role === "ADMIN";
  if (!finance) {
    const staff = await db.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    finance = !!staff?.active && !!staff.canReviewPayments;
  }
  const q = guestQuery(raw);
  if (!finance && q.payment !== "ALL")
    throw Error("403:Financial filters require payment review permission.");
  const where: Prisma.BookingWhereInput = {
    eventId,
    ...(q.tier ? { tierId: q.tier } : {}),
    ...(q.registration !== "ALL" ? { registrationState: q.registration } : {}),
    ...(q.lifecycle !== "ALL" ? { lifecycle: q.lifecycle } : {}),
    ...(q.payment !== "ALL" ? { paymentState: q.payment } : {}),
    ...(q.arrival === "CHECKED_IN" || q.sort === "RECENT_ARRIVALS"
      ? { tickets: { some: { checkIn: { isNot: null } } } }
      : q.arrival === "NOT_ARRIVED"
        ? { tickets: { none: { checkIn: { isNot: null } } } }
        : {}),
    ...(q.search
      ? {
          OR: [
            { guestName: { contains: q.search } },
            { user: { name: { contains: q.search } } },
            { id: { contains: q.search } },
            { tickets: { some: { id: { contains: q.search } } } },
          ],
        }
      : {}),
  };
  const recent = q.sort === "RECENT_ARRIVALS";
  const total = recent
    ? await db.ticketCheckIn.count({ where: { ticket: { booking: where } } })
    : await db.booking.count({ where });
  const pages = Math.max(1, Math.ceil(total / 50)),
    page = Math.min(q.page, pages);
  // Recent arrivals page by actual admission time rather than booking creation time.
  const arrivals = recent
    ? await db.ticketCheckIn.findMany({
        where: { ticket: { booking: where } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          ticketId: true,
          createdAt: true,
          ticket: { select: { bookingId: true } },
        },
        take: 50,
        skip: (page - 1) * 50,
      })
    : null;
  const rows = await db.booking.findMany({
    where: recent
      ? { ...where, id: { in: arrivals!.map((a) => a.ticket.bookingId) } }
      : where,
    orderBy:
      q.sort === "NAME"
        ? [{ guestName: "asc" }, { id: "asc" }]
        : q.sort === "OLDEST"
          ? [{ createdAt: "asc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "desc" }],
    ...(!recent ? { skip: (page - 1) * 50, take: 50 } : {}),
    select: {
      id: true,
      guestName: true,
      user: { select: { name: true } },
      tier: { select: { name: true } },
      quantity: true,
      lifecycle: true,
      registrationState: true,
      ...(finance ? { paymentState: true } : {}),
      tickets: {
        select: {
          id: true,
          status: true,
          checkIn: { select: { createdAt: true } },
        },
      },
    },
  });
  const guests = rows.map((b) => ({
    id: b.id,
    name: b.guestName || b.user.name,
    tier: b.tier.name,
    quantity: b.quantity,
    lifecycle: b.lifecycle,
    registration: b.registrationState,
    ...(finance ? { payment: b.paymentState } : {}),
    issued: b.tickets.length,
    checkedIn: b.tickets.filter((t) => t.checkIn).length,
    lastArrival:
      b.tickets
        .map((t) => t.checkIn?.createdAt)
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a))[0] || null,
  }));
  const result = recent
    ? arrivals!.map((a) => ({
        ...guests.find((g) => g.id === a.ticket.bookingId)!,
        id: a.ticketId,
        lastArrival: a.createdAt,
      }))
    : guests;
  return {
    guests: result,
    total,
    page,
    pages,
    pageSize: 50,
    finance,
    tiers: await db.eventTicketTier.findMany({
      where: { eventId },
      select: { id: true, name: true },
    }),
  };
}
