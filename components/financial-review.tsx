"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./shared";
import { currencyMYR, eventDateLabel } from "@/lib/event-config";
const words = (v: string) => v.toLowerCase().replaceAll("_", " ");
export function FinancialReview({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null),
    [filter, setFilter] = useState("ALL"),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  const serial = useRef(0);
  const load = useCallback(async () => {
    const id = ++serial.current;
    try {
      const d = await api(
        `customer/reconciliation/${eventId}?filter=${filter}&page=${page}`,
      );
      if (id === serial.current) {
        setData(d);
        setError("");
      }
    } catch (e: any) {
      if (id === serial.current) setError(e.message);
    }
  }, [eventId, filter, page]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="financial-review" aria-label="Payment reconciliation">
      <div className="setup-row">
        <h3>Payment reconciliation</h3>
        <button className="button secondary" onClick={load}>
          Refresh finances
        </button>
      </div>
      <p>
        Compare these records with incoming funds you independently checked.
        MixerMates does not hold this money.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">Loading financial records…</p>
      ) : (
        <>
          <dl className="financial-totals">
            {[
              ["Expected across booking history", data.summary.expected],
              ["Evidence awaiting review", data.summary.evidenceSubmitted],
              ["Under review", data.summary.underReview],
              [
                "Independently confirmed organizer funds",
                data.summary.organizerReceived,
              ],
              ["Rejected payment claims", data.summary.rejected],
              ["Outstanding payment claims", data.summary.outstanding],
              ["Open payment concerns / disputes", data.summary.disputed],
              [
                "Pending refund obligations",
                data.summary.pendingRefundObligations,
              ],
              [
                "Reported refunds (awaiting acknowledgement)",
                data.summary.reportedRefunds,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{currencyMYR(value)}</dd>
              </div>
            ))}
          </dl>
          <p>{data.notice}</p>
          <h4>Refund records</h4>
          {data.summary.refunds.length ? (
            data.summary.refunds.map((r: any) => (
              <p key={r.status}>
                {words(r.status)}: {currencyMYR(r.amount)} · {r.count} records
              </p>
            ))
          ) : (
            <p>No refund records.</p>
          )}
          <label>
            Financial cases
            <select
              aria-label="Financial cases"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              {[
                ["ALL", "All payment records"],
                ["PENDING_EVIDENCE", "Evidence awaiting review"],
                ["UNDER_REVIEW", "Under review"],
                ["AWAITING_APPROVAL", "Funds confirmed; approval pending"],
                ["ISSUANCE_RECOVERY", "Funds confirmed; ticket missing"],
                ["REFUNDS", "Refunds requiring action"],
                ["CANCELLED_FUNDS", "Cancelled; confirmed funds unresolved"],
                ["NEEDS_REVIEW", "Recorded risk indicators"],
                ["DISPUTED", "Open payment concerns / disputes"],
                ["REJECTED", "Rejected claims"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <a
            className="button secondary"
            href={`/api/customer/reconciliation-export/${eventId}?filter=${filter}`}
            download
          >
            Export financial summary
          </a>
          <p role="status">
            {data.total} matching bookings · Page {data.page} of {data.pages}
          </p>
          <div className="reconciliation-rows">
            {data.rows.map((b: any) => (
              <article key={b.id}>
                <h4>
                  {b.customer} · {b.tier}
                </h4>
                <p>Reference: {b.id}</p>
                <p>
                  {currencyMYR(b.expected)} · {words(b.paymentState)} ·{" "}
                  {words(b.lifecycle)}
                </p>
                <p>
                  Original recipient: {b.recipient} · Version{" "}
                  {b.recipientVersionId || "unavailable"}
                </p>
                <p>
                  Registration: {words(b.registration)} · Evidence:{" "}
                  {words(b.evidence)}
                </p>
                <p>
                  {b.confirmedAt
                    ? `Confirmed ${eventDateLabel(b.confirmedAt, "Asia/Kuala_Lumpur")} by ${b.reviewer || "record unavailable"}`
                    : "No independently confirmed funds recorded"}
                </p>
                {b.refunds.map((r: any, i: number) => (
                  <p key={i}>
                    Refund: {words(r.status)} · {currencyMYR(r.amount)}
                  </p>
                ))}
              </article>
            ))}
          </div>
          {!data.rows.length && (
            <p>No matching cases. Choose another filter.</p>
          )}
          <div className="setup-actions">
            <button
              className="button secondary"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous financial records
            </button>
            <button
              className="button secondary"
              disabled={data.page >= data.pages}
              onClick={() => setPage(data.page + 1)}
            >
              Next financial records
            </button>
          </div>
        </>
      )}
    </section>
  );
}
export function PaymentRiskReview({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  return (
    <details
      className="payment-risk"
      onToggle={(e) => {
        if (e.currentTarget.open)
          api(`customer/risk/${bookingId}`)
            .then(setData)
            .catch((e: any) => setError(e.message));
      }}
    >
      <summary>Risk indicators & review history</summary>
      <p>
        A possible duplicate needs investigation. Shared payments may be
        legitimate. Indicators do not confirm or reject funds.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">Loading private review signals…</p>
      ) : (
        <>
          <p>
            Analysis scope: {words(data.scope)}. Other customers and receipts
            remain private.
          </p>
          {data.evidence.map((v: any) => (
            <section key={v.id}>
              <h5>
                {words(v.kind)} evidence ·{" "}
                {eventDateLabel(v.createdAt, "Asia/Kuala_Lumpur")}
              </h5>
              <p>
                Claimed amount:{" "}
                {v.claimedAmount === null
                  ? "Not supplied"
                  : currencyMYR(v.claimedAmount)}{" "}
                · Claimed recipient: {v.claimedRecipient || "Not supplied"} ·
                Reference:{" "}
                {v.referenceSupplied
                  ? "Supplied (private digest)"
                  : "Not supplied"}
              </p>
              {v.indicators.length ? (
                <ul>
                  {v.indicators.map((r: any) => (
                    <li key={r.code}>{r.label}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No current indicators. Independent incoming-funds review is
                  still required.
                </p>
              )}
            </section>
          ))}
          {data.reviews.map((r: any) => (
            <p key={r.id}>
              {words(r.decision)} · {r.reviewer} ·{" "}
              {eventDateLabel(r.createdAt, "Asia/Kuala_Lumpur")} · {r.notes}
            </p>
          ))}
        </>
      )}
    </details>
  );
}
