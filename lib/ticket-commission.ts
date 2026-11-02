import { db } from "./db";
import {
  actor,
  eventPermission,
  isolatedTestData,
  type Tx,
} from "./domain-core";
import {
  simulatorPaymentConfirmed,
  SIMULATOR_PROVIDER,
} from "./simulator-policy";

/** Called only inside the payment confirmation transaction. Never backfills legacy sales. */
export async function accrueCommission(tx: Tx, bookingId: string) {
  const b = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      feeSnapshot: true,
      event: true,
      payment: { include: { reviews: true, simulationAttempts: true } },
    },
  });
  const fee = b.feeSnapshot,
    p = b.payment;
  if (!fee || fee.platformFee === 0) return;
  if (!isolatedTestData() || !b.testOnly)
    throw Error(
      "503:Real commission collection and activation remain disabled.",
    );
  if (
    !p ||
    p.amount !== fee.customerTotal ||
    b.total !== fee.customerTotal ||
    !p.confirmedAt ||
    p.workflowState !== "CONFIRMED"
  )
    throw Error("409:Verified payment required before commission accrues.");
  if (p.provider === SIMULATOR_PROVIDER) {
    if (!simulatorPaymentConfirmed(b, b.event, p))
      throw Error("409:Trusted simulator receipt required.");
  } else if (
    p.provider !== "ORGANIZER_DIRECT" ||
    !p.reviews.some(
      (r) =>
        r.decision === "CONFIRMED" &&
        r.fundsVerified &&
        r.receivedAmount === b.total &&
        r.reviewerId !== b.userId,
    )
  )
    throw Error("409:Independent incoming-funds confirmation required.");
  await tx.commissionEntry.upsert({
    where: { sourceKey: `accrual:${b.id}` },
    update: {},
    create: {
      bookingId: b.id,
      sourceKey: `accrual:${b.id}`,
      kind: "ACCRUAL",
      amount: fee.platformFee,
    },
  });
}
/** Refund cash is known; fee retention/reversal awaits approved business terms, never guessed. */
export async function flagRefundCommission(
  tx: Tx,
  bookingId: string,
  refundId: string,
  amount: number,
) {
  const fee = await tx.bookingFeeSnapshot.findUnique({ where: { bookingId } });
  if (!fee || fee.platformFee === 0) return;
  await tx.commissionEntry.upsert({
    where: { sourceKey: `refund:${refundId}` },
    update: {},
    create: {
      bookingId,
      sourceKey: `refund:${refundId}`,
      kind: "REFUND_POLICY_REVIEW",
      amount: 0,
      refundAmount: amount,
    },
  });
}
function empty() {
  return {
    ticketsSold: 0,
    faceValue: 0,
    absorbed: 0,
    passed: 0,
    accrued: 0,
    collected: 0,
    outstanding: 0,
    gatewayKnown: 0,
    gatewayUnknown: 0,
    organizerBeforeGateway: 0,
    organizerEstimate: 0 as number | null,
    refunds: 0,
    refundFeeReview: 0,
    pendingReviews: 0,
    refundObligations: 0,
    historicalPaidBookings: 0,
  };
}
/** Finance capability only. Real and fictional ledgers are never summed together. */
export async function commissionSummary(userId: string, eventId?: string) {
  const u = await actor(db, userId);
  if (eventId) await eventPermission(db, userId, eventId, "payments");
  const events = await db.event.findMany({
    where: {
      ...(eventId ? { id: eventId } : {}),
      ...(u.role === "ADMIN"
        ? {}
        : {
            OR: [
              { organizerId: userId },
              {
                staff: {
                  some: { userId, active: true, canReviewPayments: true },
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      title: true,
      testOnly: true,
      bookings: {
        where: { origin: "REAL", paymentRequired: true },
        include: {
          feeSnapshot: true,
          commissionEntries: true,
          payment: {
            include: { refunds: true, reviews: true, simulationAttempts: true },
          },
        },
      },
    },
  });
  const real = empty(),
    sandbox = empty();
  const rows = events.map((e) => {
    const s = empty();
    for (const b of e.bookings) {
      const p = b.payment;
      if (
        p?.provider === "ORGANIZER_DIRECT" &&
        ["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(b.paymentState)
      )
        s.pendingReviews++;
      const refunded =
        p?.refunds
          .filter((r) => r.status === "REFUND_CONFIRMED")
          .reduce((n, r) => n + r.amount, 0) || 0;
      const pendingRefunds =
        p?.refunds
          .filter((r) => !["REFUND_CONFIRMED", "REJECTED"].includes(r.status))
          .reduce((n, r) => n + r.amount, 0) || 0;
      s.refundObligations +=
        pendingRefunds ||
        (b.paymentState === "REFUND_PENDING" ? b.total - refunded : 0);
      // A browser/status flag alone is never treated as successful funds.
      const confirmed =
        !!p?.confirmedAt &&
        p.amount === b.total &&
        b.testOnly === e.testOnly &&
        (p.provider === SIMULATOR_PROVIDER
          ? b.testOnly &&
            p.simulationAttempts.some(
              (a) => a.kind === "PAYMENT" && a.outcome === "SUCCESS",
            )
          : p.provider === "ORGANIZER_DIRECT" &&
            p.reviews.some(
              (r) =>
                r.decision === "CONFIRMED" &&
                r.fundsVerified &&
                r.reviewerId !== b.userId &&
                r.receivedAmount === b.total,
            ));
      if (!confirmed || !p) continue;
      const f = b.feeSnapshot;
      s.ticketsSold += b.quantity;
      s.faceValue += f?.faceValue ?? b.total;
      if (!f) s.historicalPaidBookings++;
      s.absorbed += f?.policy === "ABSORB" ? f.platformFee : 0;
      s.passed += f?.policy === "CUSTOMER" ? f.platformFee : 0;
      s.accrued += b.commissionEntries
        .filter((x) => x.kind === "ACCRUAL")
        .reduce((n, x) => n + x.amount, 0);
      s.refundFeeReview += b.commissionEntries.some(
        (x) => x.kind === "REFUND_POLICY_REVIEW",
      )
        ? (f?.platformFee ?? 0)
        : 0;
      // No collection writer/provider exists in Phase 2. These are receivables, never received revenue.
      s.outstanding = s.accrued;
      if (p.gatewayFee !== null && p.gatewayFeeSource)
        s.gatewayKnown += p.gatewayFee;
      else s.gatewayUnknown++;
      s.organizerBeforeGateway += f?.organizerBeforeGateway ?? b.total;
      s.refunds += p.refunds
        .filter((x) => x.status === "REFUND_CONFIRMED")
        .reduce((n, x) => n + x.amount, 0);
    }
    s.organizerEstimate =
      s.refundFeeReview || s.refundObligations
        ? null
        : s.organizerBeforeGateway - s.gatewayKnown - s.refunds;
    const target = e.testOnly ? sandbox : real;
    for (const k of Object.keys(target) as (keyof typeof target)[]) {
      if (k === "organizerEstimate") continue;
      target[k] = (target[k] ?? 0) + (s[k] ?? 0);
    }
    return { eventId: e.id, title: e.title, testOnly: e.testOnly, ...s };
  });
  for (const s of [real, sandbox])
    s.organizerEstimate =
      s.refundFeeReview || s.refundObligations
        ? null
        : s.organizerBeforeGateway - s.gatewayKnown - s.refunds;
  return {
    real,
    sandbox,
    events: rows,
    collectionEnabled: false,
    notice:
      "Direct QR money goes to the organizer. Commission is owed, not collected. Gateway fees are organizer-borne; unknown fees are excluded from estimates. Refund commission awaits approved terms.",
  };
}
