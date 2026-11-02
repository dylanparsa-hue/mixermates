"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ScanLine,
  RefreshCw,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { GuestManagement } from "./guest-management";
import { api, date, time, Loading } from "./shared";

export function Entrance({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All tickets"),
    [tier, setTier] = useState("All tiers"),
    [pageIndex, setPageIndex] = useState(0),
    [sort, setSort] = useState("NEWEST"),
    [preview, setPreview] = useState<any>(null),
    [result, setResult] = useState<any>(null),
    [identity, setIdentity] = useState(false),
    [busy, setBusy] = useState(false),
    [cameraState, setCameraState] = useState("stopped"),
    [cameraError, setCameraError] = useState(""),
    [devices, setDevices] = useState<any[]>([]),
    [device, setDevice] = useState(""),
    [torch, setTorch] = useState(false),
    [hasTorch, setHasTorch] = useState(false),
    [online, setOnline] = useState(true);
  const scanner = useRef<any>(null),
    locked = useRef(false),
    alive = useRef(true),
    generation = useRef(0),
    cameraPending = useRef<Promise<void> | null>(null);
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        search,
        tier: tier === "All tiers" ? "" : tier,
        arrival:
          filter === "Checked in"
            ? "CHECKED_IN"
            : filter === "Not arrived"
              ? "NOT_ARRIVED"
              : "ALL",
        sort,
      });
      const d = await api(`entrance/${eventId}?${params}`);
      if (alive.current) {
        setData(d);
        setError("");
      }
    } catch (e: any) {
      if (alive.current) {
        setError(e.message);
        setData(null);
      }
    }
  }, [eventId, pageIndex, search, tier, filter, sort]);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);
  const stop = useCallback(async () => {
    generation.current++;
    const s = scanner.current;
    scanner.current = null;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {}
    }
    if (alive.current) {
      setCameraState("stopped");
      setTorch(false);
      setHasTorch(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void loadRef.current();
    setPreview(null);
    setResult(null);
    setIdentity(false);
    setCode("");
    const visibility = () => {
      if (document.hidden) void stop();
      else void loadRef.current();
    };
    const connection = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        void stop();
        setPreview(null);
      } else void loadRef.current();
    };
    setOnline(navigator.onLine);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const interval = setInterval(() => {
      if (!document.hidden && !locked.current) void loadRef.current();
    }, 30000);
    return () => {
      alive.current = false;
      void stop();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [eventId, stop]);
  async function validate(value: { token?: string; ticketId?: string }) {
    if (locked.current || !navigator.onLine) return;
    locked.current = true;
    setBusy(true);
    setPreview(null);
    setResult(null);
    setIdentity(false);
    await stop();
    try {
      const p = await api("entrance/preview", {
        eventId,
        ...value,
        method: value.ticketId ? "MANUAL" : "QR",
      });
      if (alive.current) setPreview({ ...p, ...value });
    } catch (e: any) {
      if (alive.current) setResult({ error: e.message });
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
      void load();
    }
  }
  async function admit() {
    if (locked.current || !preview || !navigator.onLine) return;
    locked.current = true;
    setBusy(true);
    try {
      const r = await api("entrance/admit", {
        eventId,
        ...(preview.ticketId
          ? { ticketId: preview.ticketId }
          : { token: preview.token }),
        identityConfirmed: identity,
        method: preview.ticketId ? "MANUAL" : "QR",
      });
      if (alive.current) {
        setResult(r);
        setPreview(null);
        setCode("");
      }
    } catch (e: any) {
      if (alive.current) {
        setResult({
          error:
            e.message +
            " If the connection failed, refresh the guest list before retrying; admission may already have committed.",
        });
        setPreview(null);
      }
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
      void load();
    }
  }
  async function start() {
    if (cameraPending.current || locked.current) return;
    const job = (async () => {
      await stop();
      const gen = generation.current;
      setCameraError("");
      setCameraState("starting");
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw Error("UNSUPPORTED");
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!alive.current || generation.current !== gen) return;
        const s = new Html5Qrcode("entrance-camera");
        scanner.current = s;
        await s.start(
          device
            ? { deviceId: { exact: device } }
            : { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (w: number, h: number) => ({
              width: Math.floor(Math.min(w, h) * 0.75),
              height: Math.floor(Math.min(w, h) * 0.75),
            }),
          },
          (text: string) => {
            if (!locked.current && generation.current === gen) {
              setCode(text);
              void validate({ token: text });
            }
          },
          () => {},
        );
        if (!alive.current || generation.current !== gen) {
          if (s.isScanning) await s.stop();
          s.clear();
          return;
        }
        setCameraState("running");
        setDevices(await Html5Qrcode.getCameras());
        setHasTorch(
          !!s.getRunningTrackCameraCapabilities().torchFeature().isSupported(),
        );
      } catch (e: any) {
        await stop();
        const name = e?.name || String(e);
        setCameraError(
          /NotAllowed|Permission|denied/i.test(name)
            ? "Camera permission denied. Allow camera access in browser settings, or use guest search."
            : /NotFound|DevicesNotFound/i.test(name)
              ? "No camera found. Use guest search or a private code."
              : /NotReadable|TrackStart/i.test(name)
                ? "Camera is in use. Close other camera apps and retry."
                : /UNSUPPORTED/i.test(name)
                  ? "Camera requires a supported browser on HTTPS or localhost. Use guest search here."
                  : "Camera could not start. Retry or use guest search.",
        );
      }
    })();
    cameraPending.current = job;
    await job;
    cameraPending.current = null;
  }
  useEffect(() => {
    setPageIndex(0);
  }, [search, filter, tier, sort, eventId]);
  if (!data)
    return (
      <div className="panel">
        {error ? (
          <p role="alert">
            {error} <button onClick={load}>Retry</button>
          </p>
        ) : (
          <Loading />
        )}
      </div>
    );
  const guests = data.guests;
  return (
    <section className="entrance" aria-label="Entrance management">
      <header className="panel">
        <div className="row between wrap">
          <div>
            <h1>Entrance management</h1>
            <h3>{data.event.title}</h3>
            <p>
              {date(data.event.startsAt)} · {time(data.event.startsAt)} MYT ·{" "}
              {data.event.status}
            </p>
          </div>
          <button className="button secondary" onClick={load}>
            <RefreshCw size={18} /> Refresh attendance
          </button>
        </div>
        {data.event.testOnly && (
          <p className="setup-notice">
            TEST ONLY — fictional rehearsal. No real admission.
          </p>
        )}
        {data.event.status !== "PUBLISHED" && (
          <p role="alert">Entry is closed for this event.</p>
        )}
        {data.manage && (
          <a
            className="button secondary"
            href={`/organizer?tab=Staff&event=${eventId}`}
          >
            Manage entrance staff
          </a>
        )}
        <dl className="entrance-counts">
          {[
            ["Expected", data.counts.expected],
            ["Checked in", data.counts.checkedIn],
            ["Not arrived", data.counts.notArrived],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          {data.counts.registrations} registrations ·{" "}
          {data.counts.confirmedBookings} confirmed bookings ·{" "}
          {data.counts.issued} issued tickets · {data.counts.rejected} rejected
          attempts
        </p>
        <p className="muted">
          Last admission:{" "}
          {data.lastCheckIn ? time(data.lastCheckIn) : "None yet"}. Refreshes
          every 30 seconds while visible.
        </p>
      </header>
      {!online && (
        <p role="alert" className="alert">
          Connection lost. Admission is paused. Reconnect, refresh attendance
          and validate again.
        </p>
      )}
      {data.canCheckIn && (
        <div className="panel entrance-scanner">
          <h3>Scan a ticket</h3>
          <p>
            Selected event: <strong>{data.event.title}</strong>
          </p>
          <div className="entrance-camera">
            <div id="entrance-camera" />
            {cameraState === "stopped" && (
              <p>
                <ScanLine size={48} aria-hidden="true" /> Camera stopped
              </p>
            )}
          </div>
          <div className="row wrap">
            <button
              className="button secondary"
              disabled={busy || !online || cameraState === "starting"}
              onClick={() => (cameraState === "running" ? stop() : start())}
            >
              <Camera size={18} />
              {cameraState === "running"
                ? "Stop camera"
                : cameraState === "starting"
                  ? "Starting camera…"
                  : "Start camera"}
            </button>
            {hasTorch && (
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await scanner.current.applyVideoConstraints({
                      advanced: [{ torch: !torch }],
                    });
                    setTorch(!torch);
                  } catch {
                    setCameraError("Torch unavailable on this camera.");
                  }
                }}
              >
                {torch ? "Turn torch off" : "Turn torch on"}
              </button>
            )}
          </div>
          {devices.length > 1 && (
            <label>
              Camera
              <select
                value={device}
                onChange={async (e) => {
                  setDevice(e.target.value);
                  await stop();
                }}
              >
                <option value="">Back camera preferred</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label || "Camera"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {cameraError && <p role="alert">{cameraError}</p>}
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void validate({ token: code.trim() });
            }}
          >
            <label>
              Private entry code
              <input
                name="entryCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                minLength={20}
                maxLength={100}
                required
              />
            </label>
            <button className="button primary" disabled={busy || !online}>
              {busy ? "Validating…" : "Validate ticket"}
            </button>
          </form>
          {preview && (
            <div className="entrance-confirm" role="status">
              <h3>Verify this guest</h3>
              <p>
                <strong>{preview.name}</strong> · {preview.tier}
              </p>
              <p>{preview.event}</p>
              <p>Reference: {preview.id}</p>
              {preview.requiresId && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={identity}
                    onChange={(e) => setIdentity(e.target.checked)}
                  />
                  <span>
                    I checked attendee identification and the event age
                    requirement ({data.event.age}+).
                  </span>
                </label>
              )}
              <div className="row wrap">
                <button
                  className="button primary"
                  disabled={
                    busy || !online || (preview.requiresId && !identity)
                  }
                  onClick={admit}
                >
                  {busy ? "Confirming…" : "Confirm admission"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setPreview(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {result && (
            <div
              className={`scan-result ${result.error ? "failure" : "success"}`}
              role="status"
            >
              {result.error ? (
                <CircleAlert size={32} />
              ) : (
                <CheckCircle2 size={32} />
              )}
              <h3>
                {result.error
                  ? result.error.includes("Already checked in")
                    ? "Already checked in"
                    : /403|permission|access/i.test(result.error)
                      ? "Staff access revoked"
                      : /invalid/i.test(result.error)
                        ? "Ticket invalid"
                        : "Not admitted"
                  : "Admission confirmed"}
              </h3>
              <p>
                {result.error ||
                  `${result.name} · ${result.tier} · ${result.event}`}
              </p>
              {result.checkedInAt && (
                <p>
                  {time(result.checkedInAt)} MYT · Verified attendance recorded.
                </p>
              )}
              <button
                className="button secondary"
                onClick={() => {
                  setResult(null);
                  setCode("");
                  setIdentity(false);
                }}
              >
                Next guest
              </button>
            </div>
          )}
        </div>
      )}
      {data.canViewGuests && (
        <div className="panel">
          <h3>Guest list</h3>
          {data.manage && (
            <a
              className="button secondary"
              href={`/api/entrance-export/${eventId}`}
              download
            >
              Export private guest list
            </a>
          )}
          <div className="entrance-filters">
            <label>
              Search guest, ticket or booking
              <input
                name="guestSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
                autoComplete="off"
              />
            </label>
            <label>
              Admission status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["Not arrived", "Checked in", "All tickets"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Ticket tier
              <select value={tier} onChange={(e) => setTier(e.target.value)}>
                <option>All tiers</option>
                {data.tiers.map((t: any) => (
                  <option key={t.name}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Sort tickets
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="NEWEST">Newest tickets</option>
              <option value="NAME">Guest name</option>
              <option value="RECENT_ARRIVALS">Recent arrivals</option>
            </select>
          </label>
          <p role="status">
            {data.total} matching tickets · Page {data.page} of {data.pages}
          </p>
          <div className="entrance-guests">
            {guests.map((g: any) => (
              <article key={g.id}>
                <div>
                  <strong>{g.name}</strong>
                  <p>
                    {g.tier} · {g.registration.replaceAll("_", " ")}
                  </p>
                  <small>
                    Ticket: {g.id}
                    <br />
                    Booking: {g.bookingId}
                  </small>
                </div>
                <div>
                  <strong>
                    {g.checkedInAt
                      ? "Checked in"
                      : g.eligible
                        ? "Not arrived"
                        : "Not valid for entry"}
                  </strong>
                  <p>
                    {g.checkedInAt
                      ? `${time(g.checkedInAt)} MYT · ${g.method}`
                      : g.status}
                  </p>
                  {g.eligible && data.canCheckIn && (
                    <button
                      className="button secondary"
                      disabled={busy || !online}
                      onClick={() => {
                        void validate({ ticketId: g.id });
                        document
                          .querySelector(".entrance-scanner")
                          ?.scrollIntoView({ block: "start" });
                      }}
                    >
                      Review manual entry
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {data.pages > 1 && (
            <div className="row wrap">
              <button
                className="button secondary"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
              >
                Previous guests
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button
                className="button secondary"
                disabled={data.page >= data.pages}
                onClick={() => setPageIndex((p) => p + 1)}
              >
                Next guests
              </button>
            </div>
          )}
          {!guests.length && (
            <p>No matching guests. Try another search or filter.</p>
          )}
        </div>
      )}
      {data.canViewGuests && (
        <div className="panel">
          <details>
            <summary>Manage all registrations</summary>
            <GuestManagement eventId={eventId} />
          </details>
        </div>
      )}
      <div className="panel">
        <h3>Attendance by tier</h3>
        <p>
          {data.counts.expected
            ? Math.round((data.counts.checkedIn / data.counts.expected) * 100)
            : 0}
          % of expected tickets checked in
        </p>
        {data.tiers.map((t: any) => (
          <p key={t.name}>
            {t.name}: {t.checkedIn} checked in · {t.notArrived} not arrived
          </p>
        ))}
        {data.recent.length > 0 && (
          <>
            <h3>Recent admissions</h3>
            {data.recent.map((g: any) => (
              <p key={g.id}>
                {g.name} · {time(g.checkedInAt)} MYT · {g.method}
              </p>
            ))}
          </>
        )}
      </div>
      {data.manage && (
        <div className="panel">
          <h3>Staff activity</h3>
          {data.staffActivity.length ? (
            data.staffActivity.map((a: any) => (
              <p key={a.id}>
                <strong>{a.actor}</strong> ·{" "}
                {a.action.replaceAll("_", " ").toLowerCase()} ·{" "}
                {time(a.createdAt)} MYT
                <br />
                <small>{a.reference}</small>
              </p>
            ))
          ) : (
            <p>No entrance activity yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
