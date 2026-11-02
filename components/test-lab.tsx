"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand";
import { Auth } from "./auth";
import { ThemeControl } from "./theme";
import {
  ArrowUpRight,
  Check,
  FlaskConical,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { api, date } from "./shared";
const call = (step: string, data?: any) => api("test-lab/" + step, data);
const readable = (s: string) =>
  s?.toLowerCase().replaceAll("_", " ") || "Not started";
function localTomorrow(offset = 1, hour = 20) {
  const n = new Date(Date.now() + 8 * 3600000 + offset * 86400000);
  return (
    n.toISOString().slice(0, 10) + "T" + String(hour).padStart(2, "0") + ":00"
  );
}
export function TestLab() {
  const [state, setState] = useState<any>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [preview, setPreview] = useState<any>(null),
    [auth, setAuth] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "After Hours Studio",
    startsLocal: localTomorrow(),
    endsLocal: localTomorrow(2, 0),
    capacity: 40,
    price: 3500,
    city: "Kuala Lumpur",
    venue: "FICTIONAL Studio",
    category: "House Party",
    image: "/images/neon.jpg",
  });
  const load = useCallback(async () => {
    try {
      setState(await call("state"));
      window.dispatchEvent(new Event("mm-lab-session"));
    } catch {
      setState(null);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const action = async (step: string, data: any = {}) => {
    if (busy) return;
    setBusy(step);
    setError("");
    setMessage("");
    try {
      const result = await call(step, data);
      if (step === "entrance-preview") setPreview(result);
      else
        setMessage(
          result.message ||
            "Test step saved. The state below reflects the database.",
        );
      setConfirmed(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const e = state?.event,
    b = state?.booking,
    role = state?.role;
  const button = (
    label: string,
    step: string,
    data: any = {},
    disabled = false,
  ) => (
    <button
      className="button primary"
      disabled={!!busy || disabled}
      onClick={() => action(step, data)}
    >
      {busy === step ? "Working…" : label}
    </button>
  );
  const next = (r: string, text: string) => (
    <p className="mm-lab-hint">
      {text} Switch to <strong>{r}</strong> using the selector above.
    </p>
  );
  return (
    <div className="mm-platform mm-lab">
      <header className="mm-lab-header">
        <Link href="/test-lab" aria-label="MixerMates Test Lab">
          <BrandLogo />
        </Link>
        <nav>
          <Link href="/explore">
            Explore <ArrowUpRight size={16} />
          </Link>
          <ThemeControl />
        </nav>
      </header>
      <main className="page-width standard-page">
        <div className="mm-lab-heading">
          <div>
            <h1>{state ? "Developer tools" : "Welcome to MixerMates"}</h1>
            <p>
              {state
                ? "Advanced fictional test utilities."
                : "Explore, book and create locally."}
            </p>
          </div>
          <FlaskConical size={40} aria-hidden="true" />
        </div>
        <div className="mm-lab-warning">
          <strong>Local sandbox</strong>
          <span>
            Fictional accounts, payments and tickets only. No real money,
            messages or admission.
          </span>
        </div>
        {error && (
          <div className="setup-error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <p className="setup-notice" role="status">
            {message}
          </p>
        )}
        {!ready ? (
          <p role="status">Opening the local workspace…</p>
        ) : !state ? (
          <section className="panel mm-lab-entry">
            <h2>Open the local workspace</h2>
            <p>Your fictional test session has ended. Reopen the site to continue.</p>
            <a className="button primary" href="/api/test-lab/enter?next=%2Fexplore">
              Open MixerMates
            </a>
          </section>
        ) : (
          <>
            <div className="mm-lab-context">
              <div>
                <strong>Currently testing as {role}</strong>
                <p>
                  {state.identity?.name} · {readable(state.identity?.role)}
                </p>
              </div>
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={load}
              >
                <RefreshCw size={16} />
                Refresh state
              </button>
              <button
                className="button ghost"
                onClick={async () => {
                  await call("logout", {});
                  location.assign("/explore");
                }}
              >
                <LogOut size={16} />
                End lab session
              </button>
            </div>
            <div className="mm-lab-scenario">
              <label>
                Current fictional event
                <select
                  aria-label="Current fictional event"
                  value={e?.id || ""}
                  disabled={!!busy}
                  onChange={(x) =>
                    action("select", { eventId: x.target.value })
                  }
                >
                  {!state.events.length && (
                    <option value="">Create your first test event</option>
                  )}
                  {state.events.map((x: any) => (
                    <option key={x.id} value={x.id}>
                      {x.title} · {readable(x.status)}
                    </option>
                  ))}
                </select>
              </label>
              {e && (
                <Link className="button secondary" href={"/events/" + e.slug}>
                  View event <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
            <ol
              className="mm-lab-progress"
              aria-label="Current scenario progress"
            >
              {[
                ["Event", e?.status],
                ["Payment", b?.paymentState],
                ["Registration", b?.registrationState],
                ["Ticket", b?.tickets[0]?.status],
                ["Admission", b?.tickets[0]?.checkedIn ? "CHECKED_IN" : null],
                ["Refund", b?.refund?.status],
              ].map(([name, status]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{readable(status)}</strong>
                </li>
              ))}
            </ol>
            <div className="mm-lab-workspace">
              <section className="panel mm-lab-task">
                <h2>
                  {role === "Organizer"
                    ? "Create the night"
                    : role === "Administrator"
                      ? "Review independently"
                      : role === "Finance Reviewer"
                        ? "Review fictional funds"
                        : role === "Entrance Staff"
                          ? "Rehearse the door"
                          : role === "Community Friend"
                            ? "Make a connection"
                            : "Experience the night"}
                </h2>
                {role === "Organizer" ? (
                  <>
                    <details className="mm-lab-create" open={!e}>
                      <summary>Create a fresh fictional event</summary>
                      <form
                        onSubmit={(x) => {
                          x.preventDefault();
                          action("create", form);
                        }}
                      >
                        <label>
                          Event name
                          <input
                            name="title"
                            value={form.title}
                            onChange={(x) =>
                              setForm({ ...form, title: x.target.value })
                            }
                            required
                            minLength={5}
                          />
                        </label>
                        <div className="form-grid">
                          <label>
                            Starts · Kuala Lumpur
                            <input
                              type="datetime-local"
                              name="startsLocal"
                              value={form.startsLocal}
                              onChange={(x) =>
                                setForm({
                                  ...form,
                                  startsLocal: x.target.value,
                                })
                              }
                              required
                            />
                          </label>
                          <label>
                            Ends · Kuala Lumpur
                            <input
                              type="datetime-local"
                              name="endsLocal"
                              value={form.endsLocal}
                              onChange={(x) =>
                                setForm({ ...form, endsLocal: x.target.value })
                              }
                              required
                            />
                          </label>
                          <label>
                            City
                            <input
                              value={form.city}
                              onChange={(x) =>
                                setForm({ ...form, city: x.target.value })
                              }
                              required
                            />
                          </label>
                          <label>
                            Fictional venue
                            <input
                              value={form.venue}
                              onChange={(x) =>
                                setForm({ ...form, venue: x.target.value })
                              }
                              required
                            />
                          </label>
                          <label>
                            Capacity
                            <input
                              type="number"
                              min={2}
                              max={1000}
                              value={form.capacity}
                              onChange={(x) =>
                                setForm({ ...form, capacity: +x.target.value })
                              }
                            />
                          </label>
                          <label>
                            Ticket price · RM
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              step="0.01"
                              value={form.price / 100}
                              onChange={(x) =>
                                setForm({
                                  ...form,
                                  price: Math.round(+x.target.value * 100),
                                })
                              }
                            />
                          </label>
                          <label>
                            Category
                            <select
                              value={form.category}
                              onChange={(x) =>
                                setForm({ ...form, category: x.target.value })
                              }
                            >
                              {[
                                "House Party",
                                "Nightclub",
                                "Live Music",
                                "Music Festival",
                                "Private Party",
                                "Concert",
                              ].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Artwork
                            <select
                              value={form.image}
                              onChange={(x) =>
                                setForm({ ...form, image: x.target.value })
                              }
                            >
                              {[
                                "neon",
                                "rooftop",
                                "live",
                                "social",
                                "halloween",
                              ].map((v) => (
                                <option value={"/images/" + v + ".jpg"} key={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <p>
                          Creates an approval-required draft with an ID-name
                          question and a fictional recipient. Edit all tiers,
                          artwork and registration rules in the full event
                          builder.
                        </p>
                        <button className="button primary" disabled={!!busy}>
                          {busy === "create"
                            ? "Saving draft…"
                            : "Save fictional draft"}
                        </button>
                      </form>
                    </details>
                    {e && (
                      <>
                        <div className="mm-lab-actions">
                          <Link
                            className="button secondary"
                            href={"/create?edit=" + e.id}
                          >
                            Open full event builder
                          </Link>
                          {button(
                            "Submit for review",
                            "submit",
                            {},
                            e.status !== "DRAFT",
                          )}
                        </div>
                        {next(
                          "Administrator",
                          "Drafts are never approved automatically.",
                        )}
                        <h3>Registration</h3>
                        <p>
                          Payment confirmation and registration approval are
                          separate decisions.
                        </p>
                        {button(
                          "Approve registration",
                          "approve-registration",
                          {},
                          !b || b.registrationState !== "PENDING",
                        )}
                        <h3>Event changes</h3>
                        <p>
                          Request a move one day later. The administrator
                          reviews it before the date changes.
                        </p>
                        {button(
                          "Request reschedule",
                          "reschedule",
                          {},
                          e.status !== "PUBLISHED",
                        )}
                        <Link
                          className="button secondary"
                          href="/organizer?tab=My%20events"
                        >
                          Cancellation & event controls
                        </Link>
                      </>
                    )}
                  </>
                ) : role === "Administrator" ? (
                  <>
                    {!e ? (
                      <p>Create a fictional event as Organizer first.</p>
                    ) : (
                      <>
                        <p>
                          <strong>{e.title}</strong>
                          <br />
                          {date(e.startsAt, { dateStyle: "full" })}
                          <br />
                          Current state: {readable(e.status)}
                        </p>
                        <Link
                          className="button secondary"
                          href={"/events/" + e.slug + "?preview=1"}
                        >
                          Inspect submitted event
                        </Link>
                        <p>
                          Approving this event authorizes its fictional local
                          customer workflow only.
                        </p>
                        <div className="mm-lab-actions">
                          {button(
                            "Approve fictional event",
                            "approve",
                            {},
                            e.status !== "PENDING_REVIEW",
                          )}
                          {button(
                            "Return for changes",
                            "reject",
                            {},
                            e.status !== "PENDING_REVIEW",
                          )}
                        </div>
                        {next(
                          "Customer",
                          "After approval, book through the real registration form.",
                        )}
                        {state.changes
                          .filter((x: any) => x.status === "PENDING_REVIEW")
                          .map((x: any) => (
                            <div key={x.id}>
                              <h3>Pending reschedule</h3>
                              <p>{x.reason}</p>
                              <Link href="/admin?tab=Event%20operations">
                                Inspect before/after details
                              </Link>
                              <div className="mm-lab-actions">
                                {button(
                                  "Approve event change",
                                  "review-change",
                                  { approve: true },
                                )}
                                {button(
                                  "Reject event change",
                                  "review-change",
                                  { approve: false },
                                )}
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                    <h3>Full operations</h3>
                    <Link className="button secondary" href="/admin">
                      Open administrator dashboard
                    </Link>
                  </>
                ) : role === "Finance Reviewer" ? (
                  <>
                    <p>
                      A sample receipt is evidence. It does not confirm funds.
                      Review it in the finance queue, then make the separate
                      confirmation below.
                    </p>
                    <Link
                      className="button secondary"
                      href={
                        "/organizer?tab=Booking%20reviews" +
                        (e ? "&event=" + e.id : "")
                      }
                    >
                      Open payment review queue
                    </Link>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(x) => setConfirmed(x.target.checked)}
                      />
                      I independently confirm the fictional incoming amount. No
                      real money moved.
                    </label>
                    {button(
                      "Confirm TEST funds received",
                      "confirm-payment",
                      { confirmed },
                      !confirmed ||
                        !["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(
                          b?.paymentState,
                        ),
                    )}
                    {next(
                      "Organizer",
                      "Then independently approve registration to issue the ticket.",
                    )}
                    {b?.refund && (
                      <>
                        <h3>Fictional refund</h3>
                        <p>
                          Current state: {readable(b.refund.status)}. These
                          records never move funds.
                        </p>
                        {b.refund.status === "REQUESTED" &&
                          button("Approve refund", "refund-step", {
                            status: "APPROVED",
                          })}
                        {b.refund.status === "APPROVED" &&
                          button("Await fictional transfer", "refund-step", {
                            status: "AWAITING_ORGANIZER_TRANSFER",
                          })}
                        {b.refund.status === "AWAITING_ORGANIZER_TRANSFER" &&
                          button(
                            "Record fictional transfer report",
                            "refund-step",
                            { status: "TRANSFER_REPORTED" },
                          )}
                        {b.refund.status === "TRANSFER_REPORTED" &&
                          next(
                            "Customer",
                            "Only the customer can acknowledge receipt.",
                          )}
                      </>
                    )}
                  </>
                ) : role === "Entrance Staff" ? (
                  <>
                    <p>
                      Use manual lookup here, or open the complete scanner for a
                      QR/camera test. Admission always requires its own
                      confirmation.
                    </p>
                    <Link
                      className="button secondary"
                      href="/organizer?tab=Entrance"
                    >
                      Open entrance scanner
                    </Link>
                    <div className="mm-lab-actions">
                      {button(
                        "Validate TEST ticket",
                        "entrance-preview",
                        {},
                        !b?.tickets.length,
                      )}
                    </div>
                    {preview && (
                      <div className="mm-lab-validation" role="status">
                        <strong>
                          {preview.name
                            ? `Valid TEST ticket · ${preview.name}`
                            : preview.message ||
                              preview.result ||
                              preview.status ||
                              "Ticket preview loaded"}
                        </strong>
                        <p>
                          Check the scanner view for full eligibility and holder
                          information. A preview never admits a guest.
                        </p>
                      </div>
                    )}
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(x) => setConfirmed(x.target.checked)}
                      />
                      I have checked the fictional attendee’s required ID.
                    </label>
                    {button(
                      "Admit fictional attendee",
                      "admit",
                      { confirmed },
                      !confirmed || !b?.tickets.length,
                    )}
                    <p>
                      Try admission again to verify duplicate entry is rejected.
                    </p>
                  </>
                ) : role === "Community Friend" ? (
                  <>
                    <p>
                      Use this separate fictional adult identity to accept Alex
                      Test’s friend request and reply. Discovery remains opt-in
                      and messages require an accepted friendship.
                    </p>
                    <Link
                      className="button primary"
                      href="/friends?tab=Requests"
                    >
                      Open friend requests
                    </Link>
                    <Link
                      className="button secondary"
                      href="/friends?tab=Messages"
                    >
                      Open messages
                    </Link>
                  </>
                ) : (
                  <>
                    <p>
                      Select an approved fictional event, choose a tier and
                      quantity, and complete the actual registration form.
                    </p>
                    {e?.status === "PUBLISHED" ? (
                      <Link className="button primary" href={"/join/" + e.slug}>
                        Book a TEST ticket <ArrowUpRight size={18} />
                      </Link>
                    ) : (
                      next(
                        "Organizer",
                        "Create and submit an event, then approve it as Administrator.",
                      )
                    )}
                    <div className="mm-lab-actions">
                      <Link className="button secondary" href="/my-bookings">
                        My bookings & TEST tickets
                      </Link>
                      <Link className="button secondary" href="/profile">
                        Profile & Event Passport
                      </Link>
                      <Link className="button secondary" href="/friends">
                        Friends & messages
                      </Link>
                    </div>
                    {b && (
                      <>
                        <h3>Fictional payment</h3>
                        <p>
                          Upload your own fictional image on the booking page,
                          or generate sample evidence here. Neither action
                          confirms funds.
                        </p>
                        <Link
                          className="button secondary"
                          href={"/bookings/" + b.id}
                        >
                          Open payment & booking
                        </Link>
                        {button(
                          "Submit sample TEST receipt",
                          "sample-proof",
                          {},
                          !["AWAITING_PAYMENT", "REJECTED"].includes(
                            b.paymentState,
                          ),
                        )}
                        {b.refund?.status === "REFUND_CONFIRMED" ||
                        b.paymentState === "REFUNDED" ? (
                          <p className="mm-lab-hint">
                            Fictional refund complete. No money moved. Create a
                            fresh event or booking for another rehearsal.
                          </p>
                        ) : b.refund ? (
                          b.refund.status === "TRANSFER_REPORTED" ? (
                            <p className="mm-lab-hint">
                              Review the fictional transfer report, then
                              acknowledge the TEST refund below.
                            </p>
                          ) : (
                            next(
                              "Finance Reviewer",
                              "The fictional refund is in progress. Review its saved state before advancing it.",
                            )
                          )
                        ) : b.lifecycle === "CANCELLED" ? (
                          <p className="mm-lab-hint">
                            This booking is cancelled. Revoked tickets cannot be
                            admitted. Choose a fresh event for another
                            rehearsal.
                          </p>
                        ) : ["PROOF_SUBMITTED", "UNDER_REVIEW"].includes(
                            b.paymentState,
                          ) ? (
                          next(
                            "Finance Reviewer",
                            "The evidence needs an independent funds confirmation.",
                          )
                        ) : b.paymentState === "CONFIRMED" ? (
                          b.registrationState === "APPROVED" ? (
                            <p className="mm-lab-hint">
                              Payment and registration are approved. Open your
                              TEST ticket; Entrance Staff can validate
                              admission.
                            </p>
                          ) : (
                            next(
                              "Organizer",
                              "Fictional funds are confirmed. Registration still needs independent approval.",
                            )
                          )
                        ) : (
                          <p className="mm-lab-hint">
                            Submit fictional evidence to begin payment review.
                            This does not confirm funds or issue a ticket.
                          </p>
                        )}
                        <h3>Refund rehearsal</h3>
                        <p>
                          Use a fresh booking before check-in to test refunds;
                          attendance may make a refund ineligible.
                        </p>
                        {button(
                          "Request fictional refund",
                          "refund-request",
                          {},
                          !!b.refund || b.paymentState !== "CONFIRMED",
                        )}
                        {b.refund?.status === "TRANSFER_REPORTED" && (
                          <>
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(x) => setConfirmed(x.target.checked)}
                              />
                              I acknowledge the fictional reported transfer.
                            </label>
                            {button(
                              "Acknowledge TEST refund",
                              "refund-step",
                              { status: "REFUND_CONFIRMED", confirmed },
                              !confirmed,
                            )}
                          </>
                        )}
                        <h3>Support</h3>
                        <form
                          onSubmit={(x) => {
                            x.preventDefault();
                            const f = new FormData(x.currentTarget);
                            action("support", {
                              message: f.get("description"),
                            });
                          }}
                        >
                          <label>
                            Describe a fictional issue
                            <textarea
                              name="description"
                              minLength={10}
                              maxLength={1500}
                              required
                              defaultValue="Fictional support request to test the local response workflow."
                            />
                          </label>
                          <button
                            className="button secondary"
                            disabled={!!busy}
                          >
                            Send local support request
                          </button>
                        </form>
                      </>
                    )}
                  </>
                )}
              </section>
              <aside className="panel mm-lab-guide">
                <h2>Your next steps</h2>
                <ol>
                  <li>Organizer: create, edit, then submit.</li>
                  <li>Administrator: inspect and approve.</li>
                  <li>Customer: register and reserve.</li>
                  <li>Customer: submit TEST payment evidence.</li>
                  <li>Finance Reviewer: confirm fictional funds.</li>
                  <li>Organizer: approve registration.</li>
                  <li>Customer: open My Tickets and the QR.</li>
                  <li>
                    Entrance Staff: validate, acknowledge ID, admit, then try
                    again.
                  </li>
                  <li>Customer: inspect Event Passport.</li>
                </ol>
                <p>
                  Use a fresh event for rescheduling, cancellation or refunds.
                  Existing history is preserved.
                </p>
                <h3>Test signup separately</h3>
                <p>
                  The normal signup flow creates an ordinary customer. It cannot
                  grant administrator authority.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setAuth("register")}
                >
                  Test account creation
                </button>
                <button
                  className="button secondary"
                  onClick={() => setAuth("login")}
                >
                  Test customer login
                </button>
                <button
                  className="button ghost"
                  onClick={async () => {
                    await api("logout", {});
                    await load();
                  }}
                >
                  Sign out current persona
                </button>
                <p>
                  Use a made-up @example.test email. After signup, edit the
                  profile or sign out and log in again. Return to Customer using
                  the persona selector.
                </p>
                <h3>Local notifications</h3>
                {state.notifications.length ? (
                  state.notifications.map((n: any) => (
                    <Link
                      className="mm-lab-notice"
                      key={n.id}
                      href={n.link || "/my-bookings"}
                    >
                      <strong>{n.title}</strong>
                      <span>{n.body}</span>
                    </Link>
                  ))
                ) : (
                  <p>
                    No updates for this persona yet. Booking and reviews create
                    local updates.
                  </p>
                )}
                <h3>Support records</h3>
                {state.support.length ? (
                  state.support.map((s: any) => (
                    <p key={s.id}>
                      {readable(s.status)} · {s.reason}
                    </p>
                  ))
                ) : (
                  <p>No support requests for this view.</p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
      {auth && (
        <Auth
          mode={auth}
          setMode={setAuth}
          close={() => setAuth(null)}
          refresh={load}
          notify={setMessage}
          demo={false}
          localLab
        />
      )}
    </div>
  );
}
