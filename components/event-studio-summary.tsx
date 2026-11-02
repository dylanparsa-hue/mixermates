"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import { currencyMYR, eventDateLabel } from "@/lib/event-config";
export function EventStudioSummary({
  eventId,
  mode,
}: {
  eventId: string;
  mode: string;
}) {
  const [event, setEvent] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("setup")
      .then((d) => {
        const e = d.events.find((e: any) => e.id === eventId);
        if (!e) throw Error("Event unavailable.");
        setEvent(e);
      })
      .catch((e) => setError(e.message));
  }, [eventId]);
  if (!event)
    return <p role={error ? "alert" : "status"}>{error || "Loading event…"}</p>;
  const e = event;
  return (
    <section className="setup-panel">
      <h2>
        {mode === "Tickets"
          ? "Ticket inventory"
          : mode === "Analytics"
            ? "Basic analytics"
            : "Event overview"}
      </h2>
      <h3>{e.title}</h3>
      <p>5% MixerMates fee: {e.platformFeePolicy === "CUSTOMER" ? "Customer pays it" : "Organizer absorbs it"}. Gateway fees are organizer-borne. Fee settings lock after a booking.</p>
      <p>
        {e.status.toLowerCase().replaceAll("_", " ")} ·{" "}
        {eventDateLabel(e.startsAt, e.timezone)}
      </p>
      {mode !== "Tickets" && (
        <dl className="setup-summary setup-statistics">
          {[
            ["Bookings", e._count.bookings],
            [
              "Pending registrations",
              e.cancellationImpact.pendingRegistrations,
            ],
            ["Active tickets", e.cancellationImpact.activeTickets],
            ["Payments awaiting review", e.pendingPaymentReviews],
            [
              "Confirmed direct payments",
              currencyMYR(e.cancellationImpact.confirmedPaymentAmount),
            ],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {e.tiers.map((t: any) => (
        <div className="creator-preview-ticket" key={t.id}>
          <span>
            {t.name}
            <small>
              {" "}
              · {t.sold} reserved of {t.quantity} ·{" "}
              {t.availability.toLowerCase()}
            </small>
          </span>
          <strong>{t.price ? currencyMYR(t.price) : "Free"}</strong>
        </div>
      ))}
      <div className="setup-actions">
        <Link className="button secondary" href={`/create?edit=${e.id}`}>
          Edit event & tickets
        </Link>
        <Link className="button secondary" href={`/events/${e.slug}?preview=1`}>
          Preview event
        </Link>
        <Link
          className="button secondary"
          href={`/organizer?tab=Guest%20list&event=${e.id}`}
        >
          Manage guests
        </Link>
      </div>
      <p>
        Figures reflect permitted records. Real ticket sales remain disabled.
      </p>
    </section>
  );
}
