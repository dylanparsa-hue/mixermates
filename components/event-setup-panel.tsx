"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Upload, ShieldCheck } from "lucide-react";
import { api } from "./shared";
import { paymentMethods, currencyMYR } from "@/lib/event-config";
const pretty = (s: string) => s.toLowerCase().replaceAll("_", " ");
export function SetupPanel({ mode, user, notify }: any) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
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
      notify("Changes saved.");
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="setup-panel">
        <p role={error ? "alert" : "status"}>
          {error || "Loading event setup…"}
        </p>
      </div>
    );
  return (
    <div className="setup-panel">
      {error && (
        <p className="setup-error" role="alert">
          {error}
        </p>
      )}
      {mode === "Payment methods" ? (
        <>
          <PaymentMethods data={data} busy={busy} action={action} />
          <OrganizerVerification data={data} action={action} busy={busy} />
        </>
      ) : mode === "Staff" ? (
        <StaffSetup events={data.events} action={action} busy={busy} />
      ) : (
        <>
          <div className="setup-row">
            <div>
              <h2>
                {mode === "Overview" ? "Your event workspace" : "My events"}
              </h2>
              <p>Keep drafts, reviews and upcoming nights in one place.</p>
            </div>
          </div>
          {mode === "Overview" && (
            <dl className="setup-summary setup-statistics">
              {[
                ["Total events", data.events.length],
                [
                  "Drafts",
                  data.events.filter((e: any) => e.status === "DRAFT").length,
                ],
                [
                  "Awaiting review",
                  data.events.filter((e: any) => e.status === "PENDING_REVIEW")
                    .length,
                ],
                [
                  "Published",
                  data.events.filter((e: any) => e.status === "PUBLISHED")
                    .length,
                ],
                [
                  "Upcoming",
                  data.events.filter(
                    (e: any) =>
                      e.status === "PUBLISHED" &&
                      new Date(e.startsAt) > new Date(),
                  ).length,
                ],
                [
                  "Configured places",
                  data.events.reduce(
                    (n: number, e: any) =>
                      n +
                      e.tiers.reduce((s: number, t: any) => s + t.quantity, 0),
                    0,
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {mode === "My events" && (
            <dl className="setup-summary setup-statistics">
              {[
                [
                  "Upcoming events",
                  data.events.filter(
                    (e: any) =>
                      e.status === "PUBLISHED" &&
                      new Date(e.endsAt) > new Date(),
                  ).length,
                ],
                [
                  "Payment reviews",
                  data.events.reduce(
                    (n: number, e: any) => n + (e.pendingPaymentReviews || 0),
                    0,
                  ),
                ],
                [
                  "Registrations requiring action",
                  data.events.reduce(
                    (n: number, e: any) =>
                      n + e.cancellationImpact.pendingRegistrations,
                    0,
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="setup-fields">
            <label>
              Search your events
              <input
                type="search"
                name="eventSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Event status
              <select
                name="eventStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {[
                  "DRAFT",
                  "PENDING_REVIEW",
                  "PUBLISHED",
                  "SUSPENDED",
                  "CANCELLED",
                  "COMPLETED",
                ].map((v) => (
                  <option key={v} value={v}>
                    {pretty(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!data.events.length ? (
            <div className="setup-empty">
              <h3>Your first night starts with a draft.</h3>
              <p>
                Create an event, save its details, then prepare payment methods
                for review.
              </p>
            </div>
          ) : (
            <div className="setup-event-list">
              {data.events
                .filter(
                  (e: any) =>
                    (!status || e.status === status) &&
                    e.title.toLowerCase().includes(search.toLowerCase()),
                )
                .map((e: any) => (
                  <article
                    className="setup-event-row"
                    key={e.id}
                    data-event-id={e.id}
                  >
                    {e.image ? (
                      <img
                        src={e.image}
                        width={160}
                        height={112}
                        alt={`${e.title} poster`}
                      />
                    ) : (
                      <div className="setup-artwork-placeholder" />
                    )}
                    <div>
                      <div className="setup-row">
                        <h3>{e.title}</h3>
                        <span className="setup-state">
                          {e.reviewOutcome === "CHANGES_REQUESTED"
                            ? "Changes requested"
                            : pretty(e.status)}
                        </span>
                      </div>
                      <p>
                        {e.configurationStatus !== "UNCONFIRMED" &&
                        new Date(e.startsAt).getTime() > 0
                          ? new Intl.DateTimeFormat("en-MY", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: e.timezone,
                            }).format(new Date(e.startsAt))
                          : "Date unconfirmed"}{" "}
                        · {e.city || "City unconfirmed"}
                      </p>
                      <p>
                        {pretty(e.access)} · Capacity{" "}
                        {e.configurationStatus === "UNCONFIRMED"
                          ? "unconfirmed"
                          : e.capacity}{" "}
                        · Organized by you
                      </p>
                      {e.reviewNotes && (
                        <p className="setup-review-note">
                          <strong>{pretty(e.reviewOutcome)}:</strong>{" "}
                          {e.reviewNotes}
                        </p>
                      )}
                      <div className="setup-actions">
                        <Link
                          className="button secondary"
                          href={`/organizer?tab=Overview&event=${e.id}`}
                        >
                          Event overview
                        </Link>
                        <Link
                          className="button secondary"
                          href={`/create?edit=${e.id}`}
                        >
                          Edit event
                        </Link>
                        <Link
                          className="button secondary"
                          href={`/organizer?tab=Booking%20reviews&event=${e.id}`}
                        >
                          Review payments
                        </Link>
                        <Link
                          className="button secondary"
                          href={`/organizer?tab=Entrance&event=${e.id}`}
                        >
                          Open scanner
                        </Link>
                        <Link
                          className="button ghost"
                          href={`/organizer?tab=Guest%20list&event=${e.id}`}
                        >
                          Manage guests
                        </Link>
                        <details>
                          <summary>More</summary>
                          <div className="studio-advanced-links">
                            <Link href={`/events/${e.slug}?preview=1`}>
                              Preview event
                            </Link>
                            <Link
                              href={`/organizer?tab=Event%20operations&event=${e.id}`}
                            >
                              Policies, changes & refunds
                            </Link>
                            <Link href={`/organizer?tab=Staff&event=${e.id}`}>
                              Event staff
                            </Link>
                            <Link
                              href={`/organizer?tab=Analytics&event=${e.id}`}
                            >
                              Event statistics
                            </Link>
                          </div>
                        </details>
                        {e.status === "DRAFT" && (
                          <button
                            className="button primary"
                            disabled={busy}
                            onClick={() =>
                              action("event-submit", { eventId: e.id })
                            }
                          >
                            Submit for review
                          </button>
                        )}
                        {!["CANCELLED", "COMPLETED"].includes(e.status) && (
                          <details>
                            <summary>Cancel event</summary>
                            <p>
                              This closes the event and preserves its records.
                              Confirmed payments require a separate refund
                              process.
                            </p>
                            <p>
                              {e.cancellationImpact.bookings} bookings ·{" "}
                              {e.cancellationImpact.pendingRegistrations}{" "}
                              pending registrations ·{" "}
                              {e.cancellationImpact.activeTickets} active
                              tickets.
                            </p>
                            <p>
                              Confirmed payments requiring refund review:{" "}
                              {currencyMYR(
                                e.cancellationImpact.confirmedPaymentAmount,
                              )}
                              . No bank transfer is automatic.
                            </p>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action("event-state", {
                                  eventId: e.id,
                                  status: "CANCELLED",
                                })
                              }
                            >
                              Confirm cancellation
                            </button>
                          </details>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
          <div className="setup-notice">
            <ShieldCheck size={20} aria-hidden="true" />
            <p>
              Publication and payment approval are separate. Real ticket sales
              remain disabled.
            </p>
          </div>
          <OrganizerVerification data={data} action={action} busy={busy} />
        </>
      )}
    </div>
  );
}
function PaymentMethods({ data, action, busy }: any) {
  const initial = {
    methodType: "TOUCH_N_GO",
    label: "",
    recipientName: "",
    recipientReference: "",
    instructions: "",
    organizerReference: "",
    displayName: "",
    qrAssetId: "",
  };
  const [form, setForm] = useState<any>(initial),
    [destinationId, setDestinationId] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [fileName, setFileName] = useState("");
  const update = (k: string, v: string) =>
    setForm((f: any) => ({ ...f, [k]: v }));
  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("private", "true");
      fd.set("purpose", "PAYMENT_QR");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      update("qrAssetId", result.id);
      setFileName(file.name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <h2>Payment methods</h2>
      <p>
        Your QR. Your recipient. Each version is reviewed before it can be used.
      </p>
      <div className="setup-notice">
        <ShieldCheck aria-hidden="true" size={20} />
        <p>
          MixerMates does not hold these funds. Uploading a QR does not verify
          its owner. No customer payments are enabled here.
        </p>
      </div>
      <div className="setup-payment-list">
        {data.destinations.map((d: any) => (
          <section key={d.id} className="setup-destination">
            <div className="setup-row">
              <h3>{d.label}</h3>
              <span className="setup-state">
                {pretty(d.status)}
                {d.isDefault ? " · default" : ""}
              </span>
            </div>
            <p>{paymentMethods[d.methodType as keyof typeof paymentMethods]}</p>
            {d.versions.map((v: any) => (
              <div className="setup-version" key={v.id}>
                <img
                  src={`/api/payment-qr/${v.id}`}
                  alt={`Private payment QR version ${v.version}`}
                  width={176}
                  height={176}
                  loading="lazy"
                />
                <div>
                  <h4>{v.recipientName}</h4>
                  <p>
                    Version {v.version} · {pretty(v.status)}
                    {d.activeVersionId === v.id ? " · active" : ""}
                  </p>
                  <p>{v.recipientReference}</p>
                  <p>{v.instructions}</p>
                  {v.reviewNotes && (
                    <p>
                      <strong>Review:</strong> {v.reviewNotes}
                    </p>
                  )}
                  <p className="setup-help">
                    {v.testOnly
                      ? "Local test configuration. Real recipient verification is still required before launch."
                      : "Recipient reviewed under the recorded procedure."}
                  </p>
                </div>
              </div>
            ))}
            <div className="setup-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  const v = d.versions[0];
                  setDestinationId(d.id);
                  setForm({
                    ...initial,
                    methodType: d.methodType,
                    label: d.label,
                    recipientName: v.recipientName,
                    recipientReference: v.recipientReference,
                    instructions: v.instructions,
                    organizerReference: v.organizerReference,
                    displayName: v.displayName,
                  });
                  setFileName("");
                  document
                    .getElementById("payment-method-editor")
                    ?.scrollIntoView({ behavior: "auto" });
                }}
              >
                Submit a new version
              </button>
              {d.status === "APPROVED" && !d.isDefault && (
                <button
                  className="button ghost"
                  disabled={busy}
                  onClick={() =>
                    action("payment-destination-action", {
                      destinationId: d.id,
                      action: "DEFAULT",
                      reason: "Organizer selected this approved default.",
                    })
                  }
                >
                  Use as organizer default
                </button>
              )}
              {d.status !== "DISABLED" && (
                <details>
                  <summary>Disable destination</summary>
                  <p>
                    New payment instructions will no longer use this
                    destination.
                  </p>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      action("payment-destination-action", {
                        destinationId: d.id,
                        action: "DISABLE",
                        reason: "Organizer disabled this payment destination.",
                      })
                    }
                  >
                    Confirm disable
                  </button>
                </details>
              )}
            </div>
          </section>
        ))}
      </div>
      <form
        id="payment-method-editor"
        className="setup-payment-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          const saved = await action("payment-destination", {
            ...form,
            ...(destinationId ? { destinationId } : {}),
          });
          if (saved) {
            setForm(initial);
            setDestinationId("");
            setFileName("");
          }
        }}
      >
        <h3>
          {destinationId ? "New recipient version" : "Add payment destination"}
        </h3>
        <p>
          Use fictional details and a fictional QR for local testing. Existing
          versions stay unchanged.
        </p>
        <fieldset disabled={busy || uploading}>
          <div className="setup-fields">
            <label>
              Payment method
              <select
                value={form.methodType}
                disabled={!!destinationId}
                onChange={(e) => update("methodType", e.target.value)}
              >
                {Object.entries(paymentMethods).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["Destination label", "label"],
              ["Recipient name", "recipientName"],
              ["Account identifier (optional)", "recipientReference"],
              ["Organizer display name (optional)", "displayName"],
              ["Organizer reference (optional)", "organizerReference"],
            ].map(([label, k]) => (
              <label key={k}>
                {label}
                <input
                  name={k}
                  value={form[k]}
                  onChange={(e) => update(k, e.target.value)}
                  required={["label", "recipientName"].includes(k)}
                  maxLength={
                    k === "recipientName" || k === "recipientReference"
                      ? 160
                      : 100
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Payment instructions (optional)
            <textarea
              name="instructions"
              value={form.instructions}
              maxLength={1000}
              onChange={(e) => update("instructions", e.target.value)}
            />
          </label>
          <label className="setup-qr-upload">
            <Upload size={20} aria-hidden="true" />
            Upload private QR image
            <input
              name="qr"
              key={destinationId + form.qrAssetId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required={!form.qrAssetId}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <small>
              PNG, JPG or WebP, up to 4 MB.{" "}
              {fileName && `Uploaded: ${fileName}`}
            </small>
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="setup-error">
            {error}
          </p>
        )}
        <div className="setup-actions">
          <button
            type="submit"
            className="button primary"
            disabled={busy || uploading || !form.qrAssetId}
          >
            {uploading
              ? "Uploading…"
              : busy
                ? "Submitting…"
                : "Submit QR for review"}
          </button>
          {destinationId && (
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                setDestinationId("");
                setForm(initial);
                setFileName("");
              }}
            >
              Add a different destination
            </button>
          )}
        </div>
        <p role="status">
          {uploading
            ? "Saving your private QR image…"
            : "Only you and authorized admins can preview these QR images."}
        </p>
      </form>
    </>
  );
}
function OrganizerVerification({ data, action, busy }: any) {
  const [note, setNote] = useState("");
  return (
    <details id="organizer-verification" className="setup-verification" open>
      <summary>Organizer verification</summary>
      <p>
        {data.verification[0]
          ? `Current request: ${pretty(data.verification[0].status)}`
          : "No verification request submitted."}
      </p>
      {data.verification[0]?.reviewNotes && (
        <p>{data.verification[0].reviewNotes}</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action("verification-submit", { note });
        }}
      >
        <label>
          Organizer and event details
          <textarea
            minLength={20}
            maxLength={1500}
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className="setup-help">
          Explain who organizes the event and how authorization can be checked.
          Do not upload identity documents here. Local fictional approval is
          marked test-only.
        </p>
        <button className="button secondary" disabled={busy}>
          Request verification
        </button>
      </form>
    </details>
  );
}
function StaffSetup({ events, action, busy }: any) {
  const [eventId, setEventId] = useState(events[0]?.id || ""),
    [username, setUsername] = useState(""),
    [permissions, setPermissions] = useState<any>({
      canViewGuests: true,
      canCheckIn: true,
      canReviewPayments: false,
      canApproveRegistrations: false,
      canViewLocation: false,
    });
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("event");
    if (id && events.some((event: any) => event.id === id)) setEventId(id);
  }, [events]);
  const e = events.find((e: any) => e.id === eventId);
  return (
    <>
      <h2>Event staff</h2>
      <p>Give each person only the access they need, for one event.</p>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          action("staff-assignment", {
            eventId,
            username,
            active: true,
            ...permissions,
          });
        }}
      >
        <label>
          Event
          <select
            value={eventId}
            aria-label="Staff event"
            onChange={(e) => {
              setEventId(e.target.value);
              const url = new URL(location.href);
              url.searchParams.set("event", e.target.value);
              window.history.replaceState(null, "", url);
            }}
          >
            {events.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Existing staff account username
          <input
            required
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            spellCheck={false}
          />
        </label>
        {Object.entries({
          canViewGuests: "View guest list",
          canCheckIn: "Check in guests",
          canReviewPayments: "Review payments",
          canApproveRegistrations: "Approve registrations",
          canViewLocation: "View exact private location",
        }).map(([k, label]) => (
          <label className="setup-check" key={k}>
            <input
              type="checkbox"
              checked={permissions[k]}
              onChange={(e) =>
                setPermissions((p: any) => ({ ...p, [k]: e.target.checked }))
              }
            />
            {label}
          </label>
        ))}
        <button className="button primary" disabled={busy || !eventId}>
          Save staff permissions
        </button>
      </form>
      <h3>Assigned staff</h3>
      {!e?.staff?.length ? (
        <p>No staff assigned to this event yet.</p>
      ) : (
        e.staff.map((s: any) => (
          <div className="setup-list-item" key={s.userId}>
            <strong>{s.user.name}</strong>
            <p>
              @{s.user.username} · {s.active ? "Active" : "Revoked"}
            </p>
            <p>
              {[
                "canViewGuests",
                "canCheckIn",
                "canReviewPayments",
                "canApproveRegistrations",
                "canViewLocation",
              ]
                .filter((k) => s[k])
                .join(", ") || "No capabilities"}
            </p>
            {s.active && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  action("staff", { eventId, userId: s.userId, active: false })
                }
              >
                Revoke access
              </button>
            )}
          </div>
        ))
      )}
    </>
  );
}
