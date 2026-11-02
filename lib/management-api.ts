import { commissionSummary } from "./ticket-commission";
import { publicOrganizerProfile } from "./organizer-public-profile";
import {
  activateOrganizer,
  ensureOrganizerIdentity,
} from "./organizer-identity";
import { saveEventWorkspace } from "./event-workspace";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "./db";
import { actor, audit, notify, notifyAdmins } from "./domain-core";
import { consumeRateLimit } from "./security";
import { transaction, eventPermission, isolatedTestData } from "./domain-core";
import {
  organizerActor,
  saveEventDraft,
  submitEvent,
  publicationFieldErrors,
  eventCreatorReadiness,
} from "./event-management";
import { firstInvalidStep } from "./event-wizard-validation";
import { updateEventLifecycle } from "./booking-domain";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
} from "./payment-foundation";
import { ageOn } from "./rules";
import { setEventStaff } from "./staff-permissions";
const id = z.string().min(1).max(191),
  note = z.string().trim().min(5).max(1000);
const json = NextResponse.json;
export async function managementGet(p: string, user: any) {
  if (p.startsWith("organizers/")) {
    const profile = await publicOrganizerProfile(p.split("/")[1], user);
    if (!profile) throw Error("404:Organizer unavailable.");
    return json(profile);
  }
  if (p === "financial-summary") {
    if (!user) throw Error("401:Please sign in.");
    return json(await commissionSummary(user.id));
  }
  if (p === "organizer-subscription") {
    if (!user) throw Error("401:Please sign in.");
    throw Error("410:Organizer subscriptions are retired. Event creation is free.");
  }
  if (p === "setup") {
    if (!user) throw Error("401:Please sign in.");
    await organizerActor(db, user.id);
    const identity = await transaction((tx) =>
      ensureOrganizerIdentity(tx, user.id),
    );
    const events = await db.event.findMany({
      where: { organizerId: user.id },
      include: {
        creatorState: true,
        _count: { select: { bookings: true } },
        tiers: { orderBy: { sortOrder: "asc" } },
        fields: true,
        staff: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    // Cancellation needs aggregate impact, never every private booking/ticket row.
    const summarizedEvents = await Promise.all(
      events.map(async (event) => {
        const [
          pendingRegistrations,
          activeTickets,
          pendingPaymentReviews,
          confirmed,
        ] = await Promise.all([
          db.booking.count({
            where: { eventId: event.id, registrationState: "PENDING" },
          }),
          db.ticket.count({
            where: { booking: { eventId: event.id }, status: "ACTIVE" },
          }),
          db.booking.count({
            where: {
              eventId: event.id,
              paymentState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] },
              lifecycle: { in: ["RESERVED", "PENDING"] },
            },
          }),
          db.payment.aggregate({
            where: {
              provider: "ORGANIZER_DIRECT",
              confirmedAt: { not: null },
              booking: { eventId: event.id, paymentState: "CONFIRMED" },
            },
            _sum: { amount: true },
          }),
        ]);
        return {
          ...event,
          pendingPaymentReviews,
          cancellationImpact: {
            bookings: event._count.bookings,
            pendingRegistrations,
            activeTickets,
            confirmedPaymentAmount: confirmed._sum.amount || 0,
          },
        };
      }),
    );
    const destinations = await db.paymentDestination.findMany({
      where: { organizerId: user.id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
    const verification = await db.organizerVerification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const queue =
      user.role === "ADMIN"
        ? {
            events: await db.event.findMany({
              where: {
                status: { in: ["PENDING_REVIEW", "PUBLISHED", "SUSPENDED"] },
              },
              include: {
                organizer: {
                  select: { id: true, name: true, verification: true },
                },
                tiers: true,
                fields: true,
                paymentDestination: { include: { activeVersion: true } },
              },
              orderBy: { createdAt: "desc" },
            }),
            recipients: await db.paymentRecipientVersion.findMany({
              include: {
                destination: {
                  include: { organizer: { select: { name: true, id: true } } },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
            verifications: await db.organizerVerification.findMany({
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            }),
          }
        : null;
    return json({
      events: summarizedEvents,
      identity,
      creatorReadiness: await eventCreatorReadiness(db, user.id),
      destinations,
      verification,
      reviewQueue: queue,
      testOnly: isolatedTestData(),
      salesEnabled: false,
    });
  }
  if (p.startsWith("payment-qr/")) {
    if (!user) throw Error("401:Please sign in.");
    const v = await db.paymentRecipientVersion.findUniqueOrThrow({
      where: { id: p.split("/")[1] },
      include: { destination: true, qrAsset: true },
    });
    if (user.role !== "ADMIN" && v.destination.organizerId !== user.id)
      throw Error("403:Private organizer QR.");
    if (!v.qrAsset.private || !v.qrAsset.data)
      throw Error("404:QR unavailable.");
    return new NextResponse(new Uint8Array(v.qrAsset.data), {
      headers: {
        "Content-Type": v.qrAsset.mime || "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }
  return null;
}
export async function managementPost(p: string, user: any, input: any) {
  const routes = [
    "staff-assignment",
    "event-workspace",
    "organizer-identity",
    "event-draft",
    "event-submit",
    "event-review",
    "payment-destination",
    "payment-destination-review",
    "payment-destination-action",
    "verification-submit",
    "verification-review",
    "become-organizer",
  ];
  if (!routes.includes(p)) return null;
  await consumeRateLimit("management:" + p, user.id, 40, 60000);
  if (p === "staff-assignment") {
    const d = z
      .object({
        eventId: id,
        username: z.string().min(3).max(24),
        active: z.boolean(),
        canViewGuests: z.boolean(),
        canCheckIn: z.boolean(),
        canReviewPayments: z.boolean(),
        canApproveRegistrations: z.boolean(),
        canViewLocation: z.boolean(),
      })
      .strict()
      .parse(input);
    await eventPermission(db, user.id, d.eventId, "manage");
    const target = await db.user.findUnique({
      where: { username: d.username.toLowerCase() },
    });
    if (!target?.active) throw Error("404:Active account unavailable.");
    const { username, ...permissions } = d;
    return json(
      await setEventStaff(user.id, { ...permissions, userId: target.id }),
    );
  }
  if (p === "become-organizer") {
    z.object({}).strict().parse(input);
    return json(await activateOrganizer(user.id));
  }
  if (p === "organizer-identity") {
    const d = z
      .object({ name: z.string().trim().min(2).max(80) })
      .strict()
      .parse(input);
    return json(
      await transaction(async (tx) => {
        await organizerActor(tx, user.id);
        await ensureOrganizerIdentity(tx, user.id);
        const identity = await tx.organizerIdentity.update({
          where: { userId: user.id },
          data: { name: d.name },
        });
        await audit(tx, user.id, "ORGANIZER_NAME_UPDATED", user.id, {
          entityType: "USER",
        });
        return identity;
      }),
    );
  }
  if (p === "event-workspace") {
    const result = await saveEventWorkspace(user.id, input);
    return result.validation
      ? json(result.validation, { status: 400 })
      : json(result);
  }
  if (p === "event-draft") return json(await saveEventDraft(user.id, input));
  if (p === "event-submit") {
    const eventId = id.parse(input.eventId);
    if (input.wizard === true) {
      const { event } = await eventPermission(db, user.id, eventId, "manage");
      const fieldErrors = await publicationFieldErrors(db, event);
      if (Object.keys(fieldErrors).length) {
        return json(
          {
            error: Object.values(fieldErrors)[0],
            fieldErrors,
            step: firstInvalidStep(fieldErrors),
          },
          { status: 400 },
        );
      }
    }
    return json(await submitEvent(user.id, eventId));
  }
  if (p === "event-review") {
    const d = z
      .object({
        eventId: id,
        decision: z.enum(["APPROVE", "REJECT", "CHANGES_REQUESTED", "SUSPEND"]),
        notes: z.string().trim().max(1000).default(""),
      })
      .strict()
      .parse(input);
    if (user.role !== "ADMIN")
      throw Error("403:Administrator access required.");
    if (
      ["REJECT", "CHANGES_REQUESTED", "SUSPEND"].includes(d.decision) &&
      d.notes.length < 5
    )
      throw Error("400:Add a reason for this review.");
    if (d.decision === "APPROVE" || d.decision === "SUSPEND") {
      if (d.decision === "APPROVE") {
        const event = await db.event.findUniqueOrThrow({
          where: { id: d.eventId },
        });
        if (event.organizerId === user.id)
          throw Error("403:Independent event review required.");
      }
      await updateEventLifecycle(
        user.id,
        d.eventId,
        d.decision === "APPROVE" ? "PUBLISHED" : "SUSPENDED",
        {
          notes: d.notes,
          reviewerId: user.id,
          outcome: d.decision === "APPROVE" ? "APPROVED" : "SUSPENDED",
        },
      );
      if (
        d.decision === "APPROVE" &&
        process.env.NODE_ENV === "development" &&
        process.env.MIXERMATES_TEST_LAB === "enabled"
      ) {
        await (
          await import("./test-lab")
        ).authorizeReviewedLabEvent(d.eventId, user.id);
      }
      return json({ ok: true });
    }
    return json(
      await transaction(async (tx) => {
        const e = await tx.event.findUniqueOrThrow({
          where: { id: d.eventId },
        });
        if (e.status !== "PENDING_REVIEW")
          throw Error("409:Only pending submissions can be returned.");
        await tx.event.update({
          where: { id: e.id },
          data: {
            status: "DRAFT",
            reviewOutcome: d.decision,
            reviewNotes: d.notes,
            reviewedAt: new Date(),
            reviewedById: user.id,
            stateVersion: { increment: 1 },
          },
        });
        await audit(tx, user.id, "EVENT_REVIEW_" + d.decision, e.id, {
          eventId: e.id,
          entityType: "EVENT",
          previousState: e.status,
          newState: "DRAFT",
        });
        await notify(
          tx,
          e.organizerId,
          "event-review:" + e.id + ":" + e.stateVersion,
          "Event review update",
          d.notes,
        );
        return { ok: true };
      }),
    );
  }
  if (p === "payment-destination") {
    const d = z
      .object({
        destinationId: id.optional(),
        methodType: z.enum(["DUITNOW", "TOUCH_N_GO", "BANK_QR"]),
        label: z.string(),
        recipientName: z.string(),
        recipientReference: z.string().default(""),
        qrAssetId: id,
        instructions: z.string().default(""),
        organizerReference: z.string().default(""),
        displayName: z.string().default(""),
      })
      .strict()
      .parse(input);
    const { destinationId, ...rest } = d;
    return json(await submitPaymentDestination(user.id, rest, destinationId));
  }
  if (p === "payment-destination-review") {
    const d = z
      .object({
        versionId: id,
        decision: z.enum(["APPROVE", "REJECT", "CORRECTION"]),
        notes: z.string().trim().max(1000),
        procedure: z.string().trim().max(1000).default(""),
        recipientChecked: z.boolean().default(false),
      })
      .strict()
      .parse(input);
    if (
      d.decision === "APPROVE" &&
      (!d.recipientChecked || d.procedure.length < 20)
    )
      throw Error(
        "400:Document how recipient ownership was checked before approval.",
      );
    if (d.decision !== "APPROVE" && d.notes.length < 5)
      throw Error("400:Add the correction or rejection reason.");
    return json(
      await reviewPaymentDestination(
        user.id,
        d.versionId,
        d.decision === "APPROVE",
        {
          notes:
            d.decision === "CORRECTION"
              ? "Correction requested: " + d.notes
              : d.notes,
          procedure: d.procedure,
        },
      ),
    );
  }
  if (p === "payment-destination-action") {
    const d = z
      .object({
        destinationId: id,
        action: z.enum(["DISABLE", "ACTIVATE", "DEFAULT"]),
        versionId: id.optional(),
        reason: note,
      })
      .strict()
      .parse(input);
    return json(
      await transaction(async (tx) => {
        const u = await actor(tx, user.id);
        const destination = await tx.paymentDestination.findUniqueOrThrow({
          where: { id: d.destinationId },
        });
        if (
          (d.action === "ACTIVATE" && u.role !== "ADMIN") ||
          (d.action !== "ACTIVATE" &&
            u.role !== "ADMIN" &&
            destination.organizerId !== u.id)
        )
          throw Error("403:Payment destination permission required.");
        if (d.action === "DISABLE") {
          await tx.paymentDestination.update({
            where: { id: destination.id },
            data: { status: "DISABLED", isDefault: false },
          });
          if (destination.activeVersionId)
            await tx.paymentRecipientVersion.update({
              where: { id: destination.activeVersionId },
              data: { disabledAt: new Date() },
            });
        } else {
          const version = await tx.paymentRecipientVersion.findUniqueOrThrow({
            where: { id: d.versionId || destination.activeVersionId || "" },
          });
          if (
            version.destinationId !== destination.id ||
            version.status !== "APPROVED" ||
            !version.approvedAt
          )
            throw Error("409:Only an approved version can be activated.");
          if (d.action === "DEFAULT") {
            if (destination.status !== "APPROVED" || version.disabledAt)
              throw Error(
                "409:Disabled destinations cannot become the default.",
              );
            await tx.paymentDestination.updateMany({
              where: { organizerId: destination.organizerId, isDefault: true },
              data: { isDefault: false },
            });
            await tx.paymentDestination.update({
              where: { id: destination.id },
              data: { isDefault: true },
            });
          } else {
            await tx.paymentRecipientVersion.update({
              where: { id: version.id },
              data: { disabledAt: null },
            });
            await tx.paymentDestination.update({
              where: { id: destination.id },
              data: { status: "APPROVED", activeVersionId: version.id },
            });
          }
        }
        await audit(
          tx,
          u.id,
          "PAYMENT_DESTINATION_" + d.action,
          destination.id,
          { entityType: "PAYMENT_DESTINATION", reasonCode: d.reason },
        );
        return { ok: true };
      }),
    );
  }
  if (p === "verification-submit") {
    const d = z
      .object({ note: z.string().trim().min(20).max(1500) })
      .strict()
      .parse(input);
    return json(
      await transaction(async (tx) => {
        await organizerActor(tx, user.id);
        const prior = await tx.organizerVerification.findFirst({
          where: { userId: user.id, status: "PENDING_REVIEW" },
        });
        if (prior) return prior;
        const v = await tx.organizerVerification.create({
          data: { userId: user.id, note: d.note, testOnly: true },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { verification: "PENDING_REVIEW" },
        });
        await audit(tx, user.id, "ORGANIZER_VERIFICATION_SUBMITTED", v.id, {
          entityType: "ORGANIZER_VERIFICATION",
          newState: "PENDING_REVIEW",
        });
        await notifyAdmins(
          tx,
          "verify-queue:" + v.id,
          "Organizer verification requested",
          "A fictional organizer application needs review.",
        );
        return v;
      }),
    );
  }
  if (p === "verification-review") {
    const d = z
      .object({
        id,
        approve: z.boolean(),
        notes: note,
        identityChecked: z.boolean(),
      })
      .strict()
      .parse(input);
    return json(
      await transaction(async (tx) => {
        const u = await actor(tx, user.id);
        if (u.role !== "ADMIN")
          throw Error("403:Administrator access required.");
        const v = await tx.organizerVerification.findUniqueOrThrow({
          where: { id: d.id },
        });
        if (v.userId === user.id)
          throw Error("403:Independent organizer review is required.");
        if (!isolatedTestData())
          throw Error(
            "503:Real organizer verification requires the approved external procedure; only local fictional review is enabled.",
          );
        if (d.approve && !d.identityChecked)
          throw Error(
            "400:Confirm the fictional local verification procedure.",
          );
        if (v.status !== "PENDING_REVIEW")
          throw Error("409:Verification already reviewed.");
        const status = d.approve ? "VERIFIED" : "REJECTED";
        await tx.organizerVerification.update({
          where: { id: v.id },
          data: {
            status,
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNotes: d.notes,
            testOnly: true,
          },
        });
        await tx.user.update({
          where: { id: v.userId },
          data: { verification: status },
        });
        await audit(tx, user.id, "ORGANIZER_VERIFICATION_" + status, v.id, {
          entityType: "ORGANIZER_VERIFICATION",
          previousState: v.status,
          newState: status,
        });
        await notify(
          tx,
          v.userId,
          "verification-reviewed:" + v.id,
          "Organizer review completed",
          "Your fictional organizer verification request was reviewed.",
          "/organizer?tab=My%20events",
        );
        return { ok: true };
      }),
    );
  }
  return null;
}
