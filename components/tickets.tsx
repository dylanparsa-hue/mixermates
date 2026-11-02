"use client";
import { EventArtwork } from "./event-artwork";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SlidingTabs } from "./motion";
import { DigitalTicket } from "./digital-ticket";
import {
  ArrowUpRight,
  MapPin,
  Ticket,
  Clock3,
  Download,
  Share2,
  CheckCircle2,
} from "lucide-react";
import {
  api,
  money,
  date,
  time,
  Loading,
  Empty,
  Status,
  Modal,
  PageHeading,
} from "./shared";

function Tickets({ user, notify, version }: any) {
  const [bookings, setBookings] = useState<any[] | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("Upcoming");
  const load = useCallback(
    () =>
      api("tickets")
        .then(setBookings)
        .catch((e: any) => notify(e.message)),
    [notify],
  );
  useEffect(() => {
    load();
  }, [load, version, user.id]);
  const list = bookings?.filter((b) => {
    const cancelled =
      ["CANCELLED", "REJECTED", "EXPIRED", "REFUNDED"].includes(b.status) ||
      b.lifecycle === "CANCELLED";
    const past = new Date(b.event.endsAt).getTime() <= Date.now();
    return tab === "Cancelled"
      ? cancelled
      : !cancelled && (tab === "Past" ? past : !past);
  });
  return (
    <div className="page-width standard-page tickets-page">
      <PageHeading
        eyebrow=""
        title="My Tickets"
        description="Your invitations, digital tickets, and nights to look forward to."
      />
      <SlidingTabs
        options={["Upcoming", "Past", "Cancelled"]}
        value={tab}
        onChange={setTab}
        label="Ticket views"
      />
      {!bookings ? (
        <Loading />
      ) : !list?.length ? (
        <Empty
          icon={Ticket}
          title="Your next story is still unwritten."
          text="Find an event that feels like you. Your tickets will be waiting right here."
        >
          <Link href="/explore" className="button primary">
            Find your next night
            <ArrowUpRight size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="ticket-grid">
          {list.map((b) => (
            <article className="ticket-preview" key={b.id}>
              <Link
                href={`/events/${b.event.slug}`}
                className={`ticket-art ${b.event.theme === "Halloween" ? "halloween-art" : ""}`}
              >
                <EventArtwork
                  src={b.event.image}
                  alt=""
                  width={800}
                  height={600}
                  loading="lazy"
                />
                <span className="mini-pill">{date(b.event.startsAt)}</span>
                <span className="ticket-vibe">MixerMates PRESENTS</span>
                <h2>{b.event.title}</h2>
              </Link>
              <div className="ticket-preview-content">
                <div className="row between">
                  <span className="eyebrow">{b.tier.name}</span>
                  <Status
                    value={
                      b.status === "APPROVED" &&
                      b.tickets.some((t: any) => t.status === "CHECKED_IN")
                        ? "CHECKED_IN"
                        : b.status
                    }
                  />
                </div>
                <p>
                  <MapPin size={14} />
                  {b.event.venue}
                </p>
                <div className="row between">
                  <span>
                    {b.quantity} {b.quantity === 1 ? "ticket" : "tickets"} ·{" "}
                    {money(b.total)}
                  </span>
                  <span className="muted">{time(b.event.startsAt)} MYT</span>
                </div>
                <div className="ticket-perforation" />
                {b.tickets.length ? (
                  <div className="ticket-button-list">
                    {b.tickets.map((t: any, i: number) => (
                      <button
                        className="button primary full"
                        key={t.id}
                        onClick={() => setSelected(t.id)}
                      >
                        <Ticket size={17} />
                        {t.status === "CHECKED_IN"
                          ? "View checked-in ticket"
                          : `Open digital ticket${b.tickets.length > 1 ? " " + (i + 1) : ""}`}
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pending-ticket">
                    <Clock3 size={18} />
                    <span>
                      {b.paymentState === "AWAITING_PAYMENT"
                        ? "Awaiting payment evidence."
                        : ["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(
                              b.paymentState,
                            )
                          ? "Payment review in progress."
                          : b.registrationState === "PENDING"
                            ? "Registration awaiting approval."
                            : b.status === "PENDING_REVIEW"
                              ? "Your invitation is with the organizer."
                              : b.status === "PAYMENT_FAILED"
                                ? "Simulated payment failed. Book again from the event."
                                : b.status === "REJECTED"
                                  ? "Request declined. Any demo charge was refunded."
                                  : "Registration is not active."}
                    </span>
                  </div>
                )}
                <label className="checkbox privacy-toggle">
                  <input
                    type="checkbox"
                    checked={b.attendancePublic}
                    onChange={async (ev) => {
                      try {
                        await api("attendance-privacy", {
                          bookingId: b.id,
                          public: ev.target.checked,
                        });
                        load();
                        notify("Attendance visibility updated.");
                      } catch (x: any) {
                        notify(x.message);
                      }
                    }}
                  />
                  <span>
                    Let verified attendees discover me after check-in.
                  </span>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <DigitalTicket
          id={selected}
          close={() => {
            setSelected(null);
            load();
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

export { Tickets };
