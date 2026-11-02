"use client";
import { CommissionSummary } from "./commission-summary";
import { FinancialReview, PaymentRiskReview } from "./financial-review";
import { GuestManagement } from "./guest-management";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./shared";
import { currencyMYR, decimalToSen, eventDateLabel } from "@/lib/event-config";
export function BookingReviews() {
  const [events, setEvents] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [eventId, setEventId] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    setLoading(true);
    return api(`customer/reviews?page=${page}&filter=${filter}`)
      .then((d) => {
        if (version === requestVersion.current) setEvents(d);
      })
      .catch((e: any) => {
        if (version === requestVersion.current) setError(e.message);
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
  }, [page, filter]);
  useEffect(() => {
    load();
    setEventId(new URLSearchParams(location.search).get("event") || "");
    setFilter(new URLSearchParams(location.search).get("filter") || "");
  }, [load]);
  async function review(data: any) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api("customer/review", data);
      await load();
      setMessage(
        "Review saved. Payment and registration checks remain separate.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="setup-panel">
      <CommissionSummary />
      <h2 id="qr-payment-reviews">Review QR Payments</h2>
      <label>
        Review view
        <select
          name="payment-review-view"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
            const url = new URL(location.href);
            url.searchParams.set("filter", e.target.value);
            window.history.replaceState(null, "", url);
          }}
        >
          <option value="">All payments & registrations</option>
          <option value="QR_PENDING">QR payments awaiting confirmation</option>
        </select>
      </label>
      <p>
        Confirm funds in the organizer’s account independently. A receipt image
        is not a financial confirmation.
      </p>
      {error && (
        <p role="alert" className="setup-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {loading ? (
        <p role="status">Loading permitted registrations…</p>
      ) : !events.length ? (
        <p>No permitted event registrations yet.</p>
      ) : (
        <label>
          Event
          <select
            aria-label="Event"
            value={
              eventId ||
              events.find((e) => e.bookings.length)?.id ||
              events[0]?.id
            }
            onChange={(ev) => {
              setEventId(ev.target.value);
              setPage(1);
              const url = new URL(location.href);
              url.searchParams.set("event", ev.target.value);
              window.history.replaceState(null, "", url);
            }}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {events
        .filter(
          (e) =>
            e.id ===
            (eventId ||
              events.find((e) => e.bookings.length)?.id ||
              events[0]?.id),
        )
        .map((e) => (
          <section key={e.id}>
            <h3>{e.title}</h3>
            {e.manage && <InviteAttendee eventId={e.id} />}
            <p>
              {e.metrics.pending} pending · {e.metrics.confirmed} confirmed
              bookings · {e.metrics.tickets} tickets · {e.metrics.checkedIn}{" "}
              checked in · {e.metrics.available} places available
            </p>
            {e.finance && (
              <p>
                Submitted payment proof: {e.metrics.proofSubmitted}.
                Independently confirmed funds:{" "}
                {currencyMYR(e.metrics.confirmedFunds)}. This is not platform
                revenue.
              </p>
            )}
            {e.finance && (
              <details>
                <summary>Open payment reconciliation</summary>
                <FinancialReview eventId={e.id} />
              </details>
            )}
            {e.guests && (
              <details>
                <summary>Manage all registrations</summary>
                <GuestManagement eventId={e.id} />
              </details>
            )}
            <h3>Booking review queue</h3>
            <p role="status">
              {e.total} bookings · Page {e.page} of {e.pages}
            </p>
            {!e.bookings.length && <p>No registrations for this event.</p>}
            <div className="setup-actions">
              <button
                className="button secondary"
                disabled={e.page <= 1}
                onClick={() => setPage(e.page - 1)}
              >
                Previous reviews
              </button>
              <button
                className="button secondary"
                disabled={e.page >= e.pages}
                onClick={() => setPage(e.page + 1)}
              >
                Next reviews
              </button>
            </div>
            {e.bookings.map((b: any) => (
              <BookingReviewEntry
                key={b.id}
                booking={b}
                event={e}
                busy={busy}
                review={review}
              />
            ))}
          </section>
        ))}
    </section>
  );
}
function BookingReviewEntry({ booking: b, event: e, busy, review }: any) {
  const [notes, setNotes] = useState(""),
    [funds, setFunds] = useState(false),
    [amount, setAmount] = useState("");
  const proof = b.evidence.find((v: any) => v.kind === "PAYMENT"),
    byob = b.evidence.find((v: any) => v.kind === "BYOB");
  const body = { bookingId: b.id, notes };
  let sen: number | undefined;
  try {
    sen = decimalToSen(amount);
  } catch {}
  return (
    <article className="booking-review-entry">
      <h4>
        {b.name} · {b.tier} × {b.quantity}
      </h4>
      <p>Reference: {b.reference}</p>
      {b.testOnly && (
        <p className="setup-notice">
          Fictional local test. No real funds or admission.
        </p>
      )}
      <p>
        Booking: {b.lifecycle.toLowerCase()} · Registration:{" "}
        {b.registrationState.toLowerCase()} ·{" "}
        {e.finance && (
          <>Payment: {b.paymentState?.toLowerCase().replaceAll("_", " ")}</>
        )}
      </p>
      {e.finance && (
        <>
          <p>
            Expected: <strong>{currencyMYR(b.total)}</strong>
          </p>
          <p>
            Recipient: {b.recipient?.recipientName || "No payment required"} ·{" "}
            {b.recipient?.recipientReference}
          </p>
        </>
      )}
      {e.finance && <PaymentRiskReview bookingId={b.id} />}
      {e.registration && (
        <dl>
          {b.questions
            .filter((q: any) => b.answers[q.id] !== undefined)
            .map((q: any) => (
              <div key={q.id}>
                <dt>{q.label}</dt>
                <dd>
                  {q.type === "file" ? (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={"/api/customer/attachment/" + b.answers[q.id]}
                    >
                      View private attachment
                    </a>
                  ) : (
                    String(b.answers[q.id])
                  )}
                </dd>
              </div>
            ))}
        </dl>
      )}
      {b.evidence.map((v: any) => (
        <details key={v.id}>
          <summary>
            {v.kind === "PAYMENT" ? "Payment" : "BYOB"} proof ·{" "}
            {v.status.toLowerCase().replaceAll("_", " ")} ·{" "}
            {eventDateLabel(v.createdAt, "Asia/Kuala_Lumpur")}
          </summary>
          <a target="_blank" rel="noreferrer" href={v.url}>
            Open private evidence
          </a>
          <img
            loading="lazy"
            src={v.url}
            alt={
              v.kind === "PAYMENT"
                ? "Private payment receipt"
                : "Private BYOB evidence"
            }
            width={280}
            height={280}
          />
        </details>
      ))}
      <label>
        Review notes
        <textarea
          value={notes}
          minLength={5}
          maxLength={191}
          onChange={(ev) => setNotes(ev.target.value)}
          placeholder="Record the decision and any correction needed…"
        />
      </label>
      <p className="review-requirements">
        Every decision requires 5–191 characters of review notes. Actions remain
        unavailable until the required notes are entered.
      </p>
      {e.finance &&
        proof &&
        ["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(b.paymentState) &&
        ["RESERVED", "PENDING"].includes(b.lifecycle) && (
          <>
            <label>
              Amount independently received (MYR)
              <input
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={funds}
                onChange={(ev) => setFunds(ev.target.checked)}
              />
              I independently checked funds in the correct organizer account.
              For this local rehearsal, I checked the fictional test record.
            </label>
            <p className="review-requirements">
              To confirm payment, enter exactly {currencyMYR(b.total)} received,
              complete the independent account check, and add review notes.
              Receipt upload alone cannot unlock a ticket.
            </p>
            <div className="setup-actions">
              <button
                className="button primary"
                disabled={
                  busy || notes.trim().length < 5 || !funds || sen !== b.total
                }
                onClick={() =>
                  review({
                    ...body,
                    kind: "PAYMENT",
                    evidenceId: proof.id,
                    decision: "CONFIRMED",
                    fundsVerified: true,
                    receivedAmount: sen,
                    recipientVersionId: b.recipient.versionId,
                  })
                }
              >
                Confirm received payment
              </button>
              <button
                className="button secondary"
                disabled={busy || notes.trim().length < 5}
                onClick={() =>
                  review({
                    ...body,
                    kind: "PAYMENT",
                    evidenceId: proof.id,
                    decision: "REJECTED",
                    recipientVersionId: b.recipient.versionId,
                  })
                }
              >
                Reject / request correction
              </button>
              <button
                className="button secondary"
                disabled={busy || notes.trim().length < 5}
                onClick={() =>
                  review({
                    ...body,
                    kind: "PAYMENT",
                    evidenceId: proof.id,
                    decision: "UNDER_REVIEW",
                    recipientVersionId: b.recipient.versionId,
                  })
                }
              >
                Mark under review
              </button>
            </div>
          </>
        )}
      {e.registration &&
        b.registrationState === "PENDING" &&
        ["RESERVED", "PENDING"].includes(b.lifecycle) && (
          <div className="setup-actions">
            <button
              className="button primary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                review({ ...body, kind: "REGISTRATION", approve: true })
              }
            >
              Approve registration
            </button>
            <button
              className="button secondary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                review({ ...body, kind: "REGISTRATION", approve: false })
              }
            >
              Reject registration
            </button>
          </div>
        )}
      {e.registration &&
        b.byobRequired &&
        byob &&
        b.byobState !== "APPROVED" &&
        ["RESERVED", "PENDING"].includes(b.lifecycle) && (
          <div className="setup-actions">
            <button
              className="button primary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                review({
                  ...body,
                  kind: "BYOB",
                  evidenceId: byob.id,
                  approve: true,
                })
              }
            >
              Approve BYOB evidence
            </button>
            <button
              className="button secondary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                review({
                  ...body,
                  kind: "BYOB",
                  evidenceId: byob.id,
                  approve: false,
                })
              }
            >
              Reject BYOB evidence
            </button>
          </div>
        )}
      {e.registration &&
        b.lifecycle !== "CONFIRMED" &&
        b.registrationState === "APPROVED" &&
        ["CONFIRMED", "NOT_REQUIRED"].includes(b.paymentState) && (
          <button
            className="button secondary"
            disabled={busy || notes.trim().length < 5}
            onClick={() => review({ ...body, kind: "RETRY" })}
          >
            Retry eligible ticket issuance
          </button>
        )}
      <p>
        {b.tickets.length} tickets issued ·{" "}
        {b.tickets.filter((t: any) => t.status === "CHECKED_IN").length} checked
        in
      </p>
      {b.reviews?.map((v: any) => (
        <p key={v.id}>
          {v.decision.toLowerCase()} ·{" "}
          {eventDateLabel(v.createdAt, "Asia/Kuala_Lumpur")} · Reviewer{" "}
          {v.reviewerId} ·{" "}
          {v.receivedAmount === null
            ? "No funds confirmation"
            : currencyMYR(v.receivedAmount)}{" "}
          · {v.notes}
        </p>
      ))}
    </article>
  );
}

function InviteAttendee({ eventId }: { eventId: string }) {
  const [username, setUsername] = useState(""),
    [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details>
      <summary>Create account-bound invitation</summary>
      <p>
        The attendee must already have an account. Send this private link only
        to that person; it does not open the rest of the website.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setLink("");
          try {
            const result = await api("customer/invite", { eventId, username });
            setLink(result.link);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Attendee username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </label>
        <button className="button secondary" disabled={busy}>
          {busy ? "Creating invitation…" : "Create private invitation"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {link && (
        <label>
          Private invitation link
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
        </label>
      )}
    </details>
  );
}
