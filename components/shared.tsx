"use client";
import { EventArtwork } from "./event-artwork";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BrandSymbol } from "./brand";
import { TiltSurface } from "./motion";
import Link from "next/link";
import {
  MapPin,
  Heart,
  Ticket,
  Users,
  UserRound,
  Compass,
  Map,
  X,
  Sparkles,
  Disc3,
  Radio,
  Mic2,
  LockKeyhole,
  Wine,
  Headphones,
  LoaderCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export async function api(url: string, body?: any) {
  const res = await fetch(`/api/${url}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "Please try again."), { fieldErrors: data.fieldErrors, step: data.step });
  return data;
}
const money = (n: number, freeLabel = true) =>
  n === 0 && freeLabel
    ? "Free"
    : `RM${(n / 100).toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
const currency = (n: number) => money(n, false);
const date = (
  d: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  new Date(d).toLocaleDateString("en-MY", {
    ...opts,
    timeZone: "Asia/Kuala_Lumpur",
  });
const time = (d: string) =>
  new Date(d).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
const cities = [
  "All cities",
  "Kuala Lumpur",
  "Petaling Jaya",
  "Subang Jaya",
  "Penang",
  "Johor Bahru",
  "Melaka",
];
const nav = [
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Friends", href: "/friends", icon: Users },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Profile", href: "/profile", icon: UserRound },
];
const categories: [string, LucideIcon][] = [
  ["All vibes", Sparkles],
  ["Nightlife", Wine],
  ["House Party", Users],
  ["Electronic", Headphones],
  ["House Music", Disc3],
  ["Concert", Mic2],
  ["Festival", Radio],
];
function Loading() {
  return (
    <div className="loading">
      <BrandSymbol className="brand-loading" />
      <p>Finding your next great night…</p>
    </div>
  );
}
function Empty({
  icon: Icon = Sparkles,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={34} />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span
      className={`status ${["APPROVED", "ACTIVE", "CHECKED_IN", "VERIFIED", "SUCCEEDED", "PUBLISHED"].includes(value) ? "green" : ["REJECTED", "CANCELLED", "FAILED", "PAYMENT_FAILED", "SUSPENDED"].includes(value) ? "red" : "amber"}`}
    >
      <i />
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
function Avatar({
  name,
  size = 40,
  photo,
}: {
  name: string;
  size?: number;
  photo?: string;
}) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size / 3,
        background: `hsl(${(name.charCodeAt(0) * 11) % 360} 23% 28%)`,
      }}
    >
      {photo ? (
        <img src={photo} alt="" width={size} height={size} />
      ) : (
        name
          .split(" ")
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}
const ModalCloseContext = createContext<() => void>(() => {});
export function ModalCloseButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const dismiss = useContext(ModalCloseContext);
  return <button {...props} onClick={dismiss} />;
}
function Modal({
  title,
  children,
  close,
  wide = false,
  className = "",
  hideHeader = false,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  wide?: boolean;
  className?: string;
  hideHeader?: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState(false),
    [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpened(false);
    setClosing(true);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--modal-close-dur",
          ),
        ) || 150;
    timer.current = setTimeout(() => closeRef.current(), duration);
  }
  const dismissRef = useRef(requestClose);
  dismissRef.current = requestClose;
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!closingRef.current) setOpened(true);
    });
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        container.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select,textarea,summary,[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") dismissRef.current();
      if (e.key === "Tab") {
        const elements = focusables();
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      cancelAnimationFrame(frame);
      if (timer.current) clearTimeout(timer.current);
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <ModalCloseContext.Provider value={requestClose}>
      <div
        className={`modal-backdrop ${closing ? "is-closing" : ""}`}
        onClick={requestClose}
      >
        <section
          ref={container}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`modal t-modal ${opened ? "is-open" : closing ? "is-closing" : ""} ${wide ? "wide" : ""} ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!hideHeader && (
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  MAKE A LITTLE ROOM FOR GOOD NIGHTS
                </span>
                <h2>{title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={requestClose}
              >
                <X />
              </button>
            </div>
          )}
          {children}
        </section>
      </div>
    </ModalCloseContext.Provider>
  );
}
function EventCard({
  event: e,
  save,
  testLab = false,
  priority = false,
}: {
  priority?: boolean;
  event: any;
  save: (e: any) => void;
  testLab?: boolean;
}) {
  const price = Math.min(...e.tiers.map((t: any) => t.price));
  const available = e.tiers.reduce(
    (s: number, t: any) => s + t.quantity - t.sold,
    0,
  );
  return (
    <article className="event-card">
      <Link
        className={`card-image ${e.theme === "Halloween" ? "halloween-art" : ""}`}
        href={`/events/${e.slug}`}
      >
        <EventArtwork
          src={e.image}
          alt=""
          width={800}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
        <div className="card-shade" />
        <span className="card-price">
          {price > 0 ? <>From {money(price)}</> : "Free"}
        </span>
        <div className="card-content">
          <span className="card-kind">
            {e.origin === "PUBLIC_DEMO" ? "DEMO · " : e.testOnly ? "TEST · " : ""}
            {e.category}
            {e.promotions?.length > 0 ? " · Sponsored" : ""}
          </span>
          <h3>{e.title}</h3>
          <p>
            <MapPin size={14} aria-hidden="true" />
            {e.city}
            {e.access !== "PUBLIC" && (
              <>
                <LockKeyhole size={13} aria-hidden="true" /> Invite only
              </>
            )}
          </p>
          <div className="card-bottom">
            <span>
              {date(e.startsAt, { day: "numeric", month: "short" })} ·{" "}
              {time(e.startsAt)}
            </span>
            <span>
              {testLab && e.origin !== "REAL"
                ? "Preview"
                : available <= 0
                  ? "Sold out"
                  : `${e.age}+`}
            </span>
          </div>
        </div>
      </Link>
      <button
        aria-label={e.saved ? "Unsave event" : "Save event"}
        aria-pressed={!!e.saved}
        className={`save-button ${e.saved ? "saved" : ""}`}
        onClick={() => save(e)}
      >
        <Heart
          size={19}
          aria-hidden="true"
          fill={e.saved ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
}
function PageHeading({ eyebrow, title, description, children }: any) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Metric({ label, value, icon: Icon }: any) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>From your stored demo activity</small>
    </div>
  );
}

export {
  money,
  currency,
  date,
  time,
  cities,
  nav,
  categories,
  Loading,
  Empty,
  Status,
  Avatar,
  Modal,
  EventCard,
  PageHeading,
  Metric,
};
