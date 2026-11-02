"use client";
import { EventSetupPreview } from "./event-setup-preview";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Ticket,
  UserRound,
  Bell,
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Settings,
  Search,
} from "lucide-react";
import { api, date, nav, Loading, Empty, Avatar, Modal } from "./shared";

import { BrandLogo, BrandSymbol } from "./brand";
import { ThemeControl } from "./theme";
import { paymentDisclosure } from "@/lib/event-config";
import { MotionToast } from "./motion";
import { Explore } from "./explore";
import { Auth } from "./auth";
import { EventPage } from "./event";
import { Tickets } from "./tickets";
import { Profile, PublicProfile } from "./profile";
import { Friends } from "./friends";
import { MapPage } from "./map";
import { Organizer } from "./organizer";
import { OrganizerPublicProfile } from "./organizer-public-profile";
import { CreateEvent } from "./create-event";
import { Admin } from "./admin";

export default function Vibey({
  restrictedOrganizer = false,
}: {
  restrictedOrganizer?: boolean;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [testLab, setTestLab] = useState(false),
    [auth, setAuth] = useState<string | null>(null),
    [initialResetToken, setInitialResetToken] = useState(""),
    [accountMenu, setAccountMenu] = useState(false),
    [bookingTerms, setBookingTerms] = useState(false),
    [toast, setToast] = useState(""),
    [notifications, setNotifications] = useState<any[] | null>(null),
    [version, setVersion] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const notificationTrigger = useRef<HTMLButtonElement>(null);
  const notificationRequest = useRef(0);
  const organizerAccess =
    user &&
    (["ORGANIZER", "ADMIN"].includes(user.role) ||
      user.capabilities?.includes("ORGANIZER"));
  useEffect(() => {
    if (!accountMenu && notifications === null) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        accountRef.current?.contains(target) ||
        notificationRef.current?.contains(target) ||
        notificationTrigger.current?.contains(target)
      )
        return;
      setAccountMenu(false);
      setNotifications(null);
      notificationRequest.current++;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      (accountMenu ? accountTrigger : notificationTrigger).current?.focus();
      setAccountMenu(false);
      setNotifications(null);
      notificationRequest.current++;
    };
    const focusOut = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !accountRef.current?.contains(target) &&
        !notificationRef.current?.contains(target) &&
        !notificationTrigger.current?.contains(target)
      ) {
        setAccountMenu(false);
        setNotifications(null);
        notificationRequest.current++;
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", escape);
    document.addEventListener("focusin", focusOut);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("focusin", focusOut);
    };
  }, [accountMenu, notifications]);
  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  }, []);
  const refresh = useCallback(async () => {
    const d = await api("me");
    setUser(d.user);
    setDemo(d.demo);
    setTestLab(d.testLab === true);
    if (!d.user) {
      fetch("/api/auth/google/status",{cache:"no-store"}).then(r=>r.json()).then(s=>{if(s.pending)setAuth("google");}).catch(()=>{});
    }
    setReady(true);
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    refresh().catch(() => setReady(true));
    const reset = /^#reset=([a-f0-9]{64})$/.exec(window.location.hash);
    if (reset) {
      setInitialResetToken(reset[1]);
      setAuth("reset");
      window.history.replaceState(null,"",window.location.pathname + window.location.search);
    }
  }, [refresh]);
  useEffect(() => {
    const google = searchParams.get("google");
    if (google === "complete") setAuth("google");
    if (google === "existing") { setAuth("login"); notify("Sign in with your existing password, then link Google in Profile. Your account has been preserved."); }
    if (google === "failed") { setAuth("login"); notify("Google sign-in could not be completed. Please try again or use your password."); }
    if (google === "linked") notify("Google linked. Your account and permissions are unchanged.");
    if (searchParams.get("auth") === "login") setAuth("login");
  }, [searchParams,notify]);
  useEffect(() => {
    setAccountMenu(false);
    setNotifications(null);
    notificationRequest.current++;
  }, [pathname, searchParams]);
  const gate = (fn: () => void) => {
    if (!user) setAuth("login");
    else fn();
  };
  const switchAccount = async (id: string) => {
    try {
      await api("demo", { id });
      await refresh();
      setAccountMenu(false);
      notify(`Switched to ${id} demo`);
    } catch (e: any) {
      notify(e.message);
    }
  };
  const save = async (e: any) => {
    gate(async () => {
      try {
        await api("save", { eventId: e.id });
        setVersion((v) => v + 1);
        notify(
          e.saved ? "Removed from your saved events" : "Saved for a good night",
        );
      } catch (x: any) {
        notify(x.message);
      }
    });
  };
  const section =
    pathname === "/" || pathname === "/explore"
      ? "explore"
      : pathname.split("/")[1];
  return (
    <div className={`mm-platform mm-route-${section}`}>
      <a className="mm-skip" href="#platform-content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="nav-inner">
          <form className="nav-search" action="/explore" role="search">
            <Search size={16} aria-hidden="true" />
            <input
              name="q"
              aria-label="Search all events"
              autoComplete="off"
              placeholder="Search for events…"
            />
            <button type="submit" aria-label="Find events">
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </form>
          <Link
            href="/"
            className="logo"
            translate="no"
            aria-label="MixerMates home"
          >
            <BrandLogo className="desktop-brand" decorative />
            <BrandSymbol className="mobile-brand" decorative />
          </Link>
          <nav className="desktop-nav">
            {(restrictedOrganizer
              ? [
                  {
                    name: "Organizer studio",
                    href: "/organizer",
                    icon: LayoutDashboard,
                  },
                ]
              : nav.filter((n) =>
                  ["Explore", "Friends", "Tickets"].includes(n.name),
                )
            ).map((n) => (
              <Link
                key={n.name}
                aria-current={section === n.href.slice(1) ? "page" : undefined}
                className={section === n.href.slice(1) ? "active" : ""}
                href={n.href}
              >
                <n.icon size={16} />
                {n.name}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            {!user && (
              <button
                className="nav-signup"
                onClick={() => setAuth("register")}
              >
                Sign up
              </button>
            )}
            {user && user.role !== "STAFF" && (
              <button
                className="create-nav"
                onClick={() => gate(() => router.push("/create"))}
              >
                <Plus size={17} />
                Create Event
              </button>
            )}
            {user && (
              <button
                className="icon-button bell"
                aria-label="Notifications"
                ref={notificationTrigger}
                aria-expanded={notifications !== null}
                aria-controls="notification-panel"
                onClick={() =>
                  gate(async () => {
                    setAccountMenu(false);
                    const request = ++notificationRequest.current;
                    if (notifications !== null) {
                      setNotifications(null);
                      return;
                    }
                    setNotifications([]);
                    try {
                      const updates = await api("notifications");
                      if (request === notificationRequest.current)
                        setNotifications(updates);
                    } catch (e: any) {
                      if (request === notificationRequest.current) {
                        setNotifications(null);
                        notify(e.message);
                      }
                    }
                  })
                }
              >
                <Bell size={19} />
                <i />
              </button>
            )}
            <div className="account-wrap" ref={accountRef}>
              <button
                ref={accountTrigger}
                aria-expanded={accountMenu}
                aria-controls="account-panel"
                aria-label={user ? "Account menu" : "Sign in"}
                className={user ? "avatar-button" : "login-nav"}
                onClick={() =>
                  user
                    ? (setNotifications(null),
                      notificationRequest.current++,
                      setAccountMenu(!accountMenu))
                    : setAuth("login")
                }
              >
                {user ? (
                  <Avatar photo={user.photo} name={user.name} size={35} />
                ) : (
                  <>
                    Sign in
                    <ArrowUpRight size={15} />
                  </>
                )}
              </button>
              {accountMenu && (
                <div
                  className="account-menu"
                  id="account-panel"
                  role="region"
                  aria-label="Your account"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a"))
                      setAccountMenu(false);
                  }}
                >
                  <strong>{user.name}</strong>
                  <small>@{user.username}</small>
                  <ThemeControl compact />
                  <Link href="/tickets">
                    <Ticket size={16} />
                    My tickets
                  </Link>
                  <Link
                    href={
                      organizerAccess || user.role === "STAFF"
                        ? "/organizer"
                        : "/create"
                    }
                  >
                    <LayoutDashboard size={16} />
                    {organizerAccess || user.role === "STAFF"
                      ? "Organizer studio"
                      : "Become an Organizer"}
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin">
                      <ShieldCheck size={16} />
                      Admin dashboard
                    </Link>
                  )}
                  <Link href="/profile">
                    <Settings size={16} />
                    Profile & privacy
                  </Link>
                  {demo && (
                    <>
                      <span className="menu-label">
                        DEVELOPMENT DEMO ACCOUNTS
                      </span>
                      {["attendee", "organizer", "staff", "admin", "sarah"].map(
                        (id) => (
                          <button key={id} onClick={() => switchAccount(id)}>
                            {id}
                            <ArrowRight size={14} />
                          </button>
                        ),
                      )}
                    </>
                  )}
                  <button
                    onClick={async () => {
                      await api("logout", {});
                      window.location.replace("/");
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {notifications && (
        <div
          className="notification-pop"
          id="notification-panel"
          ref={notificationRef}
          role="region"
          aria-label="Your updates"
        >
          <div className="row between">
            <h3>Your updates</h3>
            <button
              className="text-button"
              onClick={async () => {
                await api("notifications", {});
                setNotifications(await api("notifications"));
              }}
            >
              Mark all read
            </button>
          </div>
          {notifications.length ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link}
                className={`notification ${n.read ? "read" : ""}`}
                onClick={() => {
                  setNotifications(null);
                  notificationRequest.current++;
                  api("notifications", { id: n.id }).catch(() => {});
                }}
              >
                <span className="notification-dot" />
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small>{date(n.createdAt)}</small>
                </div>
              </Link>
            ))
          ) : (
            <p className="muted">You’re all caught up.</p>
          )}
        </div>
      )}
      <main
        id="platform-content"
        className={
          ["profile", "people"].includes(section) ? "profile-route" : undefined
        }
      >
        {section === "explore" ? (
          <Explore
            version={version}
            save={save}
            notify={notify}
            testLab={testLab}
          />
        ) : section === "events" ? (
          searchParams.get("preview") === "1" ? (
            <EventSetupPreview slug={pathname.split("/")[2]} />
          ) : (
            <EventPage
              id={pathname.split("/")[2]}
              testLab={testLab}
              user={user}
              gate={gate}
              save={save}
              notify={notify}
              version={version}
            />
          )
        ) : section === "organizers" ? (
          <OrganizerPublicProfile slug={pathname.split("/")[2]} />
        ) : section === "map" ? (
          <MapPage version={version} />
        ) : !ready ? (
          <Loading />
        ) : !user ? (
          <div className="page-shell">
            <Empty
              icon={section === "tickets" ? Ticket : UserRound}
              title="Good nights start with a connection."
              text="Sign in to book events, find your people, and build your event passport."
            >
              <button
                className="button primary"
                onClick={() => setAuth("login")}
              >
                Sign in to MixerMates
                <ArrowUpRight size={17} />
              </button>
              <button
                className="button ghost"
                onClick={() => setAuth("register")}
              >
                Create an account
              </button>
            </Empty>
            {demo && (
              <div className="demo-entry">
                <span className="eyebrow">TAKE MixerMates FOR A SPIN</span>
                <h3>Choose your demo experience</h3>
                <div className="row wrap">
                  {["attendee", "organizer", "staff", "admin"].map((id) => (
                    <button
                      className="button secondary"
                      key={id}
                      onClick={() => switchAccount(id)}
                    >
                      {id}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : section === "tickets" ? (
          <Tickets user={user} notify={notify} version={version} />
        ) : section === "people" ? (
          <PublicProfile username={pathname.split("/")[2]} notify={notify} />
        ) : section === "profile" ? (
          <Profile user={user} refresh={refresh} notify={notify} save={save} />
        ) : section === "friends" ? (
          <Friends user={user} notify={notify} />
        ) : section === "organizer" ? (
          <Organizer user={user} notify={notify} />
        ) : section === "create" ? (
          <CreateEvent key={user.id} user={user} notify={notify} onActivated={refresh} />
        ) : section === "admin" ? (
          <Admin user={user} notify={notify} />
        ) : (
          <Empty
            title="That night hasn’t been planned yet."
            text="Let’s get you back to discovering."
          >
            <Link href="/explore" className="button primary">
              Explore events
            </Link>
          </Empty>
        )}
      </main>
      <footer className="cinema-footer">
        <div className="cinema-footer-top">
          <div className="cinema-footer-brand">
            <Link href="/" aria-label="MixerMates home">
              <BrandLogo size="large" decorative />
            </Link>
            <p>
              Good people.
              <br />
              Unforgettable nights.
            </p>
            <ThemeControl />
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/explore">All events</Link>
            <Link href="/map">Event map</Link>
            <Link href="/friends">Find people</Link>
          </div>
          <div>
            <h2>Make it happen</h2>
            <Link href="/create">Create an event</Link>
            <Link href="/organizer">Organizer studio</Link>
            <Link href="/tickets">My tickets</Link>
          </div>
          <div>
            <h2>Your account</h2>
            <Link href="/profile">Profile & privacy</Link>
            <Link href="/my-bookings">Bookings & support</Link>
            <Link href="/profile">Notification preferences</Link>
            <Link href="/booking-terms">Booking terms</Link>
          </div>
        </div>
        <div className="cinema-footer-bottom">
          <span>© 2026 MixerMates</span>
          <span>Malaysia · MYR</span>
          {(demo || testLab) && <span>TEST ONLY · NO REAL PAYMENTS</span>}
        </div>

      </footer>
      <nav className="bottom-nav" aria-label="Main navigation">
        {(restrictedOrganizer
          ? [
              {
                name: "Organizer studio",
                href: "/organizer",
                icon: LayoutDashboard,
              },
            ]
          : nav
        ).map((n) => (
          <Link
            href={n.href}
            aria-current={section === n.href.slice(1) ? "page" : undefined}
            className={section === n.href.slice(1) ? "active" : ""}
            key={n.name}
          >
            <n.icon size={20} />
            <span>{n.name}</span>
          </Link>
        ))}
      </nav>
      {bookingTerms && (
        <Modal
          title="Booking & payment information"
          close={() => setBookingTerms(false)}
        >
          <p>{paymentDisclosure}</p>
          <p>
            Each event lists its own admission rules and refund policy. Your
            booking keeps the terms recorded when you registered.
          </p>
          <Link
            href="/my-bookings"
            className="button secondary"
            onClick={() => setBookingTerms(false)}
          >
            View my booking terms
          </Link>
        </Modal>
      )}
      {auth && (
        <Auth
          mode={auth}
          initialResetToken={initialResetToken}
          setMode={setAuth}
          close={() => { setAuth(null); setInitialResetToken(""); }}
          refresh={refresh}
          notify={notify}
          demo={demo}
          switchAccount={switchAccount}
        />
      )}
      <MotionToast message={toast} dismiss={() => setToast("")} />
    </div>
  );
}
