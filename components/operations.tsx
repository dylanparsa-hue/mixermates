"use client";
import { CommissionSummary } from "./commission-summary";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, currency } from "./shared";
const words = (s: string) => s.toLowerCase().replaceAll("_", " ");
const when = (s: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(s));
export function Operations({
  mode,
  user,
  customer = false,
}: {
  mode: string;
  user: any;
  customer?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(0),
    [noticePage, setNoticePage] = useState(0);
  const prefix = customer ? "customer/" : "";
  const load = useCallback(async () => {
    try {
      setData(
        await api(
          prefix + "operations?q=" + encodeURIComponent(q) + "&page=" + page,
        ),
      );
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [prefix, q, page]);
  useEffect(() => {
    load();
  }, [load]);
  async function action(path: string, body: any) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(prefix + "operations/" + path, body);
      await load();
      setMessage("Changes saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const admin = user.role === "ADMIN";
  return (
    <section className="setup-panel operations" aria-label={mode}>
      <div className="setup-row">
        <h2>
          {mode === "Overview"
            ? admin
              ? "Platform overview"
              : "Your event workspace"
            : mode}
        </h2>
        <button className="button secondary" disabled={busy} onClick={load}>
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="setup-error">
          {error}{" "}
          <button className="text-button" onClick={load}>
            Retry loading
          </button>
        </p>
      )}
      <p role="status">{busy ? "Saving…" : message}</p>
      {!data ? (
        <p role="status">Loading management records…</p>
      ) : (
        <>
          {["Overview", "Analytics", "Earnings", "Payments"].includes(mode) && (
            <>
              {mode === "Payments" && <CommissionSummary />}
              <p>
                Values come from your permitted records. Real ticket sales
                remain disabled.
              </p>
              <dl className="setup-summary setup-statistics">
                {Object.entries(data.metrics || {}).map(([k, v]: any) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {data.finance && (
                <>
                  <h3>Organizer-direct payments</h3>
                  <Link
                    className="button secondary"
                    href={
                      admin
                        ? "/admin?tab=Booking%20reviews"
                        : "/organizer?tab=Booking%20reviews"
                    }
                  >
                    Open payment & registration reviews
                  </Link>
                  <p>
                    Confirmed historical receipts:{" "}
                    <strong>{currency(data.finance.confirmedDirect)}</strong>.
                    Money was paid directly to organizers. This total includes
                    amounts subsequently sent for refund review.
                  </p>
                  <p>
                    Outstanding expected payments:{" "}
                    {currency(data.finance.pendingAmount)}.{" "}
                    {data.finance.pendingPayments} payment reviews ·{" "}
                    {data.finance.rejectedPayments} rejected claims ·{" "}
                    {data.finance.pendingRefunds} payments pending refund.
                  </p>
                  <p>
                    Event views and conversion metrics are unavailable.
                    Attendance rates and the check-in timeline are in Entrance.
                    Platform commission is tracked separately from organizer receipts.
                    Review Ticket sales & fees for accrued obligations and collected amounts.
                  </p>
                </>
              )}
              <h3>Events and ticket inventory</h3>
              {!data.events?.length && (
                <p>No events yet. Create a draft to begin.</p>
              )}
              {data.events
                ?.slice(0, mode === "Overview" ? 4 : undefined)
                .map((e: any) => (
                  <article className="ops-record" key={e.id}>
                    <h4>{e.title}</h4>
                    <p>
                      {words(e.status)}
                      {e.reviewOutcome === "CHANGES_REQUESTED"
                        ? " · changes requested"
                        : ""}
                    </p>
                    <p>
                      {e.tiers
                        .map(
                          (t: any) =>
                            `${t.name}: ${t.confirmed} confirmed; ${t.sold} reserved of ${t.quantity}`,
                        )
                        .join(" · ")}
                    </p>
                    <div className="setup-actions">
                      <Link
                        className="button secondary"
                        href={`/organizer?tab=Booking%20reviews&event=${e.id}`}
                      >
                        Review bookings
                      </Link>
                      <Link
                        className="button ghost"
                        href={`/organizer?tab=Entrance&event=${e.id}`}
                      >
                        Entrance & attendance
                      </Link>
                      {!admin && (
                        <Link
                          className="button ghost"
                          href={`/create?edit=${e.id}`}
                        >
                          Manage event
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
            </>
          )}
          {mode === "Overview" && data.events?.length > 4 && (
            <Link
              className="button secondary"
              href={admin ? "/admin?tab=Events" : "/organizer?tab=My%20events"}
            >
              View all events
            </Link>
          )}
          {mode === "Bookings" && (
            <>
              <p>
                Latest 100 permitted bookings. Open Booking reviews for answers,
                private evidence and independent review actions.
              </p>
              {!data.bookings?.length && <p>No bookings yet.</p>}
              {data.bookings?.map((b: any) => (
                <article className="ops-record" key={b.id}>
                  <h3>{b.event.title}</h3>
                  <p>
                    {b.user.name} · {b.id}
                  </p>
                  <p>
                    {b.tier.name} × {b.quantity} · {currency(b.total)}
                  </p>
                  <p>
                    Registration: {words(b.registrationState)} · Payment:{" "}
                    {words(b.paymentState)} · Booking: {words(b.lifecycle)}
                  </p>
                  <Link
                    href={
                      admin
                        ? "/admin?tab=Booking%20reviews"
                        : `/organizer?tab=Booking%20reviews&event=${b.event.id}`
                    }
                  >
                    Open reviews
                  </Link>
                </article>
              ))}
            </>
          )}
          {mode === "Users" && (
            <>
              <label>
                Search accounts
                <input
                  name="accountSearch"
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <p>
                Role and status changes revoke existing sessions. Your own
                access cannot be removed.
              </p>
              {data.users.map((u: any) => (
                <AccountRow
                  key={u.id}
                  user={u}
                  self={user.id === u.id}
                  reload={load}
                />
              ))}
              <Pager page={page} setPage={setPage} />
            </>
          )}
          {mode === "Audit log" && (
            <>
              <p>Latest records, 50 per page. Times shown in Malaysia time.</p>
              <label>
                Filter action, actor, event or record
                <input
                  name="auditSearch"
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              {!data.logs.length && <p>No audit records on this page.</p>}
              {data.logs.map((a: any) => (
                <article className="ops-record" key={a.id}>
                  <strong>{words(a.action)}</strong>
                  <p>
                    <time dateTime={a.createdAt}>{when(a.createdAt)}</time> ·{" "}
                    {a.actorRole}
                  </p>
                  <p>
                    Actor: {a.userId} · Target: {a.targetId}
                  </p>
                  <p>
                    {a.previousState || "—"} → {a.newState || "—"}
                  </p>
                  {a.reasonCode && <p>{a.reasonCode}</p>}
                </article>
              ))}
              <Pager page={page} setPage={setPage} />
            </>
          )}
          {mode === "Notifications" && (
            <>
              <p>
                {data.unread} unread. Showing the latest 100 updates. Times
                shown in Malaysia time.
              </p>
              {!data.notices.length && <p>No notifications yet.</p>}
              {data.notices
                .slice(noticePage * 10, (noticePage + 1) * 10)
                .map((n: any) => (
                  <article className="ops-record" key={n.id}>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    <p>
                      <time dateTime={n.createdAt}>{when(n.createdAt)}</time> ·{" "}
                      {n.read ? "Read" : "Unread"} · {words(n.deliveryStatus)}
                    </p>
                    <div className="setup-actions">
                      <Link
                        className="button secondary"
                        href={safeNoticeLink(n.link, admin, customer)}
                      >
                        Open update
                      </Link>
                      <button
                        className="button ghost"
                        disabled={busy}
                        onClick={() =>
                          action("notice", { id: n.id, read: !n.read })
                        }
                      >
                        Mark {n.read ? "unread" : "read"}
                      </button>
                    </div>
                  </article>
                ))}
            </>
          )}
          {mode === "Notifications" && data.notices.length > 10 && (
            <div className="setup-actions">
              <button
                className="button secondary"
                disabled={!noticePage}
                onClick={() => setNoticePage(noticePage - 1)}
              >
                Previous updates
              </button>
              <span>
                Updates {noticePage * 10 + 1}–
                {Math.min((noticePage + 1) * 10, data.notices.length)} of{" "}
                {data.notices.length}
              </span>
              <button
                className="button secondary"
                disabled={(noticePage + 1) * 10 >= data.notices.length}
                onClick={() => setNoticePage(noticePage + 1)}
              >
                Next updates
              </button>
            </div>
          )}
          {mode === "Settings" && (
            <Preferences
              value={data.preferences}
              busy={busy}
              save={(v: any) => action("preferences", v)}
            />
          )}
          {mode === "Platform settings" && (
            <>
              <h3>Release controls</h3>
              <p>Real sales: disabled. Local fictional operations only.</p>
              <p>
                Email delivery: not configured. In-app updates are stored
                transactionally; no external email is sent.
              </p>
              <p>
                MixerMates fee: 5% of paid ticket face value after discounts.
                Organizer chooses absorb or customer-paid; gateway fees remain organizer-borne.
                Commission collection is inactive.
              </p>
              <p>
                These release controls require owner decisions and cannot be
                changed here.
              </p>
            </>
          )}
          {mode === "Refunds" && (
            <>
              <p>
                Payments go directly to the organizer. MixerMates cannot
                transfer money. Approval cancels the booking and revokes active
                tickets. A transfer report needs an evidence reference; only the
                customer can confirm receipt.
              </p>
              {customer && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action("refund-request", {
                      bookingId: f.get("bookingId"),
                      reason: f.get("reason"),
                    });
                  }}
                >
                  <label>
                    Booking reference
                    <input name="bookingId" required maxLength={191} />
                  </label>
                  <label>
                    Reason
                    <textarea
                      name="reason"
                      required
                      minLength={5}
                      maxLength={191}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Request refund review
                  </button>
                </form>
              )}
              {!data.refunds.length && <p>No refund requests yet.</p>}
              {data.refunds.map((r: any) => (
                <RefundRow
                  key={r.id + ":" + r.version}
                  value={r}
                  customer={customer}
                  busy={busy}
                  action={action}
                  history={data.refundHistory.filter(
                    (h: any) => h.targetId === r.id,
                  )}
                />
              ))}
            </>
          )}
          {mode === "Support" && (
            <>
              <p>
                Private reports are visible to you and platform administrators.
                Do not include passwords, full bank details or identity
                documents. This service is not an emergency response channel.
              </p>
              {!admin && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action("support-request", {
                      category: f.get("category"),
                      description: f.get("description"),
                      ...(f.get("bookingId")
                        ? { bookingId: f.get("bookingId") }
                        : {}),
                    });
                  }}
                >
                  <label>
                    Category
                    <select name="category">
                      {[
                        "PAYMENT",
                        "TICKET",
                        "BOOKING",
                        "CANCELLATION",
                        "MISLEADING_EVENT",
                        "SUSPICIOUS_ORGANIZER",
                        "SAFETY",
                        "ACCOUNT",
                        "OTHER",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {words(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Booking reference (optional)
                    <input name="bookingId" maxLength={191} />
                  </label>
                  <label>
                    Describe the issue
                    <textarea
                      name="description"
                      required
                      minLength={10}
                      maxLength={2000}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Open support case
                  </button>
                </form>
              )}
              {!data.reports.length && <p>No support cases yet.</p>}
              {data.reports.map((r: any) => (
                <SupportRow
                  key={r.id + ":" + r.version}
                  value={r}
                  admin={admin}
                  busy={busy}
                  action={action}
                />
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
function safeNoticeLink(link: string, admin: boolean, customer: boolean) {
  if (!link?.startsWith("/") || link.startsWith("//"))
    return customer ? "/my-bookings" : admin ? "/admin" : "/organizer";
  return link;
}
function Pager({ page, setPage }: any) {
  return (
    <div className="setup-actions">
      <button
        className="button secondary"
        disabled={!page}
        onClick={() => setPage(page - 1)}
      >
        Previous page
      </button>
      <span>Page {page + 1}</span>
      <button className="button secondary" onClick={() => setPage(page + 1)}>
        Next page
      </button>
    </div>
  );
}
function Preferences({ value, busy, save }: any) {
  const [v, set] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(v);
      }}
    >
      <h3>Notification preferences</h3>
      <p>
        Booking, refund and security updates remain available regardless of
        optional preferences.
      </p>
      {Object.entries({
        eventReminders: "Event reminders",
        promotionalNotifications: "Promotional messages",
        socialNotifications: "Social updates",
        organizerAnnouncements: "Organizer announcements",
      }).map(([k, label]) => (
        <label className="setup-check" key={k}>
          <input
            name={k}
            type="checkbox"
            checked={v[k]}
            onChange={(e) => set({ ...v, [k]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <button className="button primary" disabled={busy}>
        Save preferences
      </button>
      <p>Email sending and scheduled reminders are not configured.</p>
    </form>
  );
}
function AccountRow({ user: u, self, reload }: any) {
  const [role, setRole] = useState(u.role),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(body: any) {
    if (
      !window.confirm(
        `Change account access for ${u.username}? Existing sessions will be revoked.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api("security/account", { userId: u.id, ...body });
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="ops-record">
      <h3>{u.name}</h3>
      <p>
        @{u.username} · {u.email}
      </p>
      <p>
        {u.active ? "Active" : "Suspended"} · Organizer verification:{" "}
        {words(u.verification)}
      </p>
      <div className="setup-actions">
        <label>
          Account role
          <select
            name="role"
            value={role}
            disabled={busy || self}
            onChange={(e) => setRole(e.target.value)}
          >
            {["ATTENDEE", "ORGANIZER", "STAFF", "ADMIN"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={busy || self || role === u.role}
          onClick={() => change({ role })}
        >
          Save role
        </button>
        <button
          className="button secondary"
          disabled={busy || self}
          onClick={() => change({ active: !u.active })}
        >
          {u.active ? "Suspend account" : "Reactivate account"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
function RefundRow({ value: r, customer, busy, action, history }: any) {
  if (r.payment.provider === "LOCAL_TEST_SIMULATOR")
    return (
      <article className="ops-record">
        <h3>{r.payment.booking.event.title}</h3>
        <p>
          {currency(r.amount)} · {words(r.status)} · TEST only
        </p>
        <p>
          No real bank transfer. Open the booking to choose a simulated refund
          outcome.
        </p>
        <Link
          className="button secondary"
          href={"/bookings/" + r.payment.booking.id}
        >
          Open test refund
        </Link>
      </article>
    );
  const next: Record<string, string[]> = {
    REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
    UNDER_REVIEW: ["APPROVED", "REJECTED"],
    APPROVED: ["AWAITING_ORGANIZER_TRANSFER"],
    AWAITING_ORGANIZER_TRANSFER: ["TRANSFER_REPORTED"],
    TRANSFER_REPORTED: customer ? ["REFUND_CONFIRMED"] : [],
  };
  const choices = customer
    ? r.status === "TRANSFER_REPORTED"
      ? ["REFUND_CONFIRMED"]
      : []
    : next[r.status] || [];
  return (
    <article className="ops-record">
      <h3>{r.payment.booking.event.title}</h3>
      <p>
        {r.payment.booking.id} · {currency(r.amount)} · {words(r.status)}
      </p>
      <p>{r.reason}</p>
      {r.decisionNotes && <p>Review: {r.decisionNotes}</p>}
      {r.transferReference && (
        <p>Transfer evidence reference: {r.transferReference}</p>
      )}
      {!!choices.length && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              f.get("status") === "APPROVED" &&
              !window.confirm(
                "Approve refund review and cancel this booking? Active tickets will be revoked. No money will be transferred.",
              )
            )
              return;
            action("refund-review", {
              id: r.id,
              version: r.version,
              status: f.get("status"),
              notes: f.get("notes"),
              ...(f.get("transferReference")
                ? { transferReference: f.get("transferReference") }
                : {}),
              ...(customer ? { received: true } : {}),
            });
          }}
        >
          <label>
            Next status
            <select name="status">
              {choices.map((s: string) => (
                <option key={s} value={s}>
                  {words(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Decision notes
            <textarea name="notes" required minLength={5} maxLength={191} />
          </label>
          {r.status === "AWAITING_ORGANIZER_TRANSFER" && (
            <label>
              Transfer evidence reference
              <input
                name="transferReference"
                required
                minLength={10}
                maxLength={191}
              />
            </label>
          )}
          {customer && (
            <label className="setup-check">
              <input type="checkbox" required name="received" />I independently
              checked that the refund reached my account.
            </label>
          )}
          <button className="button primary" disabled={busy}>
            {customer ? "Confirm refund received" : "Update refund request"}
          </button>
        </form>
      )}
      <details>
        <summary>Status history</summary>
        {history.map((h: any) => (
          <p key={h.id}>
            {when(h.createdAt)} · {words(h.newState || h.action)} ·{" "}
            {h.actorRole}
            {h.reasonCode ? ` · ${h.reasonCode}` : ""}
          </p>
        ))}
      </details>
    </article>
  );
}
function SupportRow({ value: r, admin, busy, action }: any) {
  return (
    <article className="ops-record">
      <h3>
        {words(r.category)} · {words(r.status)}
      </h3>
      <p>
        Case {r.id} · {when(r.createdAt)}
      </p>
      <p>{r.reason}</p>
      {r.bookingId && <p>Booking: {r.bookingId}</p>}
      {r.response && <p>Admin response: {r.response}</p>}
      {admin && ["OPEN", "UNDER_REVIEW"].includes(r.status) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            action("support-review", {
              id: r.id,
              version: r.version,
              status: f.get("status"),
              response: f.get("response"),
            });
          }}
        >
          <label>
            Case status
            <select name="status">
              {["UNDER_REVIEW", "RESOLVED", "DISMISSED"].map((s) => (
                <option key={s} value={s}>
                  {words(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Response to customer
            <textarea name="response" required minLength={5} maxLength={191} />
          </label>
          <button className="button primary" disabled={busy}>
            Save support response
          </button>
        </form>
      )}
    </article>
  );
}
