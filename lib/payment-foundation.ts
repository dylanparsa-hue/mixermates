import { accrueCommission } from "./ticket-commission";
import {
  digest,
  referenceDigest,
  evidenceClaims,
  evidenceRisks,
} from "./payment-risk";
import { db } from "./db";
import { z } from "zod";
import {
  actor,
  audit,
  eventFence,
  eventPermission,
  isolatedTestData,
  notify,
  notifyAdmins,
  transaction,
} from "./domain-core";
import {
  eligibility,
  issueEligibleTickets,
  issueTickets,
} from "./booking-domain";
const destinationInput = z
  .object({
    methodType: z.enum(["DUITNOW", "TOUCH_N_GO", "BANK_QR"]),
    label: z.string().trim().min(2).max(100),
    recipientName: z.string().trim().min(2).max(160),
    recipientReference: z.string().trim().max(160).default(""),
    instructions: z.string().trim().max(1000).default(""),
    organizerReference: z.string().trim().max(100).default(""),
    displayName: z.string().trim().max(100).default(""),
    qrAssetId: z.string().min(1).max(191),
  })
  .strict();
export async function submitPaymentDestination(
  organizerId: string,
  input: z.input<typeof destinationInput>,
  destinationId?: string,
) {
  const d = destinationInput.parse(input);
  return transaction(async (tx) => {
    const user = await actor(tx, organizerId);
    if (
      user.role !== "ADMIN" &&
      user.role !== "ORGANIZER" &&
      !user.capabilities.some((c) => c.capability === "ORGANIZER")
    )
      throw Error("403:Organizer capability required.");
    if (destinationId) {
      const existing = await tx.paymentDestination.findUniqueOrThrow({
        where: { id: destinationId },
      });
      if (
        existing.organizerId !== organizerId ||
        existing.methodType !== d.methodType
      )
        throw Error(
          "403:This payment destination belongs to another organizer or method.",
        );
    }
    const file = await tx.fileUpload.findUnique({ where: { id: d.qrAssetId } });
    if (
      !file ||
      file.userId !== organizerId ||
      !file.private ||
      !file.data ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.mime || "") ||
      file.data.length > 4_000_000
    )
      throw Error("400:A private organizer-owned QR image is required.");
    if (!destinationId) {
      const prior = await tx.paymentRecipientVersion.findFirst({
        where: {
          qrAssetId: d.qrAssetId,
          recipientName: d.recipientName,
          recipientReference: d.recipientReference,
          instructions: d.instructions,
          organizerReference: d.organizerReference,
          displayName: d.displayName,
          destination: {
            organizerId,
            methodType: d.methodType,
            label: d.label,
          },
        },
      });
      if (prior) return prior;
    }
    const destination = destinationId
      ? await tx.paymentDestination.findUniqueOrThrow({
          where: { id: destinationId },
        })
      : await tx.paymentDestination.create({
          data: { organizerId, methodType: d.methodType, label: d.label },
        });
    if (
      destination.organizerId !== organizerId ||
      destination.methodType !== d.methodType
    )
      throw Error(
        "403:This payment destination belongs to another organizer or method.",
      );
    const latest = await tx.paymentRecipientVersion.findFirst({
      where: { destinationId: destination.id },
      orderBy: { version: "desc" },
    });
    const version = await tx.paymentRecipientVersion.create({
      data: {
        destinationId: destination.id,
        version: (latest?.version || 0) + 1,
        recipientName: d.recipientName,
        recipientReference: d.recipientReference,
        instructions: d.instructions,
        organizerReference: d.organizerReference,
        displayName: d.displayName,
        qrAssetId: d.qrAssetId,
        testOnly: true,
      },
    });
    await audit(tx, organizerId, "PAYMENT_DESTINATION_SUBMITTED", version.id, {
      entityType: "RECIPIENT_VERSION",
      newState: "PENDING_REVIEW",
    });
    await notifyAdmins(
      tx,
      "qr-submit:" + version.id,
      "Payment QR awaiting review",
      "A private recipient version needs independent review.",
    );
    return version;
  });
}
export async function reviewPaymentDestination(
  adminId: string,
  versionId: string,
  approve: boolean,
  review: { notes?: string; procedure?: string } = {},
) {
  return transaction(async (tx) => {
    const admin = await actor(tx, adminId);
    if (admin.role !== "ADMIN")
      throw Error("403:Administrator access required.");
    const version = await tx.paymentRecipientVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { destination: true },
    });
    if (version.destination.organizerId === adminId)
      throw Error("403:Independent recipient review is required.");
    if (
      approve &&
      !isolatedTestData() &&
      (!review.procedure || review.procedure.trim().length < 20)
    )
      throw Error(
        "400:Document independent recipient verification before approval.",
      );
    const target = approve ? "APPROVED" : "REJECTED";
    if (version.status === target) return version;
    if (version.status !== "PENDING_REVIEW")
      throw Error("409:Recipient version was already reviewed.");
    const changed = await tx.paymentRecipientVersion.update({
      where: { id: versionId },
      data: {
        status: target,
        approvedById: adminId,
        approvedAt: approve ? new Date() : null,
        reviewNotes: review.notes || "",
        verificationProcedure: review.procedure || "LOCAL_TEST_ONLY",
      },
    });
    if (approve)
      await tx.paymentDestination.update({
        where: { id: version.destinationId },
        data: { activeVersionId: versionId, status: "APPROVED" },
      });
    await audit(tx, adminId, "PAYMENT_DESTINATION_" + target, versionId, {
      entityType: "RECIPIENT_VERSION",
      previousState: version.status,
      newState: target,
    });
    await notify(
      tx,
      version.destination.organizerId,
      "qr-reviewed:" + version.id,
      "Payment QR review completed",
      "Your recipient version was " +
        target.toLowerCase() +
        ". Review the notes in Payment methods.",
      "/organizer?tab=Payment%20methods",
    );
    return changed;
  });
}
export async function submitPaymentEvidence(
  userId: string,
  bookingId: string,
  receiptUploadId: string,
  kind: "PAYMENT" | "BYOB" = "PAYMENT",
  claims: z.input<typeof evidenceClaims> = {},
) {
  const claim = evidenceClaims.parse(claims);
  return transaction(async (tx) => {
    await actor(tx, userId);
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { event: true, payment: true },
    });
    if (b.userId !== userId) throw Error("403:Private booking.");
    const file = await tx.fileUpload.findUnique({
      where: { id: receiptUploadId },
    });
    if (
      !file ||
      file.userId !== userId ||
      !file.private ||
      !file.data ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.mime || "") ||
      file.data.length > 10_000_000
    )
      throw Error(
        "400:One private JPG/PNG evidence file up to 10 MB is required.",
      );
    if (
      !b.payment ||
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      !b.reservationExpiresAt ||
      (!b.reviewHold && b.reservationExpiresAt <= new Date())
    )
      throw Error("409:Booking is not accepting evidence.");
    await eventFence(tx, b.event, true);
    const prior = await tx.paymentEvidence.findUnique({
      where: {
        paymentId_receiptUploadId: { paymentId: b.payment.id, receiptUploadId },
      },
    });
    if (prior) {
      if (prior.kind !== kind)
        throw Error("409:Evidence was already used for another review.");
      return prior;
    }
    if (
      kind === "PAYMENT" &&
      (!b.paymentRequired ||
        !["AWAITING_PAYMENT", "REJECTED"].includes(b.paymentState))
    )
      throw Error("409:Payment proof cannot be submitted in this state.");
    if (kind === "BYOB" && !b.byobRequired)
      throw Error("409:BYOB evidence is not required for this booking.");
    const evidence = await tx.paymentEvidence.create({
      data: {
        paymentId: b.payment.id,
        receiptSha256: digest(file.data),
        referenceDigest: referenceDigest(claim.paymentReference),
        claimedAmount: claim.claimedAmount,
        claimedRecipient: claim.claimedRecipient,
        receiptUploadId,
        submittedById: userId,
        recipientVersionId: b.recipientVersionId,
        expectedAmount: b.total,
        kind,
      },
    });
    const risks = await evidenceRisks(tx, evidence, b);
    // Back-propagate only within the owning organizer, so earlier receipts remain findable in the risk queue.
    const matches = await tx.paymentEvidence.findMany({
      where: {
        id: { not: evidence.id },
        kind,
        payment: { booking: { event: { organizerId: b.event.organizerId } } },
        OR: [
          { receiptSha256: evidence.receiptSha256 },
          ...(evidence.referenceDigest
            ? [{ referenceDigest: evidence.referenceDigest }]
            : []),
        ],
      },
      select: {
        id: true,
        receiptSha256: true,
        referenceDigest: true,
        riskIndicators: true,
      },
      take: 1000,
    });
    for (const match of matches) {
      const previous: string[] = JSON.parse(match.riskIndicators || "[]"),
        codes = [
          ...new Set([
            ...previous,
            ...(match.receiptSha256 === evidence.receiptSha256
              ? ["DUPLICATE_FILE"]
              : []),
            ...(evidence.referenceDigest &&
            match.referenceDigest === evidence.referenceDigest
              ? ["REUSED_REFERENCE"]
              : []),
          ]),
        ];
      if (codes.length !== previous.length) {
        await tx.paymentEvidence.update({
          where: { id: match.id },
          data: { riskIndicators: JSON.stringify(codes) },
        });
        await audit(tx, userId, "PAYMENT_RISK_INDICATOR", match.id, {
          eventId: b.eventId,
          entityType: "PAYMENT_EVIDENCE",
          reasonCode: "POSSIBLE_DUPLICATE",
        });
      }
    }
    await tx.paymentEvidence.update({
      where: { id: evidence.id },
      data: { riskIndicators: JSON.stringify(risks) },
    });
    for (const code of risks)
      await audit(tx, userId, "PAYMENT_RISK_INDICATOR", evidence.id, {
        eventId: b.eventId,
        entityType: "PAYMENT_EVIDENCE",
        reasonCode: code,
      });
    if (kind === "PAYMENT") {
      await tx.booking.update({
        where: { id: b.id },
        data: {
          reviewHold: true,
          lifecycle: "PENDING",
          paymentState: "PROOF_SUBMITTED",
          paymentStatus: "PROOF_SUBMITTED",
          version: { increment: 1 },
        },
      });
      await tx.payment.update({
        where: { id: b.payment.id },
        data: { workflowState: "PROOF_SUBMITTED", status: "PROOF_SUBMITTED" },
      });
    }
    if (kind === "BYOB")
      await tx.booking.update({
        where: { id: b.id },
        data: {
          reviewHold: true,
          byobState: "PENDING",
          version: { increment: 1 },
        },
      });
    await audit(tx, userId, kind + "_PROOF_SUBMITTED", evidence.id, {
      eventId: b.eventId,
      entityType: "PAYMENT_EVIDENCE",
      newState: "PROOF_SUBMITTED",
    });
    await notify(
      tx,
      b.userId,
      `proof:${evidence.id}`,
      "Evidence received",
      "Evidence was saved for review; it does not confirm funds or admission.",
    );
    await notify(
      tx,
      b.event.organizerId,
      `proof-owner:${evidence.id}`,
      "New proof to review",
      "A private booking has new evidence. Check funds independently before confirming payment.",
      "/organizer?tab=Booking%20reviews&event=" + b.eventId,
    );
    return evidence;
  });
}
export async function reviewPayment(
  actorId: string,
  bookingId: string,
  input: {
    evidenceId: string;
    decision: "UNDER_REVIEW" | "CONFIRMED" | "REJECTED";
    fundsVerified?: boolean;
    receivedAmount?: number;
    notes?: string;
  },
) {
  const d = z
    .object({
      evidenceId: z.string().min(1).max(191),
      decision: z.enum(["UNDER_REVIEW", "CONFIRMED", "REJECTED"]),
      fundsVerified: z.boolean().default(false),
      receivedAmount: z.number().int().nonnegative().optional(),
      notes: z.string().max(500).default(""),
    })
    .strict()
    .parse(input);
  const reviewed = await transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        event: true,
        payment: { include: { evidence: true } },
        recipientVersion: true,
      },
    });
    await eventPermission(tx, actorId, b.eventId, "payments");
    if (actorId === b.userId)
      throw Error("403:You cannot verify your own payment.");
    if (
      b.origin !== "REAL" ||
      !b.paymentRequired ||
      !b.payment ||
      b.payment.origin !== "REAL" ||
      b.payment.provider === "LOCAL_TEST_SIMULATOR" ||
      b.payment.amount !== b.total
    )
      throw Error("409:Independent real-payment records are required.");
    if (b.paymentState === d.decision && d.decision !== "UNDER_REVIEW") {
      const previous = await tx.paymentReview.findFirst({
        where: {
          paymentId: b.payment.id,
          evidenceId: d.evidenceId,
          decision: d.decision,
          reviewerId: actorId,
        },
      });
      if (
        !previous ||
        (d.decision === "CONFIRMED" &&
          (!d.fundsVerified || d.receivedAmount !== b.total))
      )
        throw Error(
          "409:Review retry does not match the original confirmation.",
        );
      return b;
    }
    if (
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      !b.reservationExpiresAt ||
      (!b.reviewHold && b.reservationExpiresAt <= new Date()) ||
      !["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(b.paymentState)
    )
      throw Error("409:Payment cannot be reviewed in its current state.");
    await eventFence(tx, b.event, true);
    const evidence = b.payment.evidence.find(
      (e) => e.id === d.evidenceId && e.kind === "PAYMENT",
    );
    if (
      !evidence ||
      !["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(evidence.status) ||
      evidence.submittedById !== b.userId ||
      evidence.expectedAmount !== b.total ||
      evidence.recipientVersionId !== b.recipientVersionId ||
      !b.recipientVersion?.approvedAt ||
      !b.recipientSnapshot
    )
      throw Error(
        "409:Payment evidence does not match the booking instructions.",
      );
    if (
      d.decision === "CONFIRMED" &&
      (!d.fundsVerified || d.receivedAmount !== b.total)
    )
      throw Error(
        "400:Confirm actual incoming funds and the exact expected amount.",
      );
    const reviewer = await actor(tx, actorId);
    const codes = await evidenceRisks(
      tx,
      evidence,
      b,
      reviewer.role === "ADMIN",
    );
    await audit(tx, actorId, "PAYMENT_RISK_REVIEWED", evidence.id, {
      eventId: b.eventId,
      entityType: "PAYMENT_EVIDENCE",
      reasonCode: codes.join(",").slice(0, 191) || "NO_CURRENT_INDICATORS",
      newState: d.decision,
    });
    await tx.paymentReview.create({
      data: {
        paymentId: b.payment.id,
        evidenceId: evidence.id,
        reviewerId: actorId,
        decision: d.decision,
        fundsVerified: d.decision === "CONFIRMED",
        notes: d.notes,
        receivedAmount: d.receivedAmount,
        recipientVersionId: b.recipientVersionId,
      },
    });
    await tx.paymentEvidence.update({
      where: { id: evidence.id },
      data: { status: d.decision === "CONFIRMED" ? "ACCEPTED" : d.decision },
    });
    await tx.payment.update({
      where: { id: b.payment.id },
      data: {
        workflowState: d.decision,
        status: d.decision,
        confirmedAt: d.decision === "CONFIRMED" ? new Date() : null,
      },
    });
    await tx.booking.update({
      where: { id: b.id },
      data: {
        paymentState: d.decision,
        paymentStatus: d.decision,
        version: { increment: 1 },
      },
    });
    if (d.decision === "CONFIRMED") await accrueCommission(tx, b.id);
    await audit(tx, actorId, "PAYMENT_" + d.decision, b.payment.id, {
      eventId: b.eventId,
      entityType: "PAYMENT",
      previousState: b.paymentState,
      newState: d.decision,
    });
    await notify(
      tx,
      b.userId,
      `payment:${b.id}:${d.decision}:${d.evidenceId}`,
      "Payment review update",
      d.decision === "CONFIRMED"
        ? "The organizer confirmed funds; remaining registration requirements still apply."
        : "Your evidence review was updated.",
    );
    const fresh = await tx.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: {
        event: true,
        user: true,
        recipientVersion: true,
        payment: {
          include: { reviews: true, evidence: true, simulationAttempts: true },
        },
        tickets: true,
      },
    });
    return fresh;
  });
  // Confirmed incoming funds commit before issuance. A rendering/issuance failure never asks for payment again.
  const ready = await dbForIssue(bookingId);
  if (eligibility(ready, ready.event, ready.payment).eligible) {
    try {
      await issueTickets(actorId, bookingId);
    } catch {
      await transaction(async (tx) => {
        await audit(tx, actorId, "ISSUANCE_RETRY_REQUIRED", bookingId, {
          eventId: ready.eventId,
          entityType: "BOOKING",
        });
        await notify(
          tx,
          ready.userId,
          `issuance-retry:${bookingId}`,
          "Payment recorded",
          "Your confirmed payment is safe. The organizer is resolving ticket issuance; do not pay again.",
        );
      });
    }
  }
  return reviewed;
}

export async function reviewByobEvidence(
  actorId: string,
  evidenceId: string,
  approve: boolean,
  notes = "",
) {
  return transaction(async (tx) => {
    const evidence = await tx.paymentEvidence.findUniqueOrThrow({
      where: { id: evidenceId },
      include: {
        payment: { include: { booking: { include: { event: true } } } },
      },
    });
    const b = evidence.payment.booking;
    await eventPermission(tx, actorId, b.eventId, "registrations");
    if (actorId === b.userId)
      throw Error("403:Independent BYOB review required.");
    const target = approve ? "APPROVED" : "REJECTED";
    if (b.byobState === target) return b;
    if (
      evidence.kind !== "BYOB" ||
      !b.byobRequired ||
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      !b.reservationExpiresAt ||
      (!b.reviewHold && b.reservationExpiresAt <= new Date())
    )
      throw Error("409:BYOB review is unavailable.");
    await eventFence(tx, b.event, true);
    await tx.paymentEvidence.update({
      where: { id: evidenceId },
      data: { status: approve ? "ACCEPTED" : "REJECTED" },
    });
    await tx.booking.update({
      where: { id: b.id },
      data: { byobState: target, version: { increment: 1 } },
    });
    await audit(tx, actorId, "BYOB_" + target, b.id, {
      reasonCode: notes || undefined,
      eventId: b.eventId,
      entityType: "BOOKING",
      previousState: b.byobState,
      newState: target,
    });
    await notify(
      tx,
      b.userId,
      `byob:${b.id}:${target}`,
      "BYOB review update",
      "Your registration evidence was reviewed separately from payment confirmation.",
    );
    const fresh = await tx.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: {
        event: true,
        user: true,
        recipientVersion: true,
        payment: {
          include: { reviews: true, evidence: true, simulationAttempts: true },
        },
      },
    });
    if (approve && eligibility(fresh, fresh.event, fresh.payment).eligible)
      await issueEligibleTickets(tx, b.id, actorId);
    return fresh;
  });
}

const dbForIssue = (id: string) =>
  db.booking.findUniqueOrThrow({
    where: { id },
    include: {
      event: true,
      user: true,
      recipientVersion: true,
      payment: {
        include: { reviews: true, evidence: true, simulationAttempts: true },
      },
    },
  });
