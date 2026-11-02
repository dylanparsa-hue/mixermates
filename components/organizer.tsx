"use client";
import { EventOperations } from "./event-operations";
import { Operations } from "./operations";
import { Entrance } from "./entrance";
import { BookingReviews } from "./booking-reviews";
import { EventStudioSummary } from "./event-studio-summary";
import { OrganizerIdentitySettings } from "./organizer-identity-settings";
import { SetupPanel } from "./event-setup-panel";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Plus,
  Ticket,
  Users,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Check,
  LayoutDashboard,
  ScanLine,
  Download,
  Settings,
  CheckCircle2,
  CircleAlert,
  Camera,
  ExternalLink,
  LoaderCircle,
  Eye,
} from "lucide-react";
import {
  api,
  currency,
  date,
  nav,
  Loading,
  Empty,
  Status,
  Avatar,
  PageHeading,
  Metric,
} from "./shared";

function Organizer({ user, notify }: any) {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("My events"),
    [eventId, setEventId] = useState(""),
    [busy, setBusy] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    setTab(params.get("tab") || "My events");
    if (params.get("event")) setEventId(params.get("event")!);
  }, [params]);
  const load = useCallback(
    () =>
      api("organizer")
        .then((d) => {
          setData(d);
          setEventId(
            (id: string) =>
              id ||
              new URLSearchParams(location.search).get("event") ||
              d.events[0]?.id ||
              "",
          );
        })
        .catch((e: any) => notify(e.message)),
    [notify],
  );
  useEffect(() => {
    load();
    const current = new URLSearchParams(location.search).get("tab");
    if (current) setTab(current);
  }, [load, user.id]);
  const e = data?.events.find((e: any) => e.id === eventId);
  const all = data?.events.flatMap((e: any) => e.bookings) || [];
  const paid = all.filter((b: any) => b.payment?.status === "SUCCEEDED");
  const gross = paid.reduce((s: number, b: any) => s + b.total, 0),
    fees = paid.reduce((s: number, b: any) => s + b.payment.fee, 0),
    checked = all.reduce(
      (s: number, b: any) =>
        s + b.tickets.filter((t: any) => t.status === "CHECKED_IN").length,
      0,
    ),
    sold = all
      .filter((b: any) => ["APPROVED", "PENDING_REVIEW"].includes(b.status))
      .reduce((s: number, b: any) => s + b.quantity, 0);
  const owner = e?.organizerId === user.id;
  async function review(id: string, approve: boolean) {
    setBusy(true);
    try {
      await api("review", { bookingId: id, approve });
      notify(
        approve
          ? "Invitation approved. Secure ticket issued."
          : "Registration declined. Demo payment refunded.",
      );
      await load();
    } catch (x: any) {
      notify(x.message);
    } finally {
      setBusy(false);
    }
  }
  function exportGuests() {
    const link = document.createElement("a");
    link.href = `/api/entrance-export/${eventId}`;
    link.download = "";
    link.click();
    notify(
      "Private guest list requested. Store securely and delete after your retention period.",
    );
  }
  const canOrganize =
    ["ORGANIZER", "ADMIN", "STAFF"].includes(user.role) ||
    user.capabilities?.includes("ORGANIZER");
  if(!canOrganize) return <section className="page-width standard-page"><h1>Your organizer workspace</h1><p>Create events with the account you already use.</p><Link className="button primary" href="/create">Create an Event</Link></section>;
  return (
    <div
      className={`page-width standard-page ${["Entrance", "Check-in", "Guest list"].includes(tab) ? "entrance-studio" : ""}`}
    >
      <PageHeading
        eyebrow=""
        title="Organizer studio."
        description={`Welcome back, ${user.name}. Let’s make the next night a good one.`}
      >
        {user.role !== "STAFF" && (
          <Link className="button primary" href="/create">
            <Plus size={17} />
            Create event
          </Link>
        )}
      </PageHeading>
      <div className="dashboard-layout">
        <aside className="studio-nav">
          {[
            ["My events", "My events", CalendarDays],
            ["Booking reviews", "Payments", Ticket],
            ["Entrance", "Scanner", ScanLine],
            ["Settings", "Settings", Settings],
          ]
            .filter(
              ([target]) =>
                user.role !== "STAFF" ||
                ["Booking reviews", "Entrance"].includes(String(target)),
            )
            .map(([target, label, Icon]: any) => (
              <button
                key={target}
                className={tab === target ? "active" : ""}
                aria-current={tab === target ? "page" : undefined}
                onClick={() => {
                  setTab(target);
                  window.history.replaceState(
                    null,
                    "",
                    `/organizer?tab=${encodeURIComponent(target)}`,
                  );
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
        </aside>
        <div className="studio-content">
          {params.get("event") && e && <nav className="event-context-tabs" aria-label="Event tools">
            {[["Overview","Overview"],["Tickets","Tickets"],["Guest list","Guests"],["Booking reviews","Payment Review"],["Entrance","Attendance"],["Analytics","Basic Analytics"],["Event operations","Event Operations"],["Staff","Staff"]].map(([target,label])=><Link key={target} aria-current={tab===target?"page":undefined} href={`/organizer?tab=${encodeURIComponent(target)}&event=${e.id}`}>{label}</Link>)}
            {owner && <Link href={`/create?edit=${e.id}`}>Edit</Link>}
          </nav>}

          {[
            "Event operations",
            "Payment methods",
            "Staff",
            "Refunds",
            "Support",
            "Notifications",
            "Settings",
            "Analytics",
            "Earnings",
            "Promotions",
          ].includes(tab) && (
            <details className="studio-advanced">
              <summary>More tools & settings</summary>
              <div className="studio-advanced-links">
                {[
                  "Event operations",
                  "Payment methods",
                  "Staff",
                  "Refunds",
                  "Support",
                  "Notifications",
                  "Analytics",
                  "Promotions",
                  "Settings",
                ].map((t) => (
                  <Link
                    key={t}
                    href={`/organizer?tab=${encodeURIComponent(t)}`}
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
          ) : params.get("event") && ["Overview","Tickets","Analytics"].includes(tab) ? (
            <EventStudioSummary key={eventId+tab} eventId={eventId} mode={tab} />
          ) : tab === "Settings" ? (
            <OrganizerIdentitySettings />
          ) : tab === "Event operations" ? (
            <EventOperations user={user} />
          ) : [
              "Overview",
              "Analytics",
              "Payments",
              "Earnings",
              "Refunds",
              "Support",
              "Notifications",
              "Settings",
            ].includes(tab) && user.role !== "STAFF" ? (
            <Operations key={tab} mode={tab} user={user} />
          ) : ["Booking reviews", "Registrations"].includes(tab) ? (
            <BookingReviews />
          ) : user.role !== "STAFF" &&
            ["Overview", "My events", "Payment methods", "Staff"].includes(
              tab,
            ) ? (
            <SetupPanel key={tab} mode={tab} user={user} notify={notify} />
          ) : !data.events.length ? (
            <Empty
              icon={CalendarDays}
              title="Every great night starts with an idea."
              text="Create your first event, choose a vibe, and bring your people together."
            >
              <Link href="/create" className="button primary">
                Create an event
                <Plus size={16} />
              </Link>
            </Empty>
          ) : (
            <>
              {[
                "Registrations",
                "Guest list",
                "Entrance",
                "Analytics",
                "Promotions",
              ].includes(tab) && (
                <label className="event-selector">
                  Selected event
                  <select
                    value={eventId}
                    onChange={(ev) => setEventId(ev.target.value)}
                  >
                    {data.events.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {tab === "Overview" ? (
                <>
                  <div className="metric-grid">
                    <Metric
                      label="Your events"
                      value={data.events.length.toString()}
                      icon={CalendarDays}
                    />
                    <Metric
                      label="Tickets reserved"
                      value={sold.toString()}
                      icon={Ticket}
                    />
                    <Metric
                      label="Verified check-ins"
                      value={checked.toString()}
                      icon={ScanLine}
                    />
                    <Metric
                      label="Demo gross sales"
                      value={currency(gross)}
                      icon={Sparkles}
                    />
                  </div>
                  <div className="panel">
                    <div className="row between">
                      <h3>Your upcoming nights</h3>
                      <button
                        className="text-button"
                        onClick={() => setTab("My events")}
                      >
                        Manage events
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    {data.events.slice(0, 4).map((e: any) => (
                      <div className="studio-event-row" key={e.id}>
                        <img src={e.image} alt="" />
                        <div>
                          <h4>{e.title}</h4>
                          <small>
                            {date(e.startsAt)} · {e.city}
                          </small>
                        </div>
                        <Status value={e.status} />
                        <button
                          className="icon-button"
                          aria-label={`Manage ${e.title}`}
                          onClick={() => {
                            setEventId(e.id);
                            setTab("Registrations");
                          }}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="studio-tip">
                    <Sparkles size={26} />
                    <div>
                      <h3>Small details. Unforgettable nights.</h3>
                      <p>
                        Review your guest requests, check your door list, and
                        let the good times happen.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => setTab("Entrance")}
                    >
                      Open check-in
                      <ScanLine size={16} />
                    </button>
                  </div>
                </>
              ) : tab === "My events" ? (
                <div className="panel">
                  <h3>Every night, in one place.</h3>
                  {data.events.map((e: any) => (
                    <div className="manage-event" key={e.id}>
                      <img src={e.image} alt="" />
                      <div>
                        <span className="eyebrow">
                          {date(e.startsAt)} · {e.city}
                        </span>
                        <h3>{e.title}</h3>
                        <Status
                          value={e.salesPaused ? "SALES_PAUSED" : e.status}
                        />
                        <p>
                          {e.bookings.length} registrations ·{" "}
                          {e.tiers.reduce((s: number, t: any) => s + t.sold, 0)}{" "}
                          tickets reserved
                        </p>
                        <div className="row wrap">
                          <Link
                            href={`/events/${e.slug}`}
                            className="button secondary"
                          >
                            View event
                            <ExternalLink size={14} />
                          </Link>
                          {e.organizerId === user.id && (
                            <>
                              <button
                                className="button ghost"
                                onClick={() =>
                                  router.push(`/create?edit=${e.id}`)
                                }
                              >
                                Edit event
                              </button>
                              <button
                                className="button ghost"
                                onClick={async () => {
                                  try {
                                    await api("pause", { eventId: e.id });
                                    load();
                                    notify(
                                      e.salesPaused
                                        ? "Ticket sales resumed."
                                        : "Ticket sales paused.",
                                    );
                                  } catch (x: any) {
                                    notify(x.message);
                                  }
                                }}
                              >
                                {e.salesPaused ? "Resume sales" : "Pause sales"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tab === "Registrations" ? (
                <div className="panel">
                  <div className="row between">
                    <div>
                      <h3>A good night starts with a yes.</h3>
                      <p className="muted">
                        Private registration details. For authorized organizers
                        only.
                      </p>
                    </div>
                    {owner && (
                      <button
                        className="button secondary"
                        onClick={exportGuests}
                      >
                        <Download size={15} />
                        Export CSV
                      </button>
                    )}
                  </div>
                  {!e?.bookings.length ? (
                    <Empty
                      icon={Users}
                      title="The guest list is taking shape."
                      text="New registrations will appear here as people discover your night."
                    />
                  ) : (
                    <div className="registration-list">
                      {e.bookings.map((b: any) => (
                        <div className="registration-row" key={b.id}>
                          <div className="row">
                            <Avatar name={b.user.name} />
                            <div>
                              <strong>{b.user.name}</strong>
                              <small>{b.user.email}</small>
                            </div>
                            <Status value={b.status} />
                          </div>
                          <div className="registration-meta">
                            <span>
                              {b.tier.name} × {b.quantity}
                            </span>
                            <span>
                              {currency(b.total)} ·{" "}
                              {b.paymentStatus.toLowerCase()}
                            </span>
                            <small>{date(b.createdAt)}</small>
                          </div>
                          <details>
                            <summary>View private registration answers</summary>
                            <dl>
                              {Object.entries(JSON.parse(b.answers)).map(
                                ([k, v]) => (
                                  <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{String(v)}</dd>
                                  </div>
                                ),
                              )}
                            </dl>
                            {b.receiptPath && (
                              <a
                                className="text-button"
                                href={`/api/receipt/${b.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Review sample receipt
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </details>
                          {b.status === "APPROVED" &&
                            owner &&
                            !b.tickets.some(
                              (t: any) => t.status === "CHECKED_IN",
                            ) && (
                              <button
                                className="text-button danger mt"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      "Cancel this registration and refund the simulated payment?",
                                    )
                                  )
                                    try {
                                      await api("refund", {
                                        bookingId: b.id,
                                      });
                                      notify(
                                        "Registration cancelled. Demo payment refunded.",
                                      );
                                      load();
                                    } catch (x: any) {
                                      notify(x.message);
                                    }
                                }}
                              >
                                Cancel & refund demo booking
                              </button>
                            )}
                          {b.status === "PENDING_REVIEW" && owner && (
                            <div className="row mt">
                              <button
                                className="button primary"
                                disabled={busy}
                                onClick={() => review(b.id, true)}
                              >
                                <Check size={16} />
                                Approve & issue ticket
                              </button>
                              <button
                                className="button ghost danger"
                                disabled={busy}
                                onClick={() => review(b.id, false)}
                              >
                                Decline & refund demo payment
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : ["Check-in", "Entrance", "Guest list"].includes(tab) ? (
                <Entrance key={eventId} eventId={eventId} />
              ) : tab === "Analytics" ? (
                <>
                  <div className="metric-grid">
                    <Metric
                      label="Recorded page views"
                      value={String(
                        e?.activity.filter((a: any) => a.kind === "VIEW")
                          .length || 0,
                      )}
                      icon={Eye}
                    />
                    <Metric
                      label="Reservations"
                      value={String(e?.bookings.length || 0)}
                      icon={Ticket}
                    />
                    <Metric
                      label="Verified attendance"
                      value={String(
                        e?.bookings
                          .flatMap((b: any) => b.tickets)
                          .filter((t: any) => t.status === "CHECKED_IN")
                          .length || 0,
                      )}
                      icon={CheckCircle2}
                    />
                    <Metric
                      label="Promotion clicks"
                      value={String(
                        e?.activity.filter(
                          (a: any) => a.kind === "PROMOTION_CLICK",
                        ).length || 0,
                      )}
                      icon={ArrowUpRight}
                    />
                  </div>
                  <div className="panel">
                    <h3>Ticket-tier performance</h3>
                    <p className="muted">
                      Counts come from stored reservations, including pending
                      review.
                    </p>
                    {e?.tiers.map((t: any) => (
                      <div className="tier-performance" key={t.id}>
                        <div className="row between">
                          <strong>{t.name}</strong>
                          <span>
                            {t.sold} / {t.quantity}
                          </span>
                        </div>
                        <div className="bar">
                          <i
                            style={{ width: `${(t.sold / t.quantity) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : tab === "Earnings" ? (
                <>
                  <div className="alert">
                    <ShieldCheck size={18} />
                    <span>
                      All balances are simulated. No bank accounts, payouts, or
                      real funds are connected.
                    </span>
                  </div>
                  <div className="metric-grid">
                    <Metric
                      label="Demo gross sales"
                      value={currency(gross)}
                      icon={Ticket}
                    />
                    <Metric
                      label="Platform fees"
                      value={currency(fees)}
                      icon={SlidersHorizontal}
                    />
                    <Metric
                      label="Demo net proceeds"
                      value={currency(gross - fees)}
                      icon={Sparkles}
                    />
                    <Metric
                      label="Demo refunds"
                      value={currency(
                        all
                          .filter((b: any) => b.paymentStatus === "REFUNDED")
                          .reduce((s: number, b: any) => s + b.total, 0),
                      )}
                      icon={ArrowLeft}
                    />
                  </div>
                  <div className="panel">
                    <div className="row between">
                      <h3>Demo settlement</h3>
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            await api("payout", {});
                            notify(
                              "Simulated payout submitted for administrator review.",
                            );
                            load();
                          } catch (x: any) {
                            notify(x.message);
                          }
                        }}
                      >
                        Simulate settlement
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <p className="muted">
                      Approved demo revenue can be marked for simulated
                      settlement. No banking information is collected.
                    </p>
                    {data.payouts?.map((p: any) => (
                      <div className="promotion-status row between" key={p.id}>
                        <strong>
                          {currency(p.amount)} · {date(p.createdAt)}
                        </strong>
                        <Status value={p.status} />
                      </div>
                    ))}
                  </div>
                  <div className="panel">
                    <h3>Recorded transactions</h3>
                    {all.length ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Booking</th>
                              <th>Guest</th>
                              <th>Gross</th>
                              <th>Fee</th>
                              <th>State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {all.map((b: any) => (
                              <tr key={b.id}>
                                <td>{b.id.slice(-8)}</td>
                                <td>{b.user.name}</td>
                                <td>{currency(b.total)}</td>
                                <td>{currency(b.payment?.fee || 0)}</td>
                                <td>
                                  <Status value={b.paymentStatus} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="muted">
                        Your first demo transaction will appear here.
                      </p>
                    )}
                  </div>
                </>
              ) : tab === "Promotions" ? (
                <div className="panel">
                  <span className="eyebrow">
                    GIVE YOUR NIGHT A LITTLE SPOTLIGHT
                  </span>
                  <h2>More eyes. More good nights.</h2>
                  <p className="muted">
                    Choose a demo placement. Admin approval is required before
                    it goes live.
                  </p>
                  <div className="promotion-grid">
                    {[
                      ["Homepage Spotlight", 9900],
                      ["City Spotlight", 4900],
                      ["Category Spotlight", 2900],
                    ].map(([name, amount]) => (
                      <div key={name}>
                        <Sparkles size={24} />
                        <h3>{name}</h3>
                        <strong>
                          {currency(Number(amount))}
                          <small> / demo placement</small>
                        </strong>
                        <p>
                          Clearly labeled promotion. No guaranteed impressions
                          or unsolicited notifications.
                        </p>
                        <button
                          className="button primary full"
                          onClick={async () => {
                            try {
                              await api("promotion", {
                                eventId,
                                package: name,
                              });
                              notify(
                                "Simulated payment complete. Promotion submitted for admin review.",
                              );
                              load();
                            } catch (x: any) {
                              notify(x.message);
                            }
                          }}
                        >
                          Purchase in demo
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {e?.promotions.map((p: any) => (
                    <div className="row between promotion-status" key={p.id}>
                      <strong>{p.package}</strong>
                      <Status value={p.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel">
                  <h2>Ready for a bigger stage?</h2>
                  <div className="row mt">
                    <ShieldCheck size={26} />
                    <div>
                      <strong>Organizer verification</strong>
                      <p className="muted">
                        Paid demo events require approval. Never upload identity
                        documents into this demo.
                      </p>
                    </div>
                    <Status value={data.verification} />
                  </div>
                  {data.verification !== "VERIFIED" && (
                    <form
                      className="form"
                      onSubmit={async (ev) => {
                        ev.preventDefault();
                        const fd = new FormData(ev.currentTarget);
                        try {
                          await api("verification", { note: fd.get("note") });
                          notify("Verification request sent for admin review.");
                          load();
                        } catch (x: any) {
                          notify(x.message);
                        }
                      }}
                    >
                      <label>
                        Tell us about your events
                        <textarea
                          name="note"
                          minLength={10}
                          maxLength={1000}
                          required
                          placeholder="Your collective, your experience, and the events you plan to host."
                        />
                      </label>
                      <button className="button primary">
                        Request demo verification
                        <ArrowUpRight size={16} />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { Organizer };
