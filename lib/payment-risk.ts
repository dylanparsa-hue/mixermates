import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { audit, eventPermission, transaction, type Tx } from "./domain-core";

export const evidenceClaims = z
  .object({
    claimedAmount: z.number().int().nonnegative().max(2_000_000_000).optional(),
    claimedRecipient: z.string().trim().min(1).max(160).optional(),
    paymentReference: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export const digest = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
export const referenceDigest = (s?: string) =>
  s ? digest(s.normalize("NFKC").toUpperCase().replace(/\s+/g, "")) : null;
export const riskLabels: Record<string, string> = {
  DUPLICATE_FILE:
    "POSSIBLE DUPLICATE — identical evidence was submitted again. Shared purchases may be legitimate.",
  REUSED_REFERENCE:
    "POSSIBLE DUPLICATE — this payment reference was submitted again.",
  AMOUNT_MISMATCH:
    "NEEDS REVIEW — claimed amount differs from the booking amount.",
  RECIPIENT_MISMATCH:
    "NEEDS REVIEW — claimed recipient differs from the original instructions.",
  REPEATED_REJECTIONS:
    "NEEDS REVIEW — multiple earlier submissions were rejected.",
  REPEATED_CORRECTIONS: "NEEDS REVIEW — repeated evidence corrections.",
  OUTSIDE_WINDOW:
    "NEEDS REVIEW — submission was outside the original reservation window.",
  DESTINATION_INELIGIBLE:
    "NEEDS REVIEW — the original payment destination is no longer eligible for new payments.",
  BOOKING_INACTIVE: "NEEDS REVIEW — booking is cancelled, expired or rejected.",
  LEGACY_UNHASHED:
    "NEEDS REVIEW — historical evidence has not been fingerprinted.",
};
const normalize = (v: string) =>
  v.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
// Only counts are read. Matching customers, booking IDs, files and organizers never leave this service.
export async function evidenceRisks(
  tx: Tx,
  evidence: any,
  booking: any,
  platform = false,
) {
  const codes: string[] = [];
  const scope = platform
    ? {}
    : {
        payment: {
          booking: { event: { organizerId: booking.event.organizerId } },
        },
      };
  if (
    evidence.receiptSha256 &&
    (await tx.paymentEvidence.count({
      where: {
        ...scope,
        id: { not: evidence.id },
        kind: evidence.kind,
        receiptSha256: evidence.receiptSha256,
      },
    }))
  )
    codes.push("DUPLICATE_FILE");
  if (
    evidence.referenceDigest &&
    (await tx.paymentEvidence.count({
      where: {
        ...scope,
        id: { not: evidence.id },
        kind: "PAYMENT",
        referenceDigest: evidence.referenceDigest,
      },
    }))
  )
    codes.push("REUSED_REFERENCE");
  if (!evidence.receiptSha256) codes.push("LEGACY_UNHASHED");
  if (
    evidence.claimedAmount !== null &&
    evidence.claimedAmount !== undefined &&
    evidence.claimedAmount !== booking.total
  )
    codes.push("AMOUNT_MISMATCH");
  const recipient = JSON.parse(booking.recipientSnapshot || "{}");
  if (
    evidence.claimedRecipient &&
    normalize(evidence.claimedRecipient) !==
      normalize(recipient.recipientName || "")
  )
    codes.push("RECIPIENT_MISMATCH");
  if (
    (await tx.paymentEvidence.count({
      where: {
        paymentId: evidence.paymentId,
        kind: evidence.kind,
        status: "REJECTED",
      },
    })) >= 2
  )
    codes.push("REPEATED_REJECTIONS");
  if (
    (await tx.paymentEvidence.count({
      where: { paymentId: evidence.paymentId, kind: evidence.kind },
    })) >= 4
  )
    codes.push("REPEATED_CORRECTIONS");
  if (
    booking.reservationExpiresAt &&
    evidence.createdAt > booking.reservationExpiresAt
  )
    codes.push("OUTSIDE_WINDOW");
  if (evidence.kind === "PAYMENT" && booking.recipientVersionId) {
    const version = await tx.paymentRecipientVersion.findUnique({
      where: { id: booking.recipientVersionId },
      include: { destination: true },
    });
    if (
      !version ||
      version.status !== "APPROVED" ||
      version.disabledAt ||
      version.destination.status !== "APPROVED"
    )
      codes.push("DESTINATION_INELIGIBLE");
  }
  if (["CANCELLED", "EXPIRED", "REJECTED"].includes(booking.lifecycle))
    codes.push("BOOKING_INACTIVE");
  return codes;
}
export async function paymentRiskView(userId: string, bookingId: string) {
  return transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        event: true,
        payment: {
          include: {
            evidence: { take: 50, orderBy: { createdAt: "desc" } },
            reviews: {
              take: 50,
              orderBy: { createdAt: "desc" },
              include: { reviewer: { select: { name: true } } },
            },
          },
        },
      },
    });
    const { user } = await eventPermission(tx, userId, b.eventId, "payments");
    const rows = [];
    for (const evidence of b.payment?.evidence || []) {
      const codes = await evidenceRisks(tx, evidence, b, user.role === "ADMIN");
      rows.push({
        id: evidence.id,
        kind: evidence.kind,
        status: evidence.status,
        createdAt: evidence.createdAt,
        claimedAmount: evidence.claimedAmount,
        claimedRecipient: evidence.claimedRecipient,
        referenceSupplied: !!evidence.referenceDigest,
        indicators: codes.map((code) => ({ code, label: riskLabels[code] })),
      });
    }
    await audit(tx, userId, "PAYMENT_RISK_VIEWED", bookingId, {
      eventId: b.eventId,
      entityType: "BOOKING",
      reasonCode: user.role === "ADMIN" ? "PLATFORM_SCOPE" : "ORGANIZER_SCOPE",
    });
    return {
      scope: user.role === "ADMIN" ? "PLATFORM" : "ORGANIZER",
      evidence: rows,
      reviews: (b.payment?.reviews || []).map((r) => ({
        id: r.id,
        decision: r.decision,
        reviewer: r.reviewer.name,
        notes: r.notes,
        createdAt: r.createdAt,
        receivedAmount: r.receivedAmount,
        fundsVerified: r.fundsVerified,
      })),
    };
  });
}
