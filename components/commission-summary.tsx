"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import { currencyMYR as money } from "@/lib/event-config";
export function CommissionSummary() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    return api("financial-summary")
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <section
      className="commission-summary"
      aria-label="Ticket sales and platform fees"
    >
      <div className="setup-row">
        <h2>Ticket sales & fees</h2>
        <button className="button secondary" disabled={loading} onClick={load}>
          {loading ? "Refreshing…" : "Refresh totals"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">
          {error
            ? "Totals unavailable. Refresh to retry."
            : "Loading financial totals…"}
        </p>
      ) : (
        <>
          {[
            ["sandbox", "TEST · Fictional transactions"],
            ["real", "Real transactions"],
          ].map(([key, label]) => {
            const s = data[key];
            if (
              key === "real" &&
              !s.ticketsSold &&
              !s.pendingReviews &&
              !s.refundObligations
            )
              return (
                <section className="commission-scope" key={key}>
                  <h3>{label}</h3>
                  <p>
                    No real transactions recorded. Real collection remains
                    disabled.
                  </p>
                </section>
              );
            return (
              <section key={key} className="commission-scope">
                <h3>{label}</h3>
                <dl className="setup-summary setup-statistics">
                  {[
                    [
                      "Paid tickets sold (before refunds)",
                      String(s.ticketsSold),
                    ],
                    ["Ticket face value after discounts", money(s.faceValue)],
                    ["MixerMates fees absorbed", money(s.absorbed)],
                    ["MixerMates fees passed to customers", money(s.passed)],
                    ["Commission accrued (owed)", money(s.accrued)],
                    ["Commission collected", money(s.collected)],
                    ["Outstanding platform fees", money(s.outstanding)],
                  ].map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <details>
                  <summary>Gateway fees, organizer amount & refunds</summary>
                  <dl className="setup-summary setup-statistics">
                    {[
                      ["Known gateway expenses", money(s.gatewayKnown)],
                      [
                        "Organizer amount before gateway charges",
                        money(s.organizerBeforeGateway),
                      ],
                      [
                        "Estimated organizer amount after recorded refunds",
                        s.organizerEstimate === null
                          ? "Awaiting refund review"
                          : money(s.organizerEstimate),
                      ],
                      ["Confirmed refunds", money(s.refunds)],
                      [
                        "Refunds awaiting review or settlement",
                        money(s.refundObligations),
                      ],
                      [
                        "Commission awaiting refund decision",
                        money(s.refundFeeReview),
                      ],
                      [
                        "Payments awaiting manual confirmation",
                        String(s.pendingReviews),
                      ],
                    ].map(([name, value]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {s.gatewayUnknown > 0 && (
                  <p>
                    {s.gatewayUnknown} payment
                    {s.gatewayUnknown === 1 ? "" : "s"} with unknown gateway
                    fees. These fees are excluded from the estimate.
                  </p>
                )}
                {s.historicalPaidBookings > 0 && (
                  <p>
                    {s.historicalPaidBookings} historical booking
                    {s.historicalPaidBookings === 1 ? "" : "s"} retain their
                    original terms. No new commission was applied.
                  </p>
                )}
              </section>
            );
          })}
          <p>{data.notice}</p>
          <details>
            <summary>Event financial summaries</summary>
            {data.events.length ? (
              data.events.map((e: any) => (
                <article key={e.eventId} className="ops-record">
                  <h4>{e.title}</h4>
                  <p>
                    {e.testOnly ? "TEST · Fictional" : "Real"} · {e.ticketsSold}{" "}
                    paid tickets · Face value {money(e.faceValue)}
                  </p>
                  <p>
                    Commission owed {money(e.outstanding)} · Collected{" "}
                    {money(e.collected)} · Refunds {money(e.refunds)}
                  </p>
                  <Link
                    href={`?tab=Booking%20reviews&filter=QR_PENDING&event=${encodeURIComponent(e.eventId)}#qr-payment-reviews`}
                  >
                    Review QR Payments
                  </Link>
                </article>
              ))
            ) : (
              <p>No permitted event financial records yet.</p>
            )}
          </details>
          <Link
            className="button primary"
            href="?tab=Booking%20reviews&filter=QR_PENDING#qr-payment-reviews"
          >
            Review QR Payments
          </Link>
        </>
      )}
    </section>
  );
}
