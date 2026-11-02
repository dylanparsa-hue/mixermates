"use client";
import { ticketPricing } from "@/lib/ticket-pricing";
import { FeeBreakdown } from "./fee-breakdown";
import { SimulatedCheckout } from "./simulated-checkout";
import { EventArtwork } from "./event-artwork";
import { Operations } from "./operations";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand";
import { ThemeControl } from "./theme";
import { DigitalTicket } from "./digital-ticket";
import { api } from "./shared";
import {
  decimalToSen,
  currencyMYR,
  eventDateLabel,
  eventAccessLabel,
  paymentMethods,
  paymentDisclosure,
} from "@/lib/event-config";
const customer = (path: string, body?: any) => api("customer/" + path, body);
const words = (s: string) => s.toLowerCase().replaceAll("_", " ");
export function CustomerBooking({
  slug,
  bookingId,
  history = false,
}: {
  slug?: string;
  bookingId?: string;
  history?: boolean;
}) {
  const [user, setUser] = useState<any>(null),
    [event, setEvent] = useState<any>(null),
    [booking, setBooking] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [ticketTab, setTicketTab] = useState("Upcoming"),
    [step, setStep] = useState(0),
    [tierId, setTier] = useState(""),
    [quantity, setQuantity] = useState(1),
    [entryKey, setEntry] = useState(""),
    [answers, setAnswers] = useState<Record<string, any>>({}),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [ticket, setTicket] = useState(""),
    [claimedAmount, setClaimedAmount] = useState(""),
    [claimedRecipient, setClaimedRecipient] = useState(""),
    [paymentReference, setPaymentReference] = useState(""),
    [paymentQrError, setPaymentQrError] = useState(false);
  const idempotency = useRef(""),
    alert = useRef<HTMLDivElement>(null),
    stepHeading = useRef<HTMLHeadingElement>(null),
    previousStep = useRef(0);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  useEffect(() => {
    idempotency.current = crypto.randomUUID();
    let invite = new URLSearchParams(location.hash.slice(1)).get("invite");
    try {
      if (invite) {
        sessionStorage.setItem("mixermates-invite:" + slug, invite);
        window.history.replaceState(null, "", location.pathname);
      } else invite = sessionStorage.getItem("mixermates-invite:" + slug);
    } catch {}
    setToken(invite || "");
  }, [slug]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await customer("me");
      setUser(u);
      if (history) {
        setRows(await customer("bookings"));
      } else if (bookingId) setBooking(await customer("booking/" + bookingId));
      else if (slug) {
        if (token) await customer("redeem", { slug, token });
        const loaded = await customer("event/" + slug);
        setEvent(loaded);
        const choice = new URLSearchParams(location.search).get("tier");
        const first =
          loaded.tiers.find((t: any) => t.id === choice && t.available) ||
          loaded.tiers.find((t: any) => t.available);
        if (first) {
          setTier(first.id);
          setQuantity(first.minPerOrder);
        }
      }
    } catch (e: any) {
      if (!e.message.includes("Sign in")) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug, bookingId, history, token]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await run();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const [quote, setQuote] = useState<any>(null);
  const selected = event?.tiers.find((t: any) => t.id === tierId),
    entry = event?.entryOptions.find((o: any) => o.key === entryKey),
    pricing = ticketPricing(entry?.price ?? selected?.price ?? 0, quantity, event?.platformFeePolicy || "ABSORB"),
    total = pricing.customerTotal;
  async function upload(file: File, data: Record<string, string>) {
    const form = new FormData();
    form.set("file", file);
    Object.entries(data).forEach(([k, v]) => form.set(k, v));
    const response = await fetch("/api/customer/upload", {
      method: "POST",
      body: form,
    });
    const saved = await response.json();
    if (!response.ok) throw Error(saved.error);
    return saved;
  }
  async function reserve() {
    await action(async () => {
      const response = await customer("reserve", {
        eventId: event.id,
        tierId,
        quantity,
        pricingKey: quote?.pricingKey,
        answers,
        entryKey: entryKey || undefined,
        idempotencyKey: idempotency.current,
      });
      location.assign("/bookings/" + response.id);
    });
  }
  const displayEvent = booking?.event || event;
  const paymentWindowElapsed =
    booking &&
    !booking.reviewHold &&
    ["RESERVED", "PENDING"].includes(booking.lifecycle) &&
    ["AWAITING_PAYMENT", "REJECTED"].includes(booking.paymentState) &&
    +new Date(booking.expiresAt) <= Date.now();
  return (
    <div className="customer-shell">
      <a className="customer-skip" href="#customer-content">
        Skip to booking content
      </a>
      <header className="customer-header">
        <Link href="/explore" aria-label="Back to event discovery">
          <BrandLogo />
        </Link>
        <nav aria-label="Booking navigation">
          {user && <Link href="/my-bookings">My tickets</Link>}
          {user && (
            <button
              className="button ghost"
              onClick={() =>
                action(async () => {
                  await api("logout", {});
                  setUser(null);
                  setEvent(null);
                  setBooking(null);
                  location.assign("/coming-soon");
                })
              }
            >
              Sign out
            </button>
          )}
        </nav>
      </header>
      <main id="customer-content" className="customer-main">
        <p className="customer-test">
          Local test only. No real payments or admission. Public website remains
          Coming Soon.
        </p>
        {error && (
          <div ref={alert} tabIndex={-1} className="setup-error" role="alert">
            {error}
          </div>
        )}
        {booking?.feeSnapshot && <section className="setup-panel" aria-label="Your booked price"><h2>Your booked price</h2><FeeBreakdown pricing={booking.feeSnapshot} /></section>}
        {message && (
          <p role="status" className="setup-notice">
            {message}
          </p>
        )}
        {loading ? (
          <p role="status">Loading your booking…</p>
        ) : !user ? (
          <CustomerSignIn
            slug={slug}
            bookingId={bookingId}
            history={history}
            token={token}
            onSignedIn={async () => {
              try {
                sessionStorage.removeItem("mixermates-invite:" + slug);
              } catch {}
              await load();
            }}
          />
        ) : history ? (
          <>
            <h1>My Tickets</h1>
            <p>Your registrations, payment reviews and tickets, together.</p>
            <div className="row wrap" aria-label="Ticket views">
              {["Upcoming", "Past", "Cancelled"].map((v) => (
                <button
                  key={v}
                  className={`button ${ticketTab === v ? "primary" : "secondary"}`}
                  aria-pressed={ticketTab === v}
                  onClick={() => setTicketTab(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {!rows.length && (
              <p>No bookings yet. Open your event invitation to start.</p>
            )}
            <div className="customer-booking-list">
              {rows
                .filter((b) => {
                  const cancelled =
                    ["CANCELLED", "REJECTED", "EXPIRED", "REFUNDED"].includes(
                      b.status,
                    ) || ["CANCELLED", "EXPIRED"].includes(b.lifecycle);
                  const past = new Date(b.event.endsAt).getTime() <= Date.now();
                  return ticketTab === "Cancelled"
                    ? cancelled
                    : !cancelled && (ticketTab === "Past" ? past : !past);
                })
                .map((b) => (
                  <article key={b.id}>
                    <EventArtwork
                      src={b.event.image}
                      alt=""
                      width={640}
                      height={360}
                      loading="lazy"
                    />
                    <div>
                      <h2>{b.event.title}</h2>
                      <p>
                        {eventDateLabel(b.event.startsAt, b.event.timezone)}
                      </p>
                      <p>
                        {b.tier.name} · {b.quantity}{" "}
                        {b.quantity === 1 ? "ticket" : "tickets"} ·{" "}
                        {currencyMYR(b.total)}
                      </p>
                      <p>{b.event.venue}</p>
                      <StatusSummary booking={b} />
                      {b.tickets.map((t: any, i: number) => (
                        <button
                          key={t.id}
                          className="button primary"
                          onClick={() => setTicket(t.id)}
                        >
                          Open ticket
                          {b.tickets.length > 1
                            ? ` ${i + 1} of ${b.tickets.length}`
                            : ""}{" "}
                          · {words(t.status)}
                        </button>
                      ))}
                      <Link
                        className="button secondary"
                        href={"/bookings/" + b.id}
                      >
                        Open booking
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
            <details>
              <summary>Refund requests</summary>
              <Operations mode="Refunds" user={user} customer />
            </details>
            <details>
              <summary>Support cases</summary>
              <Operations mode="Support" user={user} customer />
            </details>
            <details>
              <summary>Notifications</summary>
              <Operations mode="Notifications" user={user} customer />
            </details>
            <details>
              <summary>Notification preferences</summary>
              <Operations mode="Settings" user={user} customer />
            </details>
          </>
        ) : booking ? (
          <>
            <Link href="/my-bookings">Back to My bookings</Link>
            {!!booking.changes?.length && (
              <section className="customer-update">
                <h2>Event details updated</h2>
                {booking.changes.map((c: any) => (
                  <article key={c.id}>
                    <p>{c.reason}</p>
                    <p>
                      Previous:{" "}
                      {eventDateLabel(
                        c.previous.startsAt,
                        booking.event.timezone,
                      )}{" "}
                      — {c.previous.venue}
                    </p>
                    <p>
                      Updated:{" "}
                      {eventDateLabel(
                        c.current.startsAt,
                        booking.event.timezone,
                      )}{" "}
                      — {c.current.venue}
                    </p>
                    {c.current.entryInstructions && (
                      <p>Entry instructions: {c.current.entryInstructions}</p>
                    )}
                    <p>
                      Your existing ticket identity is preserved. Current
                      validity still depends on booking, payment, event and
                      admission status. No cancelled, used or revoked ticket is
                      reactivated.
                    </p>
                  </article>
                ))}
                <p>{booking.refundEligibility?.reason}</p>
                <Link href="/my-bookings">
                  Open refund requests or private support
                </Link>
              </section>
            )}
            <details>
              <summary>Recorded refund policy</summary>
              <p>{booking.refundEligibility?.policy.terms}</p>
              <p>{booking.refundEligibility?.reason}</p>
            </details>
            <h1>
              {booking.lifecycle === "CONFIRMED"
                ? "Your night is booked."
                : "Your registration"}
            </h1>
            <div className="customer-columns">
              <section>
                {booking.simulator && (
                  <SimulatedCheckout
                    booking={booking}
                    refresh={async () =>
                      setBooking(await customer("booking/" + booking.id))
                    }
                    openTicket={setTicket}
                  />
                )}
                <EventArtwork
                  sizes="(max-width: 1023px) 90vw, 60vw"
                  className="customer-cover"
                  src={booking.event.image}
                  alt={booking.event.title + " artwork"}
                  width={1200}
                  height={640}
                />
                <h2>{booking.event.title}</h2>
                <p>
                  {eventDateLabel(
                    booking.event.startsAt,
                    booking.event.timezone,
                  )}{" "}
                  —{" "}
                  {eventDateLabel(booking.event.endsAt, booking.event.timezone)}
                </p>
                <p>
                  {booking.event.timezone} · {booking.event.city}
                </p>
                <p>{booking.event.venue}</p>
                <StatusSummary booking={booking} />
                {booking.lifecycle === "EXPIRED" && (
                  <p className="setup-notice">
                    This reservation no longer accepts payment. If you already
                    transferred funds, contact the organizer before making
                    another booking or payment.
                  </p>
                )}
                {!booking.simulator &&
                  ["RESERVED", "PENDING"].includes(booking.lifecycle) && (
                    <p className="setup-notice">
                      {booking.reviewHold
                        ? "Your evidence has been received. Your places stay held while the organizer reviews it. Do not pay again."
                        : `Submit required proof by ${eventDateLabel(booking.expiresAt, booking.event.timezone)}. If this expires, contact the organizer before making a payment.`}
                    </p>
                  )}
                {booking.paymentRequired && booking.recipient && (
                  <section className="customer-payment">
                    <h2>
                      {["AWAITING_PAYMENT", "REJECTED"].includes(
                        booking.paymentState,
                      )
                        ? "Pay the organizer directly"
                        : "Payment record"}
                    </h2>
                    <details className="payment-disclosure">
                      <summary>Payment & review information</summary>{" "}
                      <p>
                        {booking.paymentState === "CONFIRMED"
                          ? "The organizer has confirmed the expected amount. Keep this record; no further payment is needed."
                          : paymentDisclosure}
                      </p>
                      <p>{booking.recipient.instructions}</p>
                    </details>
                    <p>
                      <strong>{currencyMYR(booking.total)}</strong> to{" "}
                      <strong>{booking.recipient.recipientName}</strong>
                    </p>
                    <p>
                      {paymentMethods[
                        booking.recipient
                          .methodType as keyof typeof paymentMethods
                      ] || "Organizer QR"}{" "}
                      · {booking.recipient.recipientReference}
                    </p>
                    {!paymentWindowElapsed &&
                      !paymentQrError &&
                      ["RESERVED", "PENDING"].includes(booking.lifecycle) &&
                      ["AWAITING_PAYMENT", "REJECTED"].includes(
                        booking.paymentState,
                      ) && (
                        <>
                          <img
                            className="customer-payment-qr"
                            onError={() => setPaymentQrError(true)}
                            src={booking.qrUrl}
                            alt="Approved organizer payment QR for this booking"
                            width={280}
                            height={280}
                          />
                          <a
                            className="button secondary"
                            href={booking.qrUrl + "?download=1"}
                            download
                          >
                            Save payment QR
                          </a>
                          <p>
                            {booking.event.testOnly
                              ? "TEST ONLY. Fictional QR: do not open a banking app or transfer money. Upload a fictional receipt below, or use the Test Lab sample."
                              : "Open your wallet or bank app and check the recipient and amount. Some apps can import a saved QR; support varies. Never share your banking password here."}
                          </p>
                        </>
                      )}
                    {(paymentWindowElapsed || paymentQrError) && (
                      <p className="setup-notice" role="status">
                        {paymentWindowElapsed
                          ? "This payment window has elapsed. Refresh status and contact the organizer before making any payment."
                          : "Payment QR is unavailable. Refresh status or contact the organizer before making any payment."}
                      </p>
                    )}
                    <button
                      className="button secondary"
                      onClick={() =>
                        action(async () => {
                          await navigator.clipboard.writeText(
                            booking.reference,
                          );
                          setMessage("Booking reference copied.");
                        })
                      }
                    >
                      Copy booking reference
                    </button>
                  </section>
                )}
                {(!booking.simulator || booking.byobRequired) &&
                  ["RESERVED", "PENDING"].includes(booking.lifecycle) && (
                    <>
                      <h2>Submit your evidence</h2>
                      {booking.sampleReceiptEnabled &&
                        booking.paymentRequired &&
                        ["AWAITING_PAYMENT", "REJECTED"].includes(
                          booking.paymentState,
                        ) && (
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await customer("simulator/receipt", {
                                  bookingId: booking.id,
                                });
                                await load();
                              })
                            }
                          >
                            Use sample TEST receipt
                          </button>
                        )}
                      <p>
                        PNG, JPG or WebP, one image per submission, up to 10 MB.
                        A submitted image does not confirm funds or issue a
                        ticket.
                      </p>
                      {booking.paymentRequired &&
                        ["AWAITING_PAYMENT", "REJECTED"].includes(
                          booking.paymentState,
                        ) && (
                          <div>
                            <details>
                              <summary>Optional payment details</summary>
                              <p>
                                These are claims for manual review. Do not enter
                                account numbers or banking credentials.
                              </p>
                              <label>
                                Amount shown on receipt (MYR)
                                <input
                                  name="claimedAmount"
                                  inputMode="decimal"
                                  value={claimedAmount}
                                  onChange={(e) =>
                                    setClaimedAmount(e.target.value)
                                  }
                                />
                              </label>
                              <label>
                                Recipient name shown on receipt
                                <input
                                  name="claimedRecipient"
                                  maxLength={160}
                                  value={claimedRecipient}
                                  onChange={(e) =>
                                    setClaimedRecipient(e.target.value)
                                  }
                                />
                              </label>
                              <label>
                                Payment reference
                                <input
                                  name="paymentReference"
                                  maxLength={100}
                                  autoComplete="off"
                                  spellCheck={false}
                                  value={paymentReference}
                                  onChange={(e) =>
                                    setPaymentReference(e.target.value)
                                  }
                                />
                              </label>
                            </details>
                            <EvidenceInput
                              label={
                                booking.paymentState === "REJECTED"
                                  ? "Upload corrected payment proof"
                                  : "Upload payment proof"
                              }
                              disabled={busy}
                              onFile={(file) =>
                                action(async () => {
                                  await upload(file, {
                                    bookingId: booking.id,
                                    kind: "PAYMENT",
                                    ...(claimedAmount.trim()
                                      ? {
                                          claimedAmount: String(
                                            decimalToSen(claimedAmount),
                                          ),
                                        }
                                      : {}),
                                    ...(claimedRecipient.trim()
                                      ? {
                                          claimedRecipient:
                                            claimedRecipient.trim(),
                                        }
                                      : {}),
                                    ...(paymentReference.trim()
                                      ? {
                                          paymentReference:
                                            paymentReference.trim(),
                                        }
                                      : {}),
                                  });
                                  await load();
                                  setMessage(
                                    "Payment proof submitted — awaiting review.",
                                  );
                                })
                              }
                            />
                          </div>
                        )}{" "}
                      {booking.byobRequired &&
                        booking.byobState !== "APPROVED" && (
                          <EvidenceInput
                            label="Upload BYOB proof"
                            disabled={busy}
                            onFile={(file) =>
                              action(async () => {
                                await upload(file, {
                                  bookingId: booking.id,
                                  kind: "BYOB",
                                });
                                await load();
                                setMessage(
                                  "BYOB evidence submitted — awaiting separate review.",
                                );
                              })
                            }
                          />
                        )}
                    </>
                  )}
                {booking.evidence.length > 0 && (
                  <>
                    <h2>Submission history</h2>
                    {booking.evidence.map((v: any) => (
                      <div className="customer-update" key={v.id}>
                        <p>
                          {v.kind === "PAYMENT"
                            ? "Payment proof"
                            : "BYOB proof"}{" "}
                          · {words(v.status)} ·{" "}
                          {eventDateLabel(v.createdAt, booking.event.timezone)}
                        </p>
                        <a href={v.url} target="_blank" rel="noreferrer">
                          View private evidence
                        </a>
                      </div>
                    ))}
                  </>
                )}
                {booking.reviews.map((v: any, i: number) => (
                  <p key={i}>
                    {words(v.decision)}: {v.notes}
                  </p>
                ))}
                <h2>Tickets</h2>
                {!booking.tickets.length ? (
                  <p>
                    No admission ticket has been issued yet. Payment,
                    registration and any BYOB checks must all be complete.
                  </p>
                ) : (
                  <div className="customer-ticket-actions">
                    {booking.tickets.map((t: any, i: number) => (
                      <button
                        className="button primary"
                        key={t.id}
                        onClick={() => setTicket(t.id)}
                      >
                        Open {t.testOnly ? "TEST " : ""}ticket
                        {booking.tickets.length > 1
                          ? ` ${i + 1} of ${booking.tickets.length}`
                          : ""}{" "}
                        · {words(t.status)}
                      </button>
                    ))}
                  </div>
                )}
                <h2>Booking history</h2>
                <ol className="customer-timeline">
                  {booking.history.map((h: any, i: number) => (
                    <li key={i}>
                      <strong>{words(h.action)}</strong>
                      <span>
                        {eventDateLabel(h.createdAt, booking.event.timezone)}
                      </span>
                      {h.reasonCode && <p>{h.reasonCode}</p>}
                    </li>
                  ))}
                </ol>
              </section>
              <aside className="customer-summary">
                <h2>Booking summary</h2>
                <dl>
                  <dt>Reference</dt>
                  <dd>{booking.reference}</dd>
                  <dt>Ticket</dt>
                  <dd>{booking.tier.name}</dd>
                  <dt>Quantity</dt>
                  <dd>{booking.quantity}</dd>
                  <dt>Total</dt>
                  <dd>{currencyMYR(booking.total)}</dd>
                  <dt>Organizer</dt>
                  <dd>{booking.event.organizer}</dd>
                </dl>
                <p>{booking.event.policies}</p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => load()}
                >
                  Refresh status
                </button>
                {["RESERVED", "PENDING", "CONFIRMED"].includes(
                  booking.lifecycle,
                ) && (
                  <details>
                    <summary>Cancel registration</summary>
                    <p>
                      Any organizer-direct refund must be checked and returned
                      separately. This action revokes unused tickets.
                    </p>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          await customer("cancel", { bookingId: booking.id });
                          await load();
                        })
                      }
                    >
                      Confirm cancellation
                    </button>
                  </details>
                )}
              </aside>
            </div>
          </>
        ) : event ? (
          <>
            <div className="customer-columns">
              <section>
                <EventArtwork
                  sizes="(max-width: 1023px) 90vw, 60vw"
                  className={`customer-cover customer-checkout-cover ${step > 0 ? "customer-cover-compact" : ""}`}
                  src={event.image}
                  alt={event.title + " event artwork"}
                  width={1200}
                  height={640}
                />
                <h1>{event.title}</h1>
                <p>
                  {eventDateLabel(event.startsAt, event.timezone)} —{" "}
                  {eventDateLabel(event.endsAt, event.timezone)} (
                  {event.timezone})
                </p>
                <p>
                  {event.city} · {event.age}+ · {eventAccessLabel(event.access)}
                </p>
                <details className="customer-event-details">
                  <summary>Event details & privacy</summary>
                  <p>
                    {event.category} · {event.genre}
                  </p>
                  <p>{event.venue}</p>
                  <p>{event.description}</p>
                  <p>Organized by {event.organizer}</p>
                  {event.access !== "PUBLIC" && (
                    <p>
                      Private invitation. Your access is limited to this event.
                      Exact location is shared only with confirmed eligible
                      guests.
                    </p>
                  )}
                </details>
                {selected && (
                  <p className="customer-selected-summary">
                    <strong>
                      {selected.name} × {quantity} · {currencyMYR(total)}
                    </strong>
                  </p>
                )}
                <nav className="customer-steps" aria-label="Registration steps">
                  {["Tickets", "Your details", "Review"].map((label, i) => (
                    <button
                      key={label}
                      aria-current={step === i ? "step" : undefined}
                      onClick={() => setStep(i)}
                    >
                      {i + 1}. {label}
                    </button>
                  ))}
                </nav>
                {step === 0 ? (
                  <section>
                    <h2 ref={stepHeading} tabIndex={-1}>
                      Choose your tickets
                    </h2>
                    {event.tiers.map((t: any) => (
                      <label className="customer-tier" key={t.id}>
                        <input
                          type="radio"
                          name="tier"
                          value={t.id}
                          checked={tierId === t.id}
                          disabled={
                            !t.available ||
                            t.availability !== "AVAILABLE" ||
                            (t.saleStart &&
                              new Date(t.saleStart) > new Date()) ||
                            (t.saleEnd && new Date(t.saleEnd) < new Date())
                          }
                          onChange={() => {
                            setTier(t.id);
                            setQuantity(t.minPerOrder);
                          }}
                        />
                        <span>
                          <strong>
                            {t.name} · {currencyMYR(t.price)}
                          </strong>
                          <span>{t.description}</span>
                          <small>
                            {t.available} available · {t.minPerOrder}–
                            {t.maxPerOrder} per booking
                          </small>
                        </span>
                      </label>
                    ))}
                    <label>
                      Quantity
                      <input
                        type="number"
                        min={selected?.minPerOrder || 1}
                        max={Math.min(
                          selected?.maxPerOrder || 10,
                          selected?.available || 10,
                        )}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </label>
                    {event.entryOptions.length > 0 && (
                      <label>
                        Entry option
                        <select
                          value={entryKey}
                          onChange={(e) => {
                            setEntry(e.target.value);
                            const option = event.entryOptions.find(
                              (o: any) => o.key === e.target.value,
                            );
                            const field = event.fields.find((f: any) =>
                              /^entry option$/i.test(f.label),
                            );
                            if (field)
                              setAnswers((a) => ({
                                ...a,
                                [field.id]: option?.label || "",
                              }));
                          }}
                        >
                          <option value="">Choose your entry</option>
                          {event.entryOptions.map((o: any) => (
                            <option key={o.key} value={o.key}>
                              {o.label} · {currencyMYR(o.price)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      className="button primary"
                      disabled={
                        !selected ||
                        quantity < selected.minPerOrder ||
                        (event.entryOptions.length > 0 && !entryKey)
                      }
                      onClick={() => setStep(1)}
                    >
                      Continue to your details
                    </button>
                  </section>
                ) : step === 1 ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      action(async () => {
                        const q = await customer("quote", { eventId: event.id, tierId, quantity, entryKey: entryKey || undefined });
                        setQuote(q);
                        setStep(2);
                      });
                    }}
                  >
                    <h2 ref={stepHeading} tabIndex={-1}>
                      Your details
                    </h2>
                    <p>
                      These answers are private to you and authorized event
                      reviewers.
                    </p>
                    {event.fields
                      .filter(
                        (f: any) => !f.condition || f.condition === entryKey,
                      )
                      .filter(
                        (f: any) =>
                          !(
                            f.type === "file" &&
                            f.condition &&
                            /proof|evidence/i.test(f.label)
                          ) && !/^entry option$/i.test(f.label),
                      )
                      .map((f: any) => (
                        <RegistrationField
                          key={f.id}
                          field={f}
                          value={answers[f.id]}
                          disabled={busy}
                          onChange={(v: any) =>
                            setAnswers((a) => ({ ...a, [f.id]: v }))
                          }
                          upload={(file) => {
                            setBusy(true);
                            return upload(file, {
                              eventId: event.id,
                              fieldId: f.id,
                            }).finally(() => setBusy(false));
                          }}
                        />
                      ))}
                    <button
                      className="button primary"
                      type="submit"
                      disabled={busy}
                    >
                      Review registration
                    </button>
                  </form>
                ) : (
                  <section>
                    <h2 ref={stepHeading} tabIndex={-1}>
                      Check your registration
                    </h2>
                    <p>
                      {selected?.name || "Choose a ticket"} · {quantity}{" "}
                      {quantity === 1 ? "ticket" : "tickets"} ·{" "}
                      {currencyMYR(total)}
                    </p>
                    <FeeBreakdown pricing={quote || pricing} />
                    {event.fields
                      .filter((f: any) => answers[f.id] !== undefined)
                      .map((f: any) => (
                        <p key={f.id}>
                          <strong>{f.label}:</strong>{" "}
                          {f.type === "file"
                            ? "Private attachment saved"
                            : String(answers[f.id])}
                        </p>
                      ))}
                    <p>
                      {event.approvalRequired
                        ? "The organizer reviews your registration separately from your payment."
                        : "Your ticket becomes available only after all applicable checks."}
                    </p>
                    <p>
                      {event.simulator
                        ? "TEST MODE · Simulated Card. No real charge, card details or receipt. The server confirms your fictional payment before issuing tickets."
                        : paymentDisclosure}
                    </p>
                    <button
                      className="button primary"
                      disabled={busy || !selected}
                      onClick={reserve}
                    >
                      {busy
                        ? "Saving booking…"
                        : event.simulator
                          ? "Confirm Booking"
                          : "Submit registration"}
                    </button>
                  </section>
                )}
              </section>
              <aside className="customer-summary">
                <h2>Your night</h2>
                <p>{selected?.name || "Select a ticket"}</p>
                <p>
                  {selected
                    ? `${quantity} × ${currencyMYR(entry?.price ?? selected.price)}`
                    : "Choose a ticket to see your total."}
                </p>
                {selected && <FeeBreakdown pricing={quote && step === 2 ? quote : pricing} />}
                <strong className="customer-total">
                  {selected
                    ? currencyMYR(total)
                    : `From ${currencyMYR(event.tiers.length ? Math.min(...event.tiers.map((t: any) => t.price)) : 0)}`}
                </strong>
                <p>
                  Final price and availability are checked by the server when
                  you submit.
                </p>
                <h3>Before you arrive</h3>
                <p>{event.policies}</p>
                {event.idCheckRequired && (
                  <p>
                    Bring valid photo ID. Entry staff will check your age and
                    admission requirements.
                  </p>
                )}
              </aside>
            </div>
          </>
        ) : (
          <p>
            Open the original event invitation to continue. If it has expired,
            contact the organizer.
          </p>
        )}
      </main>
      <footer className="customer-footer">
        <ThemeControl />
        <p>MixerMates · Your details stay private.</p>
      </footer>
      {ticket && (
        <DigitalTicket
          id={ticket}
          apiPrefix="customer/ticket/"
          close={() => {
            setTicket("");
            void load();
          }}
          notify={setMessage}
        />
      )}
    </div>
  );
}
function StatusSummary({ booking: b }: { booking: any }) {
  return (
    <div className="customer-status">
      <p>
        <strong>Registration:</strong> {words(b.registrationState)}
      </p>
      <p>
        <strong>Payment:</strong> {words(b.paymentState)}
      </p>
      {b.byobRequired && (
        <p>
          <strong>BYOB:</strong> {words(b.byobState)}
        </p>
      )}
      <p>
        <strong>Booking:</strong> {words(b.lifecycle)}
      </p>
    </div>
  );
}
function EvidenceInput({
  label,
  disabled,
  onFile,
}: {
  label: string;
  disabled: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
function RegistrationField({
  field: f,
  value,
  disabled,
  onChange,
  upload,
}: {
  field: any;
  value: any;
  disabled: boolean;
  onChange: (v: any) => void;
  upload: (f: File) => Promise<any>;
}) {
  const [error, setError] = useState("");
  const options = f.options
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const label = f.label + (f.required ? "" : " (optional)");
  if (["radio", "checkbox"].includes(f.type))
    return (
      <fieldset>
        <legend>{label}</legend>
        {options.map((o: string) => (
          <label className="customer-choice" key={o}>
            <input
              type={f.type}
              name={f.id}
              required={f.type === "radio" && f.required}
              checked={
                f.type === "radio" ? value === o : (value || []).includes(o)
              }
              onChange={(e) =>
                onChange(
                  f.type === "radio"
                    ? o
                    : e.target.checked
                      ? [...(value || []), o]
                      : (value || []).filter((v: string) => v !== o),
                )
              }
            />
            {o}
          </label>
        ))}
      </fieldset>
    );
  if (f.type === "consent")
    return (
      <label className="customer-choice">
        <input
          type="checkbox"
          required={f.required}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  return (
    <label>
      {label}
      {f.type === "textarea" ? (
        <textarea
          name={f.id}
          autoComplete="off"
          required={f.required}
          maxLength={4000}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : f.type === "select" ? (
        <select
          name={f.id}
          autoComplete="off"
          required={f.required}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose an option</option>
          {options.map((o: string) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : f.type === "file" ? (
        <>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required={f.required && !value}
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  setError("");
                  const result = await upload(file);
                  onChange(result.id);
                } catch (err: any) {
                  setError(err.message);
                }
              }
            }}
          />
          {value && <span>Private attachment saved</span>}
          {error && <span role="alert">{error}</span>}
        </>
      ) : (
        <input
          type={["email", "tel", "number"].includes(f.type) ? f.type : "text"}
          maxLength={4000}
          required={f.required}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function CustomerSignIn({
  slug,
  bookingId,
  token,
  history,
  onSignedIn,
}: {
  slug?: string;
  bookingId?: string;
  token: string;
  history?: boolean;
  onSignedIn: () => Promise<void>;
}) {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="customer-auth">
      <h1>Your invitation starts here.</h1>
      <p>
        Sign in with the account named in your invitation. You’ll return to this
        event; the main website remains private.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            await customer(mode, {
              ...fields,
              context: { slug, bookingId, history, token: token || undefined },
            });
            await onSignedIn();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "register" && (
          <>
            <label>
              Full name
              <input name="name" autoComplete="name" required />
            </label>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                minLength={3}
              />
            </label>
            <label>
              Date of birth
              <input name="dob" type="date" autoComplete="bday" required />
            </label>
            <label>
              City
              <input name="city" autoComplete="address-level2" required />
            </label>
          </>
        )}
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "register" ? 10 : 1}
          />
        </label>
        {error && (
          <p role="alert" className="setup-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Signing in…"
            : mode === "login"
              ? "Sign in to your event"
              : "Create booking account"}
        </button>
      </form>
      <button
        className="button ghost"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "New account for an open approved event"
          : "Use my existing account"}
      </button>
      <p>
        Private invitations are bound to an existing account. New accounts
        cannot take over another person’s invitation.
      </p>
    </section>
  );
}
