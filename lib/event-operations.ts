import { simulatorEvent, SIMULATOR_PROVIDER } from "./simulator-policy";
import { z } from "zod";
import { db } from "./db";
import {
  actor,
  audit,
  eventPermission,
  notify,
  notifyAdmins,
  transaction,
  type Tx,
} from "./domain-core";
import { zonedInstant } from "./event-config";
const id = z.string().min(1).max(191),
  note = z.string().trim().min(5).max(191);
export const refundPolicyInput = z
  .object({
    kind: z.enum([
      "REVIEW_REQUIRED",
      "CANCELLATION_ONLY",
      "UNTIL_DEADLINE",
      "NON_REFUNDABLE_REVIEW",
      "CUSTOM_REVIEW",
    ]),
    terms: z.string().trim().min(20).max(1500),
    deadline: z.string().datetime().nullable().default(null),
    allowAfterChange: z.boolean().default(false),
  })
  .strict();
export function storedPolicy(value: string) {
  try {
    const p = JSON.parse(value);
    return refundPolicyInput.parse({
      kind: p.kind,
      terms: p.terms,
      deadline: p.deadline,
      allowAfterChange: p.allowAfterChange,
    });
  } catch {
    return {
      kind: "REVIEW_REQUIRED",
      terms:
        "No approved refund terms were recorded at booking. Human review is required.",
      deadline: null,
      allowAfterChange: false,
    };
  }
}
export function termSnapshot(e: any) {
  return {
    startsAt: new Date(e.startsAt).toISOString(),
    endsAt: new Date(e.endsAt).toISOString(),
    venue: e.venue,
    privateVenue: e.privateVenue,
    city: e.city,
    latitude: e.latitude,
    longitude: e.longitude,
    entryInstructions: e.entryInstructions || "",
    termsVersion: e.termsVersion || 0,
  };
}
export async function requestEventChange(userId: string, input: unknown) {
  const d = z
    .object({
      eventId: id,
      version: z.number().int().nonnegative(),
      reason: note,
      kind: z.enum(["DETAILS", "REFUND_POLICY"]).default("DETAILS"),
      values: z.unknown(),
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    const { event: e } = await eventPermission(tx, userId, d.eventId, "manage");
    if (
      !(d.kind === "REFUND_POLICY"
        ? ["DRAFT", "PUBLISHED"].includes(e.status)
        : e.status === "PUBLISHED") ||
      e.startsAt <= new Date() ||
      e.endsAt <= new Date()
    )
      throw Error(
        "409:Only a published event that has not started can request reviewed changes.",
      );
    if (e.pendingChangeId || e.termsVersion !== d.version)
      throw Error(
        "409:Another change is pending or event terms changed. Reload.",
      );
    if (
      await tx.ticketCheckIn.count({
        where: { ticket: { booking: { eventId: e.id } } },
      })
    )
      throw Error(
        "409:Attendance has already been recorded. An operational exception is required.",
      );
    let values: any;
    if (d.kind === "REFUND_POLICY") {
      const p = refundPolicyInput.parse(d.values);
      if (p.kind === "UNTIL_DEADLINE" && !p.deadline)
        throw Error("400:This policy needs a deadline.");
      values = p;
    } else {
      const v = z
        .object({
          startsLocal: z.string(),
          endsLocal: z.string(),
          venue: z.string().trim().min(2).max(191),
          privateVenue: z.string().trim().max(191),
          city: z.string().trim().min(2).max(80),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          entryInstructions: z.string().trim().max(1500),
        })
        .strict()
        .parse(d.values);
      const start = zonedInstant(v.startsLocal, e.timezone),
        end = zonedInstant(v.endsLocal, e.timezone);
      if (start <= new Date() || end <= start)
        throw Error("400:Use a future start and an end after the start.");
      values = {
        ...v,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      };
      delete values.startsLocal;
      delete values.endsLocal;
      const prev = termSnapshot(e);
      if (Object.entries(values).every(([k, v]) => (prev as any)[k] === v))
        throw Error("400:Propose at least one changed detail.");
    }
    const bookings = await tx.booking.findMany({
      where: {
        eventId: e.id,
        lifecycle: { in: ["RESERVED", "PENDING", "CONFIRMED"] },
      },
      select: { id: true },
    });
    const request = await tx.eventChange.create({
      data: {
        eventId: e.id,
        requesterId: userId,
        kind: d.kind,
        baseTermsVersion: e.termsVersion,
        previousPaused: e.salesPaused,
        reason: d.reason,
        previousValues:
          d.kind === "DETAILS"
            ? JSON.stringify(termSnapshot(e))
            : JSON.stringify({
                policy: JSON.parse(e.refundPolicy),
                eventStatus: e.status,
              }),
        proposedValues: JSON.stringify(values),
        affectedBookingIds: JSON.stringify(bookings.map((b) => b.id)),
      },
    });
    const claim = await tx.event.updateMany({
      where: {
        id: e.id,
        pendingChangeId: null,
        termsVersion: e.termsVersion,
        status: e.status,
      },
      data: {
        pendingChangeId: request.id,
        salesPaused: true,
        stateVersion: { increment: 1 },
      },
    });
    if (!claim.count) throw Error("409:Another change was submitted first.");
    await audit(tx, userId, "EVENT_CHANGE_REQUESTED", request.id, {
      eventId: e.id,
      entityType: "EVENT_CHANGE",
      newState: "PENDING_REVIEW",
      reasonCode: d.reason,
    });
    await notifyAdmins(
      tx,
      "event-change:" + request.id,
      "Event change awaiting review",
      "An organizer requests a reviewed change. Bookings remain preserved.",
      "/admin?tab=Event%20operations&event=" + e.id,
    );
    return request;
  });
}
export async function reviewEventChange(userId: string, input: unknown) {
  const d = z
    .object({ id, approve: z.boolean(), notes: note })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    const u = await actor(tx, userId);
    if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
    const r = await tx.eventChange.findUniqueOrThrow({
        where: { id: d.id },
        include: { event: true },
      }),
      e = r.event;
    if (r.requesterId === u.id)
      throw Error("403:An independent administrator must review this change.");
    if (r.status !== "PENDING_REVIEW")
      throw Error("409:This change was already reviewed or invalidated.");
    const requiredStatus =
      r.kind === "REFUND_POLICY"
        ? JSON.parse(r.previousValues).eventStatus || "PUBLISHED"
        : "PUBLISHED";
    if (
      e.pendingChangeId !== r.id ||
      e.termsVersion !== r.baseTermsVersion ||
      e.status !== requiredStatus ||
      e.startsAt <= new Date()
    )
      throw Error("409:Event state changed; this request cannot overwrite it.");
    if (
      d.approve &&
      (await tx.ticketCheckIn.count({
        where: { ticket: { booking: { eventId: e.id } } },
      }))
    )
      throw Error(
        "409:Attendance has been recorded; do not silently change these commitments.",
      );
    const raw = JSON.parse(r.proposedValues);
    let data: any = {
      pendingChangeId: null,
      salesPaused: r.previousPaused,
      stateVersion: { increment: 1 },
    };
    if (d.approve) {
      data.termsVersion = { increment: 1 };
      if (r.kind === "REFUND_POLICY")
        data.refundPolicy = JSON.stringify({
          ...refundPolicyInput.parse(raw),
          approvedById: u.id,
          approvedAt: new Date().toISOString(),
          version: e.termsVersion + 1,
          testOnly: e.testOnly,
        });
      else {
        if (
          new Date(raw.startsAt) <= new Date() ||
          new Date(raw.endsAt) <= new Date(raw.startsAt)
        )
          throw Error("409:The proposed schedule is no longer valid.");
        data = {
          ...data,
          ...raw,
          startsAt: new Date(raw.startsAt),
          endsAt: new Date(raw.endsAt),
        };
      }
    }
    const claimed = await tx.event.updateMany({
      where: {
        id: e.id,
        pendingChangeId: r.id,
        termsVersion: r.baseTermsVersion,
        status: requiredStatus,
      },
      data,
    });
    if (!claimed.count) throw Error("409:Event changed during review.");
    const updated = await tx.eventChange.update({
      where: { id: r.id },
      data: {
        status: d.approve ? "APPROVED" : "REJECTED",
        reviewerId: u.id,
        reviewNotes: d.notes,
        reviewedAt: new Date(),
        effectiveAt: d.approve ? new Date() : null,
      },
    });
    if (d.approve && r.kind === "DETAILS") {
      const bookings = await tx.booking.findMany({
        where: { id: { in: JSON.parse(r.affectedBookingIds) }, eventId: e.id },
        select: { id: true, userId: true },
      });
      for (const b of bookings)
        await notify(
          tx,
          b.userId,
          `event-change:${r.id}:${b.id}`,
          "Event details updated",
          `${e.title}: approved schedule, venue or entry instructions changed. Open your booking for private details, ticket status and refund/support options.`,
          "/bookings/" + b.id,
        );
      await tx.eventChange.update({
        where: { id: r.id },
        data: { notifiedAt: new Date() },
      });
    }
    await audit(tx, u.id, "EVENT_CHANGE_" + updated.status, r.id, {
      eventId: e.id,
      entityType: "EVENT_CHANGE",
      previousState: r.status,
      newState: updated.status,
      reasonCode: d.notes,
    });
    await notify(
      tx,
      e.organizerId,
      "event-change-decision:" + r.id,
      "Event change review completed",
      `Your ${r.kind === "DETAILS" ? "event change" : "refund policy"} was ${updated.status.toLowerCase()}. Sales authorization remains separate.`,
      "/organizer?tab=Event%20operations&event=" + e.id,
    );
    return updated;
  });
}
export async function refundEligibility(
  tx: Tx,
  booking: any,
  now = new Date(),
) {
  const b = booking.payment
    ? booking
    : await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: { payment: true, event: true, tickets: true },
      });
  const e =
      b.event ||
      (await tx.event.findUniqueOrThrow({ where: { id: b.eventId } })),
    p = storedPolicy(b.refundPolicySnapshot || "{}");
  if (
    !b.payment ||
    (b.payment.provider !== "ORGANIZER_DIRECT" &&
      !(
        b.payment.provider === SIMULATOR_PROVIDER && simulatorEvent(b.event)
      )) ||
    !b.payment.confirmedAt ||
    !["CONFIRMED", "REFUND_PENDING", "PARTIALLY_REFUNDED"].includes(b.paymentState)
  )
    return {
      allowed: false,
      reason: "No confirmed direct payment is available for review.",
      policy: p,
    };
  if (await tx.ticketCheckIn.count({ where: { ticket: { bookingId: b.id } } }))
    return {
      allowed: false,
      reason:
        "Attendance was recorded. Contact support for an explicit exception; routine refund approval is unavailable.",
      policy: p,
    };
  const changed = await tx.eventChange.count({
    where: {
      eventId: e.id,
      kind: "DETAILS",
      status: "APPROVED",
      createdAt: { gte: b.createdAt },
    },
  });
  if (e.status !== "CANCELLED" && !(changed && p.allowAfterChange)) {
    if (p.kind === "CANCELLATION_ONLY")
      return {
        allowed: false,
        reason:
          "This booking's approved policy limits routine requests to organizer cancellation. Contact support for disputes or legal review.",
        policy: p,
      };
    if (p.kind === "UNTIL_DEADLINE" && p.deadline && new Date(p.deadline) < now)
      return {
        allowed: false,
        reason:
          "The recorded request deadline has passed. Contact support for cancellation, disputes or legal review.",
        policy: p,
      };
  }
  return {
    allowed: true,
    reason:
      p.kind === "NON_REFUNDABLE_REVIEW"
        ? "A non-refundable label does not resolve legal rights. Independent administrator exception review is required."
        : "Manual policy review required; this is not a promise of a refund.",
    policy: p,
    adminException: p.kind === "NON_REFUNDABLE_REVIEW",
  };
}
export async function customerEventChanges(b: any, canSeeLocation: boolean) {
  const rows = await db.eventChange.findMany({
    where: { eventId: b.eventId, kind: "DETAILS", status: "APPROVED" },
    orderBy: { effectiveAt: "desc" },
    take: 50,
  });
  return rows
    .filter((r) => JSON.parse(r.affectedBookingIds).includes(b.id))
    .map((r) => {
      const redact = (s: string) => {
        const v = JSON.parse(s);
        if (!canSeeLocation) {
          v.venue =
            "Private location — available only to eligible confirmed guests";
          delete v.privateVenue;
          delete v.latitude;
          delete v.longitude;
          delete v.entryInstructions;
        }
        return v;
      };
      return {
        id: r.id,
        reason: canSeeLocation
          ? r.reason
          : "Event details were updated. See the approved schedule below.",
        previous: redact(r.previousValues),
        current: redact(r.proposedValues),
        effectiveAt: r.effectiveAt,
      };
    });
}
