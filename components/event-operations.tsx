"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { api } from "./shared";
import { localDateTime, zonedInstant } from "@/lib/event-config";
const words = (s: string) => s.toLowerCase().replaceAll("_", " ");
const when = (v: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(v));
export function EventOperations({ user }: any) {
  const serial = useRef(0);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null),
    [eventId, setEventId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!ready) return;
    const version = ++serial.current;
    try {
      const result = await api(
        "event-operations" +
          (eventId ? "?event=" + encodeURIComponent(eventId) : ""),
      );
      if (version !== serial.current) return;
      setData(result);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [eventId, ready]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("event");
    if (id) setEventId(id);
    setReady(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function action(p: string, body: any) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api("event-operations/" + p, body);
      await load();
      setMessage("Review record saved. Real sales remain disabled.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const e = data?.event;
  return (
    <section className="setup-panel operations">
      <div className="setup-row">
        <h2>Event operations & readiness</h2>
        <button className="button secondary" onClick={load}>
          Refresh
        </button>
      </div>
      <p>
        Reviewed changes preserve existing bookings and payment snapshots. Every
        real-world check is separate from software readiness and sales
        authorization.
      </p>
      {error && (
        <p className="setup-error" role="alert">
          {error}
        </p>
      )}
      <p role="status">{busy ? "Saving…" : message}</p>
      {!data ? (
        <p role="status">Loading event operations…</p>
      ) : !data.events.length ? (
        <p>No permitted events yet. Create a draft first.</p>
      ) : (
        <>
          <label>
            Managed event
            <select
              disabled={busy}
              name="managedEvent"
              value={e?.id || ""}
              onChange={(v) => {
                setEventId(v.target.value);
                window.history.replaceState(
                  null,
                  "",
                  `${user.role === "ADMIN" ? "/admin" : "/organizer"}?tab=Event%20operations&event=${v.target.value}`,
                );
              }}
            >
              {data.events.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                  {x.pendingChangeId ? " — change awaiting review" : ""}
                </option>
              ))}
            </select>
          </label>
          {e && (
            <>
              <h3>{e.title}</h3>
              <p>
                {words(e.status)} · {data.bookings} existing bookings ·{" "}
                {e.pendingChangeId
                  ? "Change pending; new bookings, issuance and entry paused"
                  : "No pending term change"}
              </p>
              <details>
                <summary>Readiness checklist</summary>
                <p>
                  Real sales authorization: unavailable. No checklist control
                  enables payments.
                </p>
                {data.readiness.categories.map((c: any) => (
                  <article className="ops-record" key={c.name}>
                    <h4>
                      {c.name} · {words(c.status)}
                    </h4>
                    <ul>
                      {c.items.map((v: string) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </article>
                ))}
                {data.readiness.software.map((c: any) => (
                  <article className="ops-record" key={c.name}>
                    <strong>
                      {c.pass ? "Software check passed" : "Incomplete"}:{" "}
                      {c.name}
                    </strong>
                    <p>{c.detail}</p>
                  </article>
                ))}
                <h4>Human verification still required</h4>
                <ul>
                  {data.readiness.human.map((c: any) => (
                    <li key={c.name}>
                      {c.name} — {words(c.blockerStatus || c.status)}
                    </li>
                  ))}
                </ul>
                <p>
                  Genuine organizer identity:{" "}
                  {data.readiness.realIdentityVerified
                    ? "Evidence recorded; separate acceptance still required"
                    : "not verified"}
                  . Genuine recipient ownership:{" "}
                  {data.readiness.realRecipientVerified
                    ? "Procedure recorded; separate acceptance still required"
                    : "not verified"}
                  .
                </p>
              </details>
              <details>
                <summary>Request event change</summary>
                <p>
                  Compare your proposal with the approved details. While review
                  is pending, new reservations, ticket issuance and entrance are
                  paused. Date/venue/entry instructions require independent
                  review; financial prices, access and age cannot be changed
                  here.
                </p>
                {e.status === "PUBLISHED" && !e.pendingChangeId ? (
                  <ChangeForm
                    key={e.id + ":" + e.termsVersion}
                    event={e}
                    busy={busy}
                    save={(v: any) => action("request", v)}
                  />
                ) : (
                  <p>
                    Available for future published events without another
                    pending request. Drafts without bookings can use ordinary
                    editing.
                  </p>
                )}
              </details>
              <details>
                <summary>Refund policy</summary>
                <p>
                  Policies apply prospectively. Existing bookings keep the
                  policy recorded when they reserved. Non-refundable wording
                  cannot decide legal rights; disputed cases need independent
                  review.
                </p>
                <ValueList value={JSON.parse(e.refundPolicy)} />
                {["DRAFT", "PUBLISHED"].includes(e.status) &&
                  !e.pendingChangeId && (
                    <PolicyForm
                      key={e.id + ":" + e.termsVersion}
                      event={e}
                      busy={busy}
                      save={(v: any) => action("request", v)}
                    />
                  )}
              </details>
              <h3>Change history and review</h3>
              {!data.changes.length && <p>No change requests yet.</p>}
              {data.changes.map((r: any) => (
                <ChangeReview
                  key={r.id + ":" + r.status}
                  value={r}
                  admin={user.role === "ADMIN"}
                  userId={user.id}
                  busy={busy}
                  action={action}
                />
              ))}
              <details>
                <summary>Organizer & recipient verification readiness</summary>
                <h4>Organizer review history</h4>
                <p>
                  Identity, legitimate event, responsible contact, venue
                  authorization, required documentation, age restrictions,
                  refund responsibility and support ownership require a real
                  human procedure. Do not upload identity documents here.
                </p>
                {!data.verifications.length && (
                  <p>No verification application submitted.</p>
                )}
                {data.verifications.map((v: any) => (
                  <article className="ops-record" key={v.id}>
                    <strong>
                      {words(v.status)} ·{" "}
                      {v.testOnly
                        ? "Fictional test only"
                        : "Real procedure recorded; external acceptance required"}
                    </strong>
                    <p>{v.note}</p>
                    <p>
                      {v.reviewNotes} · Reviewer:{" "}
                      {v.reviewedById || "not reviewed"}
                    </p>
                  </article>
                ))}
                <h4>Associated events</h4>
                <p>
                  {data.relatedEvents
                    .map((v: any) => v.title + " (" + words(v.status) + ")")
                    .join(" · ")}
                </p>
                <h4>Payment destination versions</h4>
                <p>
                  Check actual recipient authority, current QR, method,
                  independent review procedure and authorized ownership. A QR
                  upload is not bank verification.
                </p>
                {!e.paymentDestination && (
                  <p>No payment destination assigned — incomplete.</p>
                )}
                {e.paymentDestination?.versions.map((v: any) => (
                  <article className="ops-record" key={v.id}>
                    <strong>
                      Version {v.version} ·{" "}
                      {v.disabledAt
                        ? "Disabled"
                        : v.status === "APPROVED" &&
                            e.paymentDestination.activeVersionId !== v.id
                          ? "Superseded"
                          : words(v.status)}{" "}
                      ·{" "}
                      {v.testOnly
                        ? "Fictional local testing only"
                        : "Required real procedure recorded"}
                    </strong>
                    <p>{v.recipientName}</p>
                    <p>
                      {v.reviewNotes} · Reviewer:{" "}
                      {v.approvedById || "not reviewed"}
                    </p>
                    <p>
                      {v.verificationProcedure ||
                        "No ownership procedure recorded"}
                    </p>
                  </article>
                ))}
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}
function ChangeForm({ event: e, busy, save }: any) {
  return (
    <form
      onSubmit={(v) => {
        v.preventDefault();
        const f = new FormData(v.currentTarget);
        const values: any = Object.fromEntries(f);
        const reason = values.reason;
        delete values.reason;
        values.latitude = Number(values.latitude);
        values.longitude = Number(values.longitude);
        save({
          eventId: e.id,
          version: e.termsVersion,
          kind: "DETAILS",
          reason,
          values,
        });
      }}
    >
      <p>
        Current schedule: {when(e.startsAt)} to {when(e.endsAt)}. Enter proposed
        times in {e.timezone}.
      </p>
      {[
        [
          "Proposed start",
          "startsLocal",
          localDateTime(e.startsAt, e.timezone),
          "datetime-local",
        ],
        [
          "Proposed end",
          "endsLocal",
          localDateTime(e.endsAt, e.timezone),
          "datetime-local",
        ],
        ["Venue label", "venue", e.venue, "text"],
        ["Private venue / address", "privateVenue", e.privateVenue, "text"],
        ["City", "city", e.city, "text"],
        ["Latitude", "latitude", e.latitude, "number"],
        ["Longitude", "longitude", e.longitude, "number"],
      ].map(([label, name, value, type]: any) => (
        <label key={name}>
          {label}
          <input
            name={name}
            type={type}
            defaultValue={value}
            required={name !== "privateVenue"}
            step={type === "number" ? "any" : undefined}
            maxLength={type === "text" ? 191 : undefined}
          />
        </label>
      ))}
      <label>
        Important entry instructions
        <textarea
          name="entryInstructions"
          defaultValue={e.entryInstructions}
          maxLength={1500}
        />
      </label>
      <label>
        Reason for change
        <textarea name="reason" required minLength={5} maxLength={191} />
      </label>
      <button className="button primary" disabled={busy}>
        Submit change for review
      </button>
    </form>
  );
}
function PolicyForm({ event: e, busy, save }: any) {
  return (
    <form
      onSubmit={(v) => {
        v.preventDefault();
        const f = new FormData(v.currentTarget);
        save({
          eventId: e.id,
          version: e.termsVersion,
          kind: "REFUND_POLICY",
          reason: f.get("reason"),
          values: {
            kind: f.get("kind"),
            terms: f.get("terms"),
            deadline: f.get("deadline")
              ? zonedInstant(
                  String(f.get("deadline")),
                  e.timezone,
                ).toISOString()
              : null,
            allowAfterChange: f.get("allowAfterChange") === "on",
          },
        });
      }}
    >
      <label>
        Policy category
        <select name="kind">
          {[
            "REVIEW_REQUIRED",
            "CANCELLATION_ONLY",
            "UNTIL_DEADLINE",
            "NON_REFUNDABLE_REVIEW",
            "CUSTOM_REVIEW",
          ].map((k) => (
            <option key={k} value={k}>
              {words(k)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Policy terms
        <textarea name="terms" required minLength={20} maxLength={1500} />
      </label>
      <label>
        Request deadline, when applicable ({e.timezone})
        <input name="deadline" type="datetime-local" />
      </label>
      <label className="setup-check">
        <input type="checkbox" name="allowAfterChange" />
        Allow review after an approved material event change
      </label>
      <label>
        Reason for policy review
        <textarea name="reason" required minLength={5} maxLength={191} />
      </label>
      <button className="button primary" disabled={busy}>
        Submit policy for approval
      </button>
    </form>
  );
}
function ChangeReview({ value: r, admin, userId, busy, action }: any) {
  const [notes, setNotes] = useState("");
  return (
    <article className="ops-record">
      <h4>
        {r.kind === "DETAILS" ? "Event detail change" : "Refund policy change"}{" "}
        · {words(r.status)}
      </h4>
      <p>
        {when(r.createdAt)} · Requested by {r.requesterId}
      </p>
      <p>{r.reason}</p>
      <details>
        <summary>Compare previous and proposed values</summary>
        <h5>Previous</h5>
        <ValueList value={JSON.parse(r.previousValues)} />
        <h5>Proposed</h5>
        <ValueList value={JSON.parse(r.proposedValues)} />
      </details>
      {r.reviewNotes && (
        <p>
          Review: {r.reviewNotes} · {r.reviewerId}
        </p>
      )}
      {r.effectiveAt && (
        <p>
          Effective: {when(r.effectiveAt)} · Customer updates:{" "}
          {r.notifiedAt
            ? "stored in-app"
            : "not applicable to existing booking policies"}
        </p>
      )}
      {admin && r.requesterId !== userId && r.status === "PENDING_REVIEW" && (
        <>
          <label>
            Change review notes
            <textarea
              required
              minLength={5}
              maxLength={191}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="setup-actions">
            <button
              className="button primary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                action("review", { id: r.id, approve: true, notes })
              }
            >
              Approve change
            </button>
            <button
              className="button secondary"
              disabled={busy || notes.trim().length < 5}
              onClick={() =>
                action("review", { id: r.id, approve: false, notes })
              }
            >
              Reject change
            </button>
          </div>
        </>
      )}
    </article>
  );
}
export function OperationalJobs() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api("job-operations"));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function run(p: string, v: any) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("job-operations/" + p, v);
      await load();
      setMessage(
        "Local operation completed and audited. No external messages or transfers were sent.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="setup-panel operations">
      <h2>Operational tasks</h2>
      <p>
        Local fictional workers only. No cron, real email, SMS or push service
        is configured. In-app updates remain available when transport fails.
      </p>
      {error && (
        <p role="alert" className="setup-error">
          {error}
        </p>
      )}
      <p role="status">{busy ? "Processing…" : message}</p>
      <div className="setup-actions">
        <button className="button secondary" onClick={load}>
          Refresh tasks
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => run("run", {})}
        >
          Run local operational jobs
        </button>
      </div>
      {!data ? (
        <p>Loading operational tasks…</p>
      ) : (
        <>
          <h3>Delivery failures and retries</h3>
          {!data.jobs.length && (
            <p>No failed, retrying or leased deliveries.</p>
          )}
          {data.jobs.map((n: any) => (
            <article className="ops-record" key={n.id}>
              <strong>
                {n.title} · {words(n.jobStatus)}
              </strong>
              <p>
                {n.attempts} attempts · {n.lastError || "No error recorded"} ·
                Last attempt:{" "}
                {n.lastAttemptAt ? when(n.lastAttemptAt) : "not attempted"}
              </p>
              <p>Next eligible attempt: {when(n.nextAttemptAt)}</p>
              {["FAILED", "RETRY"].includes(n.jobStatus) && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => run("retry", { id: n.id })}
                >
                  Request delivery retry
                </button>
              )}
            </article>
          ))}
          <h3>Unreleased expired holds</h3>
          <p>
            {data.expired.length} eligible records awaiting the expiry worker.
            Submitted-evidence and confirmed-funds holds are excluded.
          </p>
          <h3>Stale payment reviews</h3>
          <p>
            {data.reviews.length} reviews older than 24 hours. This is a local
            monitoring threshold, not an approved service deadline.
          </p>
          <h3>Ticket issuance recovery</h3>
          {!data.recovery.length && (
            <p>
              No eligible-looking records awaiting issuance recovery. Every
              retry rechecks all admission requirements.
            </p>
          )}
          {data.recovery.map((b: any) => (
            <article className="ops-record" key={b.id}>
              <p>
                Booking {b.id} · Event {b.eventId}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => run("issuance", { id: b.id })}
              >
                Retry eligible issuance
              </button>
            </article>
          ))}
          <h3>Recent operational and entrance activity</h3>
          {!data.logs.length && <p>No operational activity records.</p>}
          {data.logs.map((a: any) => (
            <article className="ops-record" key={a.id}>
              <strong>{words(a.action)}</strong>
              <p>
                {when(a.createdAt)} · Record {a.targetId}
              </p>
              <p>
                {a.reasonCode
                  ? words(a.reasonCode)
                  : a.newState
                    ? words(a.newState)
                    : "No error reported."}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  );
}

function ValueList({ value }: any) {
  const v = value.policy || value;
  const labels: Record<string, string> = {
    startsAt: "Start",
    endsAt: "End",
    venue: "Venue label",
    privateVenue: "Private venue",
    city: "City",
    latitude: "Latitude",
    longitude: "Longitude",
    entryInstructions: "Entry instructions",
    kind: "Policy category",
    terms: "Policy terms",
    deadline: "Request deadline",
    allowAfterChange: "Review after material event change",
  };
  const rows = Object.entries(labels).filter(([k]) => v[k] !== undefined);
  return rows.length ? (
    <dl>
      {rows.map(([k, label]) => (
        <div className="ops-value" key={k}>
          <dt>{label}</dt>
          <dd>
            {["startsAt", "endsAt", "deadline"].includes(k) && v[k]
              ? when(v[k])
              : typeof v[k] === "boolean"
                ? v[k]
                  ? "Yes"
                  : "No"
                : v[k] === null
                  ? "Not configured"
                  : String(v[k]) || "Not supplied"}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p>No approved terms recorded.</p>
  );
}
