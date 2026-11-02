"use client";
import { EventOperations, OperationalJobs } from "./event-operations";
import { Operations } from "./operations";
import { BookingReviews } from "./booking-reviews";
import { SetupReview } from "./setup-review";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Ticket,
  Users,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  api,
  currency,
  date,
  time,
  Loading,
  Empty,
  Status,
  PageHeading,
  Metric,
} from "./shared";

function Admin({ user, notify }: any) {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("Overview");
  const params = useSearchParams();
  useEffect(() => {
    setTab(params.get("tab") || "Overview");
  }, [params]);
  const load = useCallback(
    () =>
      api("admin")
        .then(setData)
        .catch((e: any) => notify(e.message)),
    [notify],
  );
  useEffect(() => {
    if (user.role === "ADMIN") load();
    const current = new URLSearchParams(location.search).get("tab");
    if (current) setTab(current);
  }, [load, user.role]);
  async function action(kind: string, id: string, approve: boolean) {
    try {
      await api("admin-action", { kind, id, approve });
      notify("Review saved to the audit log.");
      load();
    } catch (x: any) {
      notify(x.message);
    }
  }
  if (user.role !== "ADMIN")
    return (
      <div className="page-width standard-page">
        <Empty
          icon={ShieldCheck}
          title="This space is for platform admins."
          text="Your account does not have permission to view administrative records."
        />
      </div>
    );
  return (
    <div className="page-width standard-page">
      <PageHeading
        eyebrow=""
        title="Behind the good nights."
        description="Review, protect, and keep the platform running. Every change leaves a record."
      />
      <div className="page-tabs wrap">
        {[
          ["Overview", "Overview"],
          ["Events", "Events"],
          ["Users", "Accounts"],
          ["Payments", "Payments & sales"],
          ["Platform settings", "More / settings"],
        ].map(([target, label]) => (
          <button
            className={tab === target ? "active" : ""}
            aria-current={tab === target ? "page" : undefined}
            onClick={() => {
              setTab(target);
              window.history.replaceState(
                null,
                "",
                `/admin?tab=${encodeURIComponent(target)}`,
              );
            }}
            key={target}
          >
            {label}
          </button>
        ))}
      </div>
      {[
        "Platform settings",
        "Event operations",
        "Operations",
        "Booking reviews",
        "Verifications",
        "Promotions",
        "Reports",
        "Bookings",
        "Refunds",
        "Support",
        "Notifications",
        "Audit log",
      ].includes(tab) && (
        <details className="studio-advanced" open={tab === "Platform settings"}>
          <summary>Administration tools</summary>
          <div className="studio-advanced-links">
            {[
              "Event operations",
              "Operations",
              "Booking reviews",
              "Verifications",
              "Promotions",
              "Reports",
              "Bookings",
              "Refunds",
              "Support",
              "Notifications",
              "Audit log",
              "Platform settings",
            ].map((t) => (
              <Link
                key={t}
                href={`/admin?tab=${encodeURIComponent(t)}`}
                onClick={() => setTab(t)}
              >
                {t}
              </Link>
            ))}
          </div>
        </details>
      )}
      {!data ? (
        <Loading />
      ) : tab === "Event operations" ? (
        <EventOperations user={user} />
      ) : tab === "Operations" ? (
        <OperationalJobs />
      ) : [
          "Overview",
          "Users",
          "Bookings",
          "Refunds",
          "Support",
          "Reports",
          "Notifications",
          "Audit log",
          "Payments",
          "Platform settings",
        ].includes(tab) ? (
        <Operations
          key={tab}
          mode={tab === "Reports" ? "Support" : tab}
          user={user}
        />
      ) : tab === "Booking reviews" ? (
        <BookingReviews />
      ) : tab === "Events" ? (
        <>
          <section className="setup-panel">
            <h2>All events</h2>
            <p>
              {data.events.length} events · publication and operational status
            </p>
            <div className="admin-event-list">
              {data.events.map((event: any) => (
                <article key={event.id} data-event-id={event.id}>
                  <div>
                    <h3>{event.title}</h3>
                    <Status value={event.status} />
                  </div>
                  <Link
                    className="button secondary"
                    href={`/admin?tab=Event%20operations&event=${event.id}`}
                  >
                    Event operations
                  </Link>
                </article>
              ))}
            </div>
          </section>
          <SetupReview notify={notify} eventsOnly onChange={load} />
        </>
      ) : ["Event setup", "Verifications"].includes(tab) ? (
        <SetupReview notify={notify} />
      ) : tab === "Overview" ? (
        <>
          <div className="metric-grid">
            <Metric
              label="Total users"
              value={String(data.users.length)}
              icon={Users}
            />
            <Metric
              label="Events"
              value={String(data.events.length)}
              icon={CalendarDays}
            />
            <Metric
              label="Bookings"
              value={String(data.bookings.length)}
              icon={Ticket}
            />
            <Metric
              label="Demo gross sales"
              value={currency(
                data.payments
                  .filter((p: any) => p.status === "SUCCEEDED")
                  .reduce((s: number, p: any) => s + p.amount, 0),
              )}
              icon={Sparkles}
            />
          </div>
          <div className="panel">
            <h3>The review queue</h3>
            {[
              [
                "Organizer verifications",
                data.verifications.filter(
                  (x: any) => x.status === "PENDING_REVIEW",
                ).length,
                "Verifications",
              ],
              [
                "Promotion requests",
                data.promotions.filter((x: any) => x.status === "PENDING")
                  .length,
                "Promotions",
              ],
              [
                "Open reports",
                data.reports.filter((x: any) => x.status === "OPEN").length,
                "Reports",
              ],
              [
                "Demo payouts",
                data.payouts.filter((x: any) => x.status === "PENDING").length,
                "Bookings",
                "Refunds",
                "Support",
                "Notifications",
                "Platform settings",
              ],
            ].map(([title, count, target]) => (
              <button
                className="admin-queue"
                key={title}
                onClick={() => setTab(String(target))}
              >
                <strong>{title}</strong>
                <span>
                  {count}
                  <ChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="panel table-scroll">
          {tab === "Users" ? (
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      <small>@{u.username}</small>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <Status value={u.verification} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "Events" ? (
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e: any) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/events/${e.slug}`}>{e.title}</Link>
                    </td>
                    <td>{e.city}</td>
                    <td>
                      <Status value={e.status} />
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          action("event", e.id, e.status === "SUSPENDED")
                        }
                      >
                        {e.status === "SUSPENDED" ? "Restore" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "Payments" ? (
            <table>
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.id.slice(-8)}</td>
                    <td>{p.provider}</td>
                    <td>{currency(p.amount)}</td>
                    <td>{currency(p.fee)}</td>
                    <td>
                      <Status value={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "Audit log" ? (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((a: any) => (
                  <tr key={a.id}>
                    <td>
                      {date(a.createdAt)} {time(a.createdAt)}
                    </td>
                    <td>{a.userId}</td>
                    <td>{a.action}</td>
                    <td>{a.targetId.slice(-10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="admin-reviews">
              {(tab === "Verifications"
                ? data.verifications
                : tab === "Promotions"
                  ? data.promotions
                  : tab === "Reports"
                    ? data.reports
                    : data.payouts
              ).map((x: any) => (
                <div className="admin-review" key={x.id}>
                  <div>
                    <span className="eyebrow">{tab}</span>
                    <h3>
                      {x.user?.name ||
                        x.event?.title ||
                        x.reason ||
                        `Demo payout ${x.id.slice(-6)}`}
                    </h3>
                    <p>
                      {x.note || x.package || x.targetId || currency(x.amount)}
                    </p>
                    {x.amount && (
                      <strong>{currency(x.amount)} · simulated</strong>
                    )}
                  </div>
                  <Status value={x.status} />
                  {["PENDING", "PENDING_REVIEW", "OPEN"].includes(x.status) && (
                    <div className="row">
                      <button
                        className="button primary"
                        onClick={() =>
                          action(
                            tab === "Verifications"
                              ? "verification"
                              : tab === "Promotions"
                                ? "promotion"
                                : tab === "Reports"
                                  ? "report"
                                  : "payout",
                            x.id,
                            true,
                          )
                        }
                      >
                        {tab === "Reports" ? "Resolve" : "Approve"}
                        <Check size={15} />
                      </button>
                      {tab !== "Reports" && (
                        <button
                          className="button ghost danger"
                          onClick={() =>
                            action(
                              tab === "Verifications"
                                ? "verification"
                                : tab === "Promotions"
                                  ? "promotion"
                                  : "payout",
                              x.id,
                              false,
                            )
                          }
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!(
                tab === "Verifications"
                  ? data.verifications
                  : tab === "Promotions"
                    ? data.promotions
                    : tab === "Reports"
                      ? data.reports
                      : data.payouts
              ).length && (
                <Empty
                  icon={ShieldCheck}
                  title="All clear for now."
                  text="New review items will appear here."
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { Admin };
