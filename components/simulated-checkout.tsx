"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import { currencyMYR, decimalToSen } from "@/lib/event-config";

export function SimulatedCheckout({ booking, refresh, openTicket }: any) {
  const [outcome, setOutcome] = useState("SUCCESS"),
    [refundOutcome, setRefundOutcome] = useState("SUCCESS"),
    [refundAmount, setRefundAmount] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [opened, setOpened] = useState(false);
  const refundRequestKey = useRef(crypto.randomUUID());
  const lock = useRef(false),
    attempt = useRef<{ kind: string; outcome: string; key: string } | null>(
      null,
    );
  const paid =
      booking.paymentState === "CONFIRMED" ||
      (!booking.paymentRequired && booking.lifecycle === "CONFIRMED"),
    refunded = ["REFUNDED", "PARTIALLY_REFUNDED"].includes(
      booking.paymentState,
    ),
    partial = booking.paymentState === "PARTIALLY_REFUNDED",
    last = booking.simulationAttempts.find((a: any) => a.kind === "PAYMENT"),
    refund = booking.refunds[0],
    refundedAmount = booking.refunds
      .filter((r: any) => r.status === "REFUND_CONFIRMED")
      .reduce((n: number, r: any) => n + r.amount, 0);
  const payable =
    ["RESERVED", "PENDING"].includes(booking.lifecycle) &&
    !paid &&
    +new Date(booking.expiresAt) > Date.now();
  async function run(kind: string, selected: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    if (
      !attempt.current ||
      attempt.current.kind !== kind ||
      attempt.current.outcome !== selected
    )
      attempt.current = { kind, outcome: selected, key: crypto.randomUUID() };
    try {
      await api("customer/simulator/" + kind, {
        bookingId: booking.id,
        outcome: selected,
        ...(kind === "refund" && refund ? { refundId: refund.id } : {}),
        idempotencyKey: attempt.current.key,
      });
      attempt.current = null;
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="simulated-checkout"
      aria-labelledby="test-checkout-heading"
    >
      <p className="customer-test">
        <strong>TEST MODE</strong> · No real card, charge or bank transfer
      </p>
      <h2 id="test-checkout-heading">
        {refunded
          ? partial
            ? "Partial test refund confirmed"
            : "Test refund successful"
          : paid
            ? !booking.paymentRequired
              ? "Your free TEST ticket is ready"
              : "Test Payment Successful"
            : last?.outcome === "DECLINED"
              ? "Test Payment Declined"
              : last?.outcome === "CANCELLED"
                ? "Payment Cancelled"
                : "Complete Your Test Booking"}
      </h2>
      {error && (
        <p role="alert" className="setup-error">
          {error}
        </p>
      )}
      <dl className="simulator-summary">
        <dt>Event</dt>
        <dd>{booking.event.title}</dd>
        <dt>Ticket</dt>
        <dd>{booking.tier.name}</dd>
        <dt>Quantity</dt>
        <dd>{booking.quantity}</dd>
        <dt>Total</dt>
        <dd>{currencyMYR(booking.total)}</dd>
        {refundedAmount > 0 && (
          <>
            <dt>Total refunded</dt>
            <dd>{currencyMYR(refundedAmount)}</dd>
          </>
        )}
        <dt>Payment</dt>
        <dd>
          {booking.paymentRequired
            ? "Simulated Card"
            : "Not required · Free RSVP"}
        </dd>
      </dl>
      {refunded ? (
        <p role="status">
          Your fictional refund is confirmed. Unused tickets are revoked. No
          money moved.
        </p>
      ) : paid ? (
        <>
          <p role="status">
            {booking.tickets.length
              ? "Your test ticket is ready."
              : "Test payment is confirmed. Your ticket will be issued when the event’s registration and entry requirements are approved."}
          </p>
          <div className="row wrap">
            {booking.tickets.map((t: any, i: number) => (
              <button
                key={t.id}
                className="button primary"
                onClick={() => openTicket(t.id)}
              >
                View My Ticket{booking.tickets.length > 1 ? ` ${i + 1}` : ""}
              </button>
            ))}
            <Link className="button secondary" href="/explore">
              Back to Events
            </Link>
          </div>
        </>
      ) : (
        <>
          {last?.outcome === "DECLINED" && (
            <p role="status">
              No money was charged and no ticket was issued. Choose an outcome
              and try again.
            </p>
          )}
          {last?.outcome === "CANCELLED" && (
            <p role="status">
              Your booking has not been paid. Your reservation remains held
              until its expiry.
            </p>
          )}
          {payable ? (
            opened ? (
              <>
                <label htmlFor="simulator-outcome">
                  Local test outcome
                  <select
                    aria-label="Local test outcome"
                    id="simulator-outcome"
                    value={outcome}
                    disabled={busy}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="SUCCESS">Successful Payment</option>
                    <option value="DECLINED">Declined Payment</option>
                    <option value="CANCELLED">Payment Cancelled</option>
                  </select>
                </label>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => run("payment", outcome)}
                >
                  {busy
                    ? "Confirming test payment…"
                    : outcome === "SUCCESS"
                      ? `Pay ${currencyMYR(booking.total)} — TEST`
                      : outcome === "DECLINED"
                        ? "Simulate Declined Payment"
                        : "Simulate Payment Cancelled"}
                </button>
              </>
            ) : (
              <button
                className="button primary"
                onClick={() => setOpened(true)}
              >
                {last?.outcome === "DECLINED"
                  ? "Try Again"
                  : last?.outcome === "CANCELLED"
                    ? "Return to Booking"
                    : "Pay with Test Payment"}
              </button>
            )
          ) : (
            <p>
              Payment is unavailable because this booking is{" "}
              {booking.lifecycle.toLowerCase()} or its reservation expired.
              Start a new booking from the event page.
            </p>
          )}
        </>
      )}
      {(paid || refund) &&
        booking.paymentRequired &&
        (!refunded || partial) && (
          <details className="simulator-refund">
            <summary>Test refunds</summary>
            <p>
              Request a fictional refund, then select an outcome. Attendance and
              the recorded refund policy still apply.
            </p>
            {refund && (
              <p role="status">
                Refund status:{" "}
                {refund.status.toLowerCase().replaceAll("_", " ")}. No real bank
                transfer.
              </p>
            )}
            {!refund || (partial && refund.status === "REFUND_CONFIRMED") ? (
              <>
                <label htmlFor="test-refund-amount">
                  Refund amount (MYR, leave blank for remaining balance)
                  <input
                    id="test-refund-amount"
                    name="test-refund-amount"
                    inputMode="decimal"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </label>
                <p>
                  Partial refunds cancel this booking and revoke all unused
                  tickets. MixerMates fee handling awaits approved terms.
                </p>
                <button
                  className="button secondary"
                  disabled={busy || !booking.refundEligibility?.allowed}
                  onClick={async () => {
                    if (lock.current) return;
                    lock.current = true;
                    setBusy(true);
                    setError("");
                    try {
                      await api("customer/operations/refund-request", {
                        bookingId: booking.id,
                        reason:
                          "Fictional local refund request. No real funds.",
                        ...(refundAmount
                          ? { amount: decimalToSen(refundAmount) }
                          : {}),
                        requestKey: refundRequestKey.current,
                      });
                      refundRequestKey.current = crypto.randomUUID();
                      setRefundAmount("");
                      await refresh();
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      lock.current = false;
                      setBusy(false);
                    }
                  }}
                >
                  Request TEST refund
                </button>
              </>
            ) : (
              <>
                <label htmlFor="simulator-refund-outcome">
                  Test refund outcome
                  <select
                    aria-label="Test refund outcome"
                    id="simulator-refund-outcome"
                    value={refundOutcome}
                    onChange={(e) => setRefundOutcome(e.target.value)}
                    disabled={busy}
                  >
                    <option value="SUCCESS">Refund successful</option>
                    <option value="PENDING">Refund pending</option>
                    <option value="FAILED">Refund failed</option>
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => run("refund", refundOutcome)}
                >
                  {busy ? "Saving test refund…" : "Simulate TEST refund"}
                </button>
              </>
            )}
            {!booking.refundEligibility?.allowed && (
              <p>{booking.refundEligibility?.reason}</p>
            )}
          </details>
        )}
    </section>
  );
}
