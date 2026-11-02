"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./shared";
import {
  currencyMYR,
  paymentMethods,
  eventDateLabel,
  eventAccessLabel,
} from "@/lib/event-config";
export function SetupReview({ notify, eventsOnly = false, onChange }: any) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api("setup")
        .then(setData)
        .catch((e: any) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function action(path: string, body: any) {
    setBusy(true);
    setError("");
    try {
      await api(path, body);
      await load();
      onChange?.();
      notify("Review saved with its audit record.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Loading review queue…"}
      </p>
    );
  const q = data.reviewQueue;
  if (!q) return <p role="alert">Administrator access required.</p>;
  return (
    <div className="setup-panel">
      <h2>{eventsOnly ? "Publication review" : "Event setup reviews"}</h2>
      <p>
        Review the event, the organizer and the payment recipient separately.
        Every decision is recorded. Customer payments remain disabled.
      </p>
      {error && (
        <div role="alert" className="setup-error">
          {error}
        </div>
      )}
      <h3>Publication requests</h3>
      {!q.events.length && <p>No event submissions are waiting.</p>}
      {q.events
        .filter((e: any) =>
          eventsOnly
            ? e.status === "PENDING_REVIEW"
            : e.creationKey || e.status !== "PUBLISHED",
        )
        .map((e: any) => (
          <EventReview key={e.id} event={e} busy={busy} action={action} />
        ))}
      {!eventsOnly && (
        <>
          <h3>Payment QR submissions</h3>
          {!q.recipients.length && <p>No QR submissions yet.</p>}
          {q.recipients.map((v: any) => (
            <RecipientReview
              key={v.id}
              version={v}
              busy={busy}
              action={action}
            />
          ))}
          <h3>Organizer verification</h3>
          {!q.verifications.length && <p>No verification requests yet.</p>}
          {q.verifications.map((v: any) => (
            <VerificationReview
              key={v.id}
              value={v}
              busy={busy}
              action={action}
            />
          ))}
        </>
      )}
    </div>
  );
}
function EventReview({ event: e, busy, action }: any) {
  const [notes, setNotes] = useState("");
  return (
    <article className="setup-review-item" data-event-id={e.id}>
      <div className="setup-row">
        <h4>{e.title}</h4>
        <span className="setup-state">{e.status.replaceAll("_", " ")}</span>
      </div>
      <p>
        {e.organizer.name} · Organizer {e.organizer.verification.toLowerCase()}{" "}
        · {eventAccessLabel(e.access)}
      </p>
      <p>{e.description}</p>
      <dl className="setup-summary">
        <div>
          <dt>Date</dt>
          <dd>
            {e.configurationStatus === "UNCONFIRMED"
              ? "Date unconfirmed"
              : `${eventDateLabel(e.startsAt, e.timezone)} — ${eventDateLabel(e.endsAt, e.timezone)} (${e.timezone})`}
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {e.venue} · {e.privateVenue || "Exact address not provided"}
          </dd>
        </div>
        <div>
          <dt>Age and capacity</dt>
          <dd>
            {e.age}+ · {e.capacity} places
          </dd>
        </div>
        <div>
          <dt>Payment destination</dt>
          <dd>
            {e.paymentDestination
              ? `${e.paymentDestination.label} (${e.paymentDestination.status})`
              : "Not configured"}
          </dd>
        </div>
      </dl>
      <p>
        {e.tiers
          .map(
            (t: any) =>
              `${t.name}: ${currencyMYR(t.price)} / ${t.quantity} places`,
          )
          .join(" · ")}
      </p>
      <p>Policies: {e.policies || "Not supplied"}</p>
      <Link href={`/events/${e.slug}?preview=1`}>
        Open authenticated event preview
      </Link>
      <label>
        Event review notes
        <textarea
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          maxLength={1000}
        />
      </label>
      <div className="setup-actions">
        {e.status === "PENDING_REVIEW" ? (
          <>
            {[
              ["APPROVE", "Approve publication"],
              ["CHANGES_REQUESTED", "Request changes"],
              ["REJECT", "Reject submission"],
            ].map(([decision, label]) => (
              <button
                className={
                  decision === "APPROVE" ? "button primary" : "button secondary"
                }
                key={decision}
                disabled={busy}
                onClick={() =>
                  action("event-review", { eventId: e.id, decision, notes })
                }
              >
                {label}
              </button>
            ))}
          </>
        ) : e.status === "PUBLISHED" ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              action("event-review", {
                eventId: e.id,
                decision: "SUSPEND",
                notes,
              })
            }
          >
            Suspend event
          </button>
        ) : (
          <p>
            Suspended events require explicit administrator restoration; editing
            cannot bypass suspension.
          </p>
        )}
      </div>
    </article>
  );
}
function RecipientReview({ version: v, busy, action }: any) {
  const [notes, setNotes] = useState(""),
    [procedure, setProcedure] = useState(""),
    [checked, setChecked] = useState(false);
  return (
    <article className="setup-review-item">
      <div className="setup-row">
        <h4>
          {v.destination.label} · Version {v.version}
        </h4>
        <span className="setup-state">
          {v.status.toLowerCase()}
          {v.disabledAt ? " · disabled" : ""}
        </span>
      </div>
      <div className="setup-version">
        <img
          src={`/api/payment-qr/${v.id}`}
          width={200}
          height={200}
          loading="lazy"
          alt={`Private QR from ${v.destination.organizer.name}`}
        />
        <div>
          <p>Organizer: {v.destination.organizer.name}</p>
          <p>
            Method:{" "}
            {
              paymentMethods[
                v.destination.methodType as keyof typeof paymentMethods
              ]
            }
          </p>
          <p>
            <strong>Recipient: {v.recipientName}</strong>
          </p>
          <p>Account identifier: {v.recipientReference || "Not provided"}</p>
          <p>
            Submitted{" "}
            {new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(
              new Date(v.createdAt),
            )}
          </p>
          <p>
            {v.destination.activeVersionId === v.id
              ? "Currently active"
              : v.destination.activeVersionId
                ? "A previous approved version is retained"
                : "No active version"}
          </p>
          <p>{v.reviewNotes}</p>
        </div>
      </div>
      {v.status === "PENDING_REVIEW" ? (
        <>
          <label>
            Manual recipient verification procedure
            <textarea
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              maxLength={1000}
              placeholder="Record how the recipient and organizer authorization were checked…"
            />
          </label>
          <label className="setup-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            I checked recipient ownership independently. For this local test, I
            checked the fictional sample and its test organizer.
          </label>
          <label>
            QR review notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </label>
          <div className="setup-actions">
            {[
              ["APPROVE", "Approve QR"],
              ["CORRECTION", "Request correction"],
              ["REJECT", "Reject QR"],
            ].map(([decision, label]) => (
              <button
                disabled={busy}
                key={decision}
                className={
                  decision === "APPROVE" ? "button primary" : "button secondary"
                }
                onClick={() =>
                  action("payment-destination-review", {
                    versionId: v.id,
                    decision,
                    notes,
                    procedure,
                    recipientChecked: checked,
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        v.status === "APPROVED" && (
          <>
            <label>
              Destination action reason
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
              />
            </label>
            <div className="setup-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  action("payment-destination-action", {
                    destinationId: v.destinationId,
                    versionId: v.id,
                    action: "ACTIVATE",
                    reason: notes,
                  })
                }
              >
                Activate approved version
              </button>
              <details>
                <summary>Disable destination</summary>
                <p>
                  This prevents new payment instructions. Historic booking
                  snapshots stay unchanged.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    action("payment-destination-action", {
                      destinationId: v.destinationId,
                      action: "DISABLE",
                      reason: notes,
                    })
                  }
                >
                  Confirm disable
                </button>
              </details>
            </div>
          </>
        )
      )}
      <p className="setup-help">
        {v.testOnly
          ? "Test-only configuration. No real payment recipient has been verified."
          : "Review under the approved recipient verification procedure."}
      </p>
    </article>
  );
}
function VerificationReview({ value: v, busy, action }: any) {
  const [notes, setNotes] = useState(""),
    [checked, setChecked] = useState(false);
  return (
    <article className="setup-review-item">
      <h4>{v.user.name}</h4>
      <p>{v.note}</p>
      <span className="setup-state">
        {v.status} · {v.testOnly ? "Test-only" : "Real review"}
      </span>
      {v.status === "PENDING_REVIEW" && (
        <>
          <label>
            Verification review notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </label>
          <label className="setup-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            I explicitly approve this fictional local test organizer. This does
            not claim real identity verification.
          </label>
          <div className="setup-actions">
            <button
              disabled={busy}
              className="button primary"
              onClick={() =>
                action("verification-review", {
                  id: v.id,
                  approve: true,
                  notes,
                  identityChecked: checked,
                })
              }
            >
              Approve test organizer
            </button>
            <button
              disabled={busy}
              className="button secondary"
              onClick={() =>
                action("verification-review", {
                  id: v.id,
                  approve: false,
                  notes,
                  identityChecked: checked,
                })
              }
            >
              Reject verification
            </button>
          </div>
        </>
      )}
    </article>
  );
}
