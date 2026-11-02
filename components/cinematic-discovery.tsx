"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, LockKeyhole } from "lucide-react";
import { EventArtwork } from "./event-artwork";
import { date, money } from "./shared";

export function CinemaReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.classList.add("cinema-arrived");
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={root} className={`cinema-reveal ${className}`}>
      {children}
    </section>
  );
}

export function NightHero() {
  return (
    <section className="night-hero" aria-labelledby="night-title">
      <div className="hero-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-disc" />
        <img
          src="/images/cinematic/night-portrait.webp"
          width="1024"
          height="1092"
          fetchPriority="high"
          alt=""
        />
      </div>
      <div className="night-hero-copy">
        <h1 id="night-title">
          <span>YOUR NEXT</span>
          <span>NIGHT STARTS</span>
          <span>HERE.</span>
        </h1>
        <p>Good music. New faces. A night that’s yours.</p>
        <a href="#event-results" className="button hero-cta">
          Explore events <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export function EventRow({
  title,
  events,
  save,
  onViewAll,
  testLab = false,
  id,
  priority = false,
}: {
  title: string;
  events: any[];
  save: (event: any) => void;
  onViewAll?: () => void;
  testLab?: boolean;
  id?: string;
  priority?: boolean;
}) {
  const uid = useId(),
    track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const update = () =>
      setEdges({
        start: node.scrollLeft < 5,
        end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 5,
      });
    update();
    const resize = new ResizeObserver(update);
    resize.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, [events.length]);
  if (!events.length) return null;
  function move(direction: number) {
    const node = track.current;
    if (node)
      node.scrollBy({
        left: direction * node.clientWidth * 0.82,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <section
      className="cinema-event-row"
      id={id}
      aria-labelledby={`${uid}-heading`}
    >
      <div className="cinema-row-heading">
        <h2 id={`${uid}-heading`}>{title}</h2>
        <div>
          {onViewAll && (
            <button className="row-view-all" onClick={onViewAll}>
              View all <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
          <button
            className="row-arrow"
            aria-label={`Previous ${title.toLowerCase()}`}
            aria-controls={uid}
            disabled={edges.start}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <button
            className="row-arrow"
            aria-label={`Next ${title.toLowerCase()}`}
            aria-controls={uid}
            disabled={edges.end}
            onClick={() => move(1)}
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="cinema-track"
        ref={track}
        id={uid}
        role="region"
        aria-label={`${title} posters`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            if (e.key === "Home" || e.key === "End")
              e.currentTarget.scrollTo({
                left: e.key === "Home" ? 0 : e.currentTarget.scrollWidth,
              });
            else move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {events.map((event, index) => {
          const prices = event.tiers.map((t: any) => t.price),
            available = event.tiers.reduce(
              (n: number, t: any) => n + t.quantity - t.sold,
              0,
            );
          return (
            <article className="event-card cinema-poster" key={event.id}>
              <Link
                href={`/events/${event.slug}`}
                className="cinema-poster-link"
              >
                <div className="cinema-poster-art">
                  <EventArtwork
                    src={event.image}
                    alt=""
                    width={600}
                    height={780}
                    sizes="(max-width: 767px) 72vw, (max-width: 1023px) 38vw, 23vw"
                    loading={priority && index === 0 ? "eager" : "lazy"}
                  />
                  <div className="poster-shade" />
                  <span className="poster-category">
                    {event.origin === "PUBLIC_DEMO" ? "DEMO · " : event.testOnly || testLab ? "TEST · " : ""}
                    {event.category}
                    {event.promotions?.length > 0 ? " · Sponsored" : ""}
                  </span>
                  <span className="poster-date">
                    <b>{date(event.startsAt, { day: "2-digit" })}</b>
                    {date(event.startsAt, { month: "short" })}
                  </span>
                </div>
                <div className="cinema-poster-caption">
                  <p>
                    {date(event.startsAt, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {event.city}
                    {event.access !== "PUBLIC" && (
                      <LockKeyhole size={12} aria-label="Invite only" />
                    )}
                  </p>
                  <h3>{event.title}</h3>
                  <span>
                    {prices.length
                      ? Math.min(...prices) === 0
                        ? "Free"
                        : `From ${money(Math.min(...prices))}`
                      : "Ticket details inside"}
                    {available <= 0 ? " · Sold out" : ""}
                  </span>
                </div>
              </Link>
              <button
                className={`save-button ${event.saved ? "saved" : ""}`}
                aria-label={event.saved ? "Unsave event" : "Save event"}
                aria-pressed={!!event.saved}
                onClick={() => save(event)}
              >
                <Heart
                  size={18}
                  fill={event.saved ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CreatorEditorial({ events }: { events: any[] }) {
  const creators = [
    ...new Map(
      events
        .filter((e) => e.access === "PUBLIC" && e.organizer?.username)
        .map((e) => [e.organizer.id || e.organizer.username, e]),
    ).values(),
  ].slice(0, 5);
  if (!creators.length) return null;
  return (
    <CinemaReveal className="creator-editorial">
      <div className="creator-editorial-copy">
        <h2>
          THE PEOPLE
          <br />
          BEHIND
          <br />
          THE NIGHT.
        </h2>
        <p>Meet the hosts making things happen.</p>
        <Link href="/friends" className="editorial-link">
          Find your people <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </div>
      <div className="creator-mosaic">
        {creators.map((e, index) => (
          <Link
            key={e.organizer.username}
            href={`/events/${e.slug}`}
            className={`creator-tile creator-tile-${index}`}
          >
            <EventArtwork
              src={e.organizer.photo || e.image}
              alt={
                e.organizer.photo ? "" : `Event artwork by ${e.organizer.name}`
              }
              width={480}
              height={600}
              sizes="(max-width:767px) 52vw, 22vw"
              loading="lazy"
            />
            <span>
              <small>{e.origin === "PUBLIC_DEMO" ? "FICTIONAL SHOWCASE" : e.testOnly ? "TEST ORGANIZER" : "EVENT ORGANIZER"}</small>
              <strong>{e.organizer.name}</strong>
            </span>
          </Link>
        ))}
      </div>
    </CinemaReveal>
  );
}

const atmosphere = ["live", "social", "neon", "sunset", "festival"];
export function NightReminder() {
  return (
    <section className="night-reminder">
      <div className="reminder-photos" aria-hidden="true">
        {atmosphere.slice(0, 4).map((name, index) => (
          <EventArtwork
            key={name}
            className={`reminder-photo reminder-photo-${index}`}
            src={`/images/${name}.jpg`}
            alt=""
            width={360}
            height={460}
            loading="lazy"
            sizes="18vw"
          />
        ))}
      </div>
      <div className="reminder-copy">
        <h2>
          DON’T MISS
          <br />
          YOUR NEXT NIGHT.
        </h2>
        <p>Your plans, tickets and people. All in one place.</p>
        <div>
          <Link href="/tickets" className="button primary">
            My tickets
          </Link>
          <Link href="/profile" className="button secondary">
            My preferences
          </Link>
        </div>
      </div>
    </section>
  );
}
export function OrganizerCampaign() {
  return (
    <CinemaReveal className="organizer-campaign">
      <div className="campaign-fan" aria-hidden="true">
        {atmosphere.map((name, index) => (
          <div key={name} className={`fan-tile fan-tile-${index}`}>
            <EventArtwork
              src={`/images/${name}.jpg`}
              alt=""
              width={320}
              height={400}
              loading="lazy"
              sizes="(max-width:767px) 20vw, 14vw"
            />
          </div>
        ))}
      </div>
      <h2>
        YOUR EVENT.
        <br />
        YOUR MOMENT.
      </h2>
      <p>Bring your people together. Make it a night to remember.</p>
      <Link className="button primary" href="/create">
        Create an event <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </CinemaReveal>
  );
}
