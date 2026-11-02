import { accrueCommission, flagRefundCommission } from "./ticket-commission";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import {
  actor,
  audit,
  eventFence,
  notify,
  transaction,
  type Tx,
} from "./domain-core";
import { assertLabEnvironment } from "./test-lab";
import {
  simulatorEnvironment,
  simulatorEvent,
  SIMULATOR_PROVIDER,
} from "./simulator-policy";
import {
  eligibility,
  issueEligibleTickets,
  releaseInventory,
} from "./booking-domain";
import { refundEligibility } from "./event-operations";
import { submitPaymentEvidence } from "./payment-foundation";
import sharp from "sharp";

export async function assertSimulator(tx: Tx = db, request?: Request) {
  if (!simulatorEnvironment()) throw Error("404:Not found.");
  return assertLabEnvironment(request, tx);
}
const input = z
  .object({
    bookingId: z.string().min(1).max(191),
    idempotencyKey: z.string().uuid(),
    outcome: z.enum(["SUCCESS", "DECLINED", "CANCELLED"]),
  })
  .strict();
export async function simulatePayment(userId: string, raw: unknown) {
  const d = input.parse(raw);
  return transaction(async (tx) => {
    await assertSimulator(tx);
    await actor(tx, userId);
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
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
    if (
      b.userId !== userId ||
      !b.testOnly ||
      !simulatorEvent(b.event) ||
      b.payment?.provider !== SIMULATOR_PROVIDER ||
      !b.paymentRequired
    )
      throw Error("404:Test payment unavailable.");
    const prior = await tx.simulationAttempt.findUnique({
      where: { idempotencyKey: d.idempotencyKey },
    });
    if (prior) {
      if (
        prior.paymentId !== b.payment.id ||
        prior.kind !== "PAYMENT" ||
        prior.outcome !== d.outcome
      )
        throw Error("409:This attempt belongs to another selection.");
      return prior;
    }
    if (b.paymentState === "CONFIRMED" && b.payment.confirmedAt)
      return {
        outcome: "SUCCESS",
        reference: b.payment.simulationAttempts.find(
          (a) => a.outcome === "SUCCESS",
        )?.reference,
      };
    if (
      !["RESERVED", "PENDING"].includes(b.lifecycle) ||
      !b.inventoryHeld ||
      !b.reservationExpiresAt ||
      b.reservationExpiresAt <= new Date() ||
      b.event.startsAt <= new Date() ||
      b.event.salesPaused
    )
      throw Error(
        "409:This reservation is no longer payable. Start a fresh booking.",
      );
    await eventFence(tx, b.event, true);
    const receipt = await tx.simulationAttempt.create({
      data: {
        idempotencyKey: d.idempotencyKey,
        paymentId: b.payment.id,
        reference: "TEST-" + randomUUID(),
        kind: "PAYMENT",
        outcome: d.outcome,
      },
    });
    const state =
      d.outcome === "SUCCESS"
        ? "CONFIRMED"
        : d.outcome === "DECLINED"
          ? "REJECTED"
          : "AWAITING_PAYMENT";
    await tx.payment.update({
      where: { id: b.payment.id },
      data: {
        status: state,
        workflowState: state,
        confirmedAt: d.outcome === "SUCCESS" ? new Date() : null,
      },
    });
    await tx.booking.update({
      where: { id: b.id },
      data: {
        paymentState: state,
        paymentStatus: state,
        version: { increment: 1 },
      },
    });
    await audit(tx, userId, "SIMULATED_PAYMENT_" + d.outcome, b.id, {
      eventId: b.eventId,
      entityType: "BOOKING",
      newState: state,
      correlationId: receipt.reference,
      reasonCode: "Trusted local simulator. No funds moved.",
    });
    if (d.outcome === "SUCCESS") {
      await accrueCommission(tx, b.id);
      const fresh = await tx.booking.findUniqueOrThrow({
        where: { id: b.id },
        include: {
          event: true,
          user: true,
          recipientVersion: true,
          payment: {
            include: {
              reviews: true,
              evidence: true,
              simulationAttempts: true,
            },
          },
        },
      });
      if (eligibility(fresh, fresh.event, fresh.payment).eligible)
        await issueEligibleTickets(tx, b.id, userId);
    }
    await notify(
      tx,
      userId,
      "simulator:" + receipt.id,
      "Test payment " + d.outcome.toLowerCase(),
      "No money moved. Your booking shows the persisted test payment status.",
      "/bookings/" + b.id,
    );
    return receipt;
  });
}

export async function simulateRefund(userId: string, raw: unknown) {
  const d = input
    .extend({ outcome: z.enum(["SUCCESS", "PENDING", "FAILED"]), refundId: z.string().min(1).max(191).optional() })
    .parse(raw);
  return transaction(async (tx) => {
    await assertSimulator(tx);
    await actor(tx, userId);
    const b = await tx.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
      include: { event: true, payment: true },
    });
    if (
      b.userId !== userId ||
      !b.testOnly ||
      !simulatorEvent(b.event) ||
      b.payment?.provider !== SIMULATOR_PROVIDER ||
      !b.payment.confirmedAt
    )
      throw Error("404:Test refund unavailable.");
    const prior = await tx.simulationAttempt.findUnique({
      where: { idempotencyKey: d.idempotencyKey },
    });
    if (prior) {
      if (
        prior.kind !== "REFUND" ||
        prior.paymentId !== b.payment.id ||
        prior.outcome !== d.outcome ||
        (d.refundId !== undefined && prior.refundId !== d.refundId)
      )
        throw Error("409:Refund attempt selection changed.");
      return prior;
    }
    const r = d.refundId ? await tx.refund.findFirst({where:{id:d.refundId,paymentId:b.payment.id}}) : await tx.refund.findUnique({
      where: { requestKey: b.payment.id },
    });
    if (!r) throw Error("409:Request a test refund first.");
    if (r.status === "REFUND_CONFIRMED") return { outcome: "SUCCESS" };
    if (
      !["REQUESTED", "SIMULATED_PENDING", "SIMULATED_FAILED"].includes(r.status)
    )
      throw Error("409:This refund is under separate review.");
    const eligible = await refundEligibility(tx, b);
    if (!eligible.allowed || eligible.adminException)
      throw Error("409:" + eligible.reason);
    const receipt = await tx.simulationAttempt.create({
      data: {
        idempotencyKey: d.idempotencyKey,
        paymentId: b.payment.id,
        refundId: r.id,
        reference: "TEST-REFUND-" + randomUUID(),
        kind: "REFUND",
        outcome: d.outcome,
      },
    });
    const status =
      d.outcome === "SUCCESS" ? "REFUND_CONFIRMED" : "SIMULATED_" + d.outcome;
    // Pending/failed attempts do not claim settlement. Successful refunds use the existing ledger states.
    if (d.outcome === "SUCCESS") {
      const already = await tx.refund.aggregate({where:{paymentId:b.payment.id,status:"REFUND_CONFIRMED"},_sum:{amount:true}});
      if ((already._sum.amount || 0) + r.amount > b.payment.amount) throw Error("409:Refund exceeds the confirmed payment.");
      const paymentState = (already._sum.amount || 0) + r.amount === b.payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await releaseInventory(tx, b);
      await tx.booking.update({
        where: { id: b.id },
        data: {
          lifecycle: "CANCELLED",
          status: "CANCELLED",
          registrationState: "CANCELLED",
          paymentState,
          paymentStatus: paymentState,
          version: { increment: 1 },
        },
      });
      await tx.payment.update({
        where: { id: b.payment.id },
        data: { workflowState: paymentState, status: paymentState },
      });
      await tx.ticket.updateMany({
        where: { bookingId: b.id, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revocationReason: "SIMULATED_REFUND",
        },
      });
    }
    await tx.refund.update({
      where: { id: r.id },
      data: {
        status,
        decisionNotes: "Fictional simulator outcome. No bank transfer.",
        transferReference: receipt.reference,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    if (d.outcome === "SUCCESS") await flagRefundCommission(tx, b.id, r.id, r.amount);
    await audit(tx, userId, "SIMULATED_REFUND_" + d.outcome, r.id, {
      eventId: b.eventId,
      entityType: "REFUND",
      previousState: r.status,
      newState: status,
      correlationId: receipt.reference,
    });
    await notify(
      tx,
      userId,
      "sim-refund:" + receipt.id,
      "Test refund updated",
      `Test refund ${d.outcome.toLowerCase()}. No real funds or bank transfer.`,
      "/bookings/" + b.id,
    );
    return receipt;
  });
}

export async function sampleReceipt(userId: string, bookingId: string) {
  await assertSimulator();
  const b = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (
    b.userId !== userId ||
    !b.testOnly ||
    b.payment?.provider !== "ORGANIZER_DIRECT"
  )
    throw Error("404:Manual test booking unavailable.");
  const bytes = await sharp({
    create: { width: 720, height: 280, channels: 3, background: "white" },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="720" height="280"><text x="32" y="60" font-size="28">FICTIONAL TEST RECEIPT — NO MONEY</text><text x="32" y="115" font-size="22">RM ${(b.total / 100).toFixed(2)} · synthetic payment evidence</text><text x="32" y="170" font-size="16">${randomUUID()}</text><text x="32" y="220" font-size="20">Independent review required. Not proof of funds.</text></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
  const f = await db.fileUpload.create({
    data: {
      userId,
      private: true,
      path: "simulated-receipt-" + randomUUID(),
      mime: "image/png",
      data: Uint8Array.from(bytes),
    },
  });
  return submitPaymentEvidence(userId, b.id, f.id, "PAYMENT", {
    claimedAmount: b.total,
    paymentReference: "TEST-RECEIPT-" + randomUUID(),
    claimedRecipient:
      JSON.parse(b.recipientSnapshot || "{}").recipientName ||
      "Fictional local recipient",
  });
}
