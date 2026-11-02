"use client";
import { EventPageContent } from "./event-page-content";
import { EventArtwork } from "./event-artwork";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Heart,
  Ticket,
  Users,
  Sparkles,
  ShieldCheck,
  LockKeyhole,
  Check,
  Clock3,
  Share2,
  CircleAlert,
  BadgeCheck,
  LoaderCircle,
  Upload,
} from "lucide-react";
import {
  api,
  money,
  date,
  time,
  Loading,
  Empty,
  Status,
  Avatar,
  Modal,
} from "./shared";

function EventPage({
  id,
  user,
  gate,
  save,
  notify,
  version,
  testLab = false,
}: any) {
  const [event, setEvent] = useState<any>(null),
    [error, setError] = useState(""),
    [booking, setBooking] = useState(false),
    [tier, setTier] = useState(""),
    [attendees, setAttendees] = useState<any[] | null>(null);
  useEffect(() => {
    api(`events/${id}`)
      .then((e) => {
        setEvent(e);
        setTier(e.tiers[0]?.id);
        api("activity", { eventId: e.id, kind: "VIEW" }).catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, [id, user?.id, version]);
  if (error) return <Empty title="This event is unavailable" text={error} />;
  if (!event) return <Loading />;
  const e = event,
    t = e.tiers.find((t: any) => t.id === tier);
  const publicDemo = e.origin === "PUBLIC_DEMO";
  const sandboxCheckout =
    e.origin === "REAL" &&
    e.testOnly &&
    e.configurationStatus === "FICTIONAL_APPROVED";
  const unavailable =
    e.salesAvailable === false
      ? publicDemo
        ? "Demo only · booking unavailable"
        : "Booking not open yet"
      : e.status !== "PUBLISHED"
        ? e.status === "CANCELLED"
          ? "Event cancelled"
          : e.status === "COMPLETED"
            ? "Event ended"
            : e.status === "SUSPENDED"
              ? "Booking paused"
              : "Not yet published"
        : e.salesPaused
          ? "Booking paused"
          : +new Date(e.endsAt) <= Date.now()
            ? "Event ended"
            : t?.availability === "PAUSED"
              ? "Tickets paused"
              : !t
                ? "No tickets configured"
                : t.sold >= t.quantity
                  ? "Sold out"
                  : t.saleStart && +new Date(t.saleStart) > Date.now()
                    ? "Booking not open"
                    : t.saleEnd && +new Date(t.saleEnd) <= Date.now()
                      ? "Booking closed"
                      : testLab && !sandboxCheckout
                        ? "Catalogue preview"
                        : "";
  return (
    <div className={`event-experience theme-${e.theme.toLowerCase()}`}>
      {e.pageDesign && e.pageDesign !== "{}" ? <div className="event-designed-route"><EventPageContent event={e} bookingDisabled={!!unavailable} onBook={(id:string)=>{setTier(id);gate(()=>sandboxCheckout ? location.assign("/join/"+e.slug+"?tier="+encodeURIComponent(id)) : setBooking(true));}}/></div> : <>
      <div
        className={`detail-cover ${e.theme === "Halloween" ? "halloween-cover" : ""}`}
      >
        <EventArtwork
          src={e.coverImage || e.image}
          alt={e.title}
          width={1600}
          height={1000}
          fetchPriority="high"
          sizes="(max-width: 767px) 100vw, 90vw"
        />
        <div className="detail-cover-shade" />
        <div className="detail-overlay-controls">
          <Link
            href="/explore"
            className="detail-circle"
            aria-label="Back to discovery"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <button
            className="detail-circle"
            aria-label={e.saved ? "Unsave event" : "Save event"}
            aria-pressed={!!e.saved}
            onClick={() => save(e)}
          >
            <Heart
              size={20}
              aria-hidden="true"
              fill={e.saved ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
      <div className="page-width detail-layout">
        <div className="detail-main">
          <div className="detail-intro">
            <div className="detail-tags">
              <span>
                {e.origin === "PUBLIC_DEMO"
                  ? "DEMO · "
                  : e.testOnly
                    ? "TEST · "
                    : ""}
                {e.category}
              </span>
              {e.access !== "PUBLIC" && (
                <span>
                  <LockKeyhole size={13} aria-hidden="true" />
                  Invitation only
                </span>
              )}
            </div>
            <h1>{e.title}</h1>
            <div className="detail-meta">
              <span>
                <CalendarDays size={16} aria-hidden="true" />
                {date(e.startsAt, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span>
                <Clock3 size={16} aria-hidden="true" />
                {time(e.startsAt)} MYT
              </span>
            </div>
            <div className="detail-actions">
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(location.href);
                    notify("Event link copied");
                  } catch {
                    notify("Copy the event link from your address bar.");
                  }
                }}
              >
                <Share2 size={16} aria-hidden="true" />
                Share event
              </button>
              <span>
                {e.age}+ · {e.genre}
              </span>
            </div>
          </div>
          <section className="detail-section">
            <h2>About the night</h2>
            <p className="description">
              {e.description.length > 200
                ? e.description.slice(
                    0,
                    e.description.lastIndexOf(" ", 200) > 100
                      ? e.description.lastIndexOf(" ", 200)
                      : 200,
                  ) + "…"
                : e.description}
            </p>
            {e.description.length > 200 && (
              <details className="event-description-more">
                <summary>Read more</summary>
                <p className="description">{e.description}</p>
              </details>
            )}
          </section>
          <div className="event-facts">
            <div>
              <span className="fact-icon">
                <CalendarDays size={22} />
              </span>
              <div>
                <strong>
                  {date(e.startsAt, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </strong>
                <p>
                  {time(e.startsAt)} – {time(e.endsAt)} · MYT
                </p>
              </div>
            </div>
            <div>
              <span className="fact-icon">
                <MapPin size={22} />
              </span>
              <div>
                <strong>{e.venue}</strong>
                <p>
                  {e.access !== "PUBLIC"
                    ? "Exact venue shared with approved guests only."
                    : e.city + ", Malaysia"}
                </p>
              </div>
            </div>
          </div>
          <section className="detail-section">
            <h3>Your host</h3>
            <div className="organizer-card">
              <Avatar
                photo={e.organizer.photo}
                name={e.organizer.name}
                size={54}
              />
              <div>
                <strong>
                  {e.organizer.organizerSlug ? (
                    <Link href={`/organizers/${e.organizer.organizerSlug}`}>
                      {e.organizer.name}
                    </Link>
                  ) : (
                    e.organizer.name
                  )}
                </strong>
                <p>Event organizer</p>
              </div>
            </div>
          </section>
          <details className="detail-section detail-rules">
            <summary>Before you go</summary>
            <div className="rules-list">
              <p>
                <ShieldCheck size={17} />
                {e.age}+ only. Bring a valid government-issued photo ID.
              </p>
              <p>
                <Ticket size={17} />
                Your QR ticket is personal. One scan, one entry.
              </p>
              <p>
                <LockKeyhole size={17} />
                Keep private locations and other guests’ details private.
              </p>
              <p>
                <CircleAlert size={17} />
                {e.policies}
              </p>
            </div>
            {e.id === "halloween" && (
              <div className="alert">
                <Sparkles size={19} />
                <div>
                  <strong>All treats. No real transactions.</strong>
                  <p>
                    This Halloween experience uses simulated Touch ’n Go
                    payments. BYOB selections require organizer review and do
                    not automatically replace the entry fee.
                  </p>
                </div>
              </div>
            )}
          </details>
          <section className="detail-section">
            <h3>Find your people here</h3>
            <p className="muted">
              Verified attendees can discover other adults who explicitly opt
              in. Guest lists stay private.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                gate(async () => {
                  try {
                    setAttendees(await api("attendees", { eventId: e.id }));
                  } catch (x: any) {
                    notify(x.message);
                  }
                })
              }
            >
              <Users size={17} />
              Discover opted-in attendees
            </button>
            {attendees && (
              <div className="row wrap mt">
                {attendees.length ? (
                  attendees.map((a) => (
                    <Link
                      href={`/people/${a.username}`}
                      key={a.id}
                      className="person-chip"
                    >
                      <Avatar name={a.name} />
                      {a.name}
                    </Link>
                  ))
                ) : (
                  <p className="muted">
                    No attendees have opted into discovery yet.
                  </p>
                )}
              </div>
            )}
          </section>
          <button
            className="text-button subtle"
            onClick={() =>
              gate(async () => {
                const reason = prompt("Tell us what needs reviewing:");
                if (reason)
                  try {
                    await api("report-event", { eventId: e.id, reason });
                    notify("Report submitted for admin review.");
                  } catch (x: any) {
                    notify(x.message);
                  }
              })
            }
          >
            Report this event
          </button>
        </div>
        <aside className="booking-panel" id="event-ticket-options">
          <h2>Choose your ticket</h2>
          <p>
            {e.approvalRequired
              ? "Registration requires organizer approval."
              : "Select a ticket to continue."}
          </p>
          <div className="tier-list">
            {e.tiers.map((t: any) => (
              <label
                className={`tier ${tier === t.id ? "selected" : ""}`}
                key={t.id}
              >
                <input
                  type="radio"
                  name="tier"
                  checked={tier === t.id}
                  onChange={() => setTier(t.id)}
                />
                <div>
                  <strong>{t.name}</strong>
                  <small>
                    {t.quantity - t.sold} available · {t.maxPerOrder} max per
                    booking
                  </small>
                </div>
                <b>{money(t.price)}</b>
              </label>
            ))}
          </div>
          <div className="booking-total">
            <span>Starting from</span>
            <strong>
              {money(t?.price || 0)}
              <small>/ person</small>
            </strong>
          </div>
          <button
            className="button primary full"
            disabled={!!unavailable}
            onClick={() =>
              gate(() =>
                e.origin === "REAL" &&
                e.testOnly &&
                e.configurationStatus === "FICTIONAL_APPROVED"
                  ? location.assign(
                      "/join/" + e.slug + "?tier=" + encodeURIComponent(tier),
                    )
                  : setBooking(true),
              )
            }
          >
            {unavailable
              ? unavailable
              : testLab && sandboxCheckout
                ? "Book TEST tickets"
                : e.salesPaused
                  ? "Sales paused"
                  : e.approvalRequired
                    ? "Request an invitation"
                    : t?.price
                      ? "Get tickets"
                      : "RSVP for free"}
            <ArrowUpRight size={18} />
          </button>
          {e.salesAvailable === false && (
            <p className="mm-preview-booking-note">
              {publicDemo
                ? "This is a fictional showcase. Real ticket sales, payments and admission are unavailable."
                : "Ticket sales, payments and admission are not open. Event operations require separate approval before booking becomes available."}
            </p>
          )}
          {testLab && !sandboxCheckout && (
            <p className="mm-preview-booking-note">
              This is a catalogue preview.{" "}
              <Link href="/explore?view=all">Use a bookable TEST event</Link> to
              rehearse the complete booking and payment review.
            </p>
          )}
          <p className="secure-caption">
            <ShieldCheck size={13} />
            {e.salesAvailable === false
              ? publicDemo
                ? "No admission tickets are issued for demos."
                : "Admission becomes available after operating approval."
              : "Private QR admission. One ticket, one entry."}
          </p>
          <div className="booking-demo">
            <span className="live-dot" />
            TEST ONLY · NO REAL PAYMENT
          </div>
        </aside>
      </div>
      <div className="event-booking-bar">
        <div>
          <small>From</small>
          <strong>{money(t?.price || 0)}</strong>
        </div>
        {unavailable ? (
          <button className="button primary" disabled>
            {unavailable}
          </button>
        ) : (
          <a className="button primary" href="#event-ticket-options">
            Choose tickets <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
      </>}
      {booking && (
        <BookingModal
          event={e}
          tier={t}
          user={user}
          close={() => setBooking(false)}
          notify={notify}
        />
      )}
    </div>
  );
}
function BookingModal({ event: e, tier: t, user, close, notify }: any) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [quantity, setQuantity] = useState(1),
    [outcome, setOutcome] = useState("SUCCEEDED"),
    [receipt, setReceipt] = useState(""),
    [uploading, setUploading] = useState(false),
    [result, setResult] = useState<any>(null);
  const key = useRef(crypto.randomUUID());
  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("private", "true");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setReceipt(d.path);
    } catch (x: any) {
      setError(x.message);
    } finally {
      setUploading(false);
    }
  }
  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    const answers = Object.fromEntries(new FormData(ev.currentTarget));
    try {
      setResult(
        await api("book", {
          eventId: e.id,
          tierId: t.id,
          quantity,
          answers,
          idempotencyKey: key.current,
          paymentOutcome: outcome,
          ...(receipt ? { receiptPath: receipt } : {}),
        }),
      );
      notify("Registration saved to your account.");
    } catch (x: any) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        result
          ? result.status === "PENDING_REVIEW"
            ? "You’re on the way to a great night."
            : result.status === "PAYMENT_FAILED"
              ? "Let’s try that again."
              : "You’re on the list."
          : e.approvalRequired
            ? "Request your invitation."
            : "Make it a night."
      }
      close={close}
    >
      {result ? (
        <div className="booking-success">
          <span className="success-icon">
            {result.status === "PENDING_REVIEW" ? (
              <Clock3 size={36} />
            ) : result.status === "PAYMENT_FAILED" ? (
              <CircleAlert size={36} />
            ) : (
              <Check size={36} />
            )}
          </span>
          <Status value={result.status} />
          <h3>{e.title}</h3>
          <p>
            {result.status === "PENDING_REVIEW"
              ? "Your registration is saved. The organizer will review your details and sample receipt. Your ticket becomes available after approval."
              : result.status === "PAYMENT_FAILED"
                ? "Your simulated payment failed. No inventory was reserved and no money was charged. You can start a new booking."
                : "Your secure digital ticket is ready in My Tickets. No real money was charged."}
          </p>
          <button
            className="button primary full"
            onClick={() => {
              close();
              router.push("/tickets");
            }}
          >
            View my registrations
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div className="booking-summary">
            <img src={e.image} alt="" />
            <div>
              <strong>{e.title}</strong>
              <small>
                {date(e.startsAt)} · {e.city}
              </small>
              <span>
                {t.name} · {money(t.price)}
              </span>
            </div>
          </div>
          <form className="form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                Full name
                <input name="Full name" defaultValue={user.name} required />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="Email"
                  defaultValue={user.email}
                  required
                />
              </label>
            </div>
            {e.fields?.map((f: any) => (
              <label key={f.id}>
                {f.label}
                {f.required ? " *" : ""}
                {f.type === "select" ? (
                  <select name={f.label} required={f.required}>
                    {f.options.split(",").map((o: string) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.label}
                    required={f.required}
                    maxLength={2000}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    name={f.label}
                    value="yes"
                    required={f.required}
                  />
                ) : (
                  <input
                    name={f.label}
                    required={f.required}
                    type={
                      f.type === "email"
                        ? "email"
                        : f.type === "tel" || f.label === "Phone number"
                          ? "tel"
                          : "text"
                    }
                    maxLength={500}
                  />
                )}
              </label>
            ))}
            <label>
              Tickets
              <select
                value={quantity}
                onChange={(ev) => setQuantity(Number(ev.target.value))}
              >
                {Array.from(
                  { length: Math.min(t.maxPerOrder, t.quantity - t.sold) },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            {t.price > 0 && (
              <div className="payment-box">
                <div className="row between">
                  <strong>
                    Touch ’n Go <span className="demo-tag">SIMULATED</span>
                  </strong>
                  <LockKeyhole size={16} />
                </div>
                <p>No bank connection, real wallet, or money involved.</p>
                <label>
                  Test payment outcome
                  <select
                    value={outcome}
                    onChange={(ev) => setOutcome(ev.target.value)}
                  >
                    <option value="SUCCEEDED">Demo payment succeeds</option>
                    <option value="FAILED">Demo payment fails</option>
                  </select>
                </label>
                {e.approvalRequired && (
                  <label className="upload-label">
                    <Upload size={17} />
                    {uploading
                      ? "Uploading…"
                      : receipt
                        ? "Sample receipt attached ✓"
                        : "Attach optional sample receipt (JPG/PNG, 4 MB)"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(ev) =>
                        ev.target.files?.[0] && upload(ev.target.files[0])
                      }
                    />
                    <small>
                      Use a sample image. Do not upload real banking details.
                    </small>
                  </label>
                )}
              </div>
            )}
            <label className="checkbox">
              <input type="checkbox" name="rules" value="yes" required />
              <span>
                I agree to the event rules and {e.age}+ ID checks. I understand
                this is a demo.
              </span>
            </label>
            <div className="booking-total">
              <span>
                Total · {quantity} {quantity === 1 ? "ticket" : "tickets"}
              </span>
              <strong>{money(t.price * quantity)}</strong>
            </div>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <button
              className="button primary full"
              disabled={busy || uploading}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : e.approvalRequired ? (
                "Submit invitation request"
              ) : (
                "Confirm demo booking"
              )}
              <ArrowUpRight size={17} />
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}

export { EventPage };
