"use client";
import { Fragment, type ReactNode, useState } from "react";
import { CalendarDays, MapPin, Ticket, ShieldCheck } from "lucide-react";
import {
  readDesign,
  safeImage,
  safeLink,
  type RichNode,
} from "@/lib/page-design";
import { currencyMYR, eventDateLabel, zonedInstant } from "@/lib/event-config";
import { ticketPricing } from "@/lib/ticket-pricing";
function Rich({ node }: { node: RichNode }) {
  let children: ReactNode =
    node.text || node.content?.map((n, i) => <Rich key={i} node={n} />);
  for (const m of node.marks || []) {
    if (m.type === "bold") children = <strong>{children}</strong>;
    if (m.type === "italic") children = <em>{children}</em>;
    if (m.type === "underline") children = <u>{children}</u>;
    if (m.type === "strike") children = <s>{children}</s>;
    if (m.type === "link" && safeLink(m.attrs?.href))
      children = (
        <a
          href={safeLink(m.attrs?.href)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
  }
  const style = {
    textAlign: node.attrs?.textAlign as "left" | "center" | "right" | undefined,
  };
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "text":
      return <>{children}</>;
    case "paragraph":
      return <p style={style}>{children || <br />}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 style={style}>{children}</h3>
      ) : (
        <h2 style={style}>{children}</h2>
      );
    case "bulletList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "image":
      return safeImage(node.attrs?.src) ? (
        <img
          src={safeImage(node.attrs?.src)}
          alt={node.attrs?.alt || "Event photo"}
          width={960}
          height={640}
          loading="lazy"
        />
      ) : null;
    default:
      return null;
  }
}
export function EventDescription({ event: e }: any) {
  const d = readDesign(e.pageDesign);
  return (
    <div className="event-rich-content">
      {d.about ? (
        <Rich node={d.about} />
      ) : (
        <p>{e.description || e.shortDescription}</p>
      )}
      {d.sections.map((s) => (
        <section key={s.id}>
          <h2>{s.title}</h2>
          <Rich node={s.content} />
        </section>
      ))}
    </div>
  );
}
export function CroppedArtwork({ src, alt, crop, kind }: any) {
  return (
    <div className={`designed-artwork designed-${kind}`}>
      <img
        src={src}
        alt={alt}
        width={kind === "banner" ? 1440 : 425}
        height={kind === "banner" ? 450 : 601}
        style={{
          objectPosition: `${crop.x}% ${crop.y}%`,
          transform: `scale(${crop.zoom})`,
          transformOrigin: `${crop.x}% ${crop.y}%`,
        }}
      />
    </div>
  );
}
/** Shared with the live public event route and authenticated saved preview. */
export function EventPageContent({
  event: e,
  preview = false,
  onBook,
  bookingDisabled = false,
}: any) {
  const [tab, setTab] = useState("Description"),
    [selected, setSelected] = useState("");
  const d = readDesign(e.pageDesign);
  let start = e.startsAt,
    end = e.endsAt;
  if (e.startsLocal)
    try {
      start = zonedInstant(e.startsLocal, e.timezone);
      end = zonedInstant(e.endsLocal, e.timezone);
    } catch {}
  const tiers = (e.tiers || []).filter((t: any) => t.availability !== "HIDDEN");
  const location =
    preview && (e.access !== "PUBLIC" || e.locationVisibility !== "PUBLIC")
      ? "Exact location shared with confirmed guests"
      : e.venue;
  return (
    <article
      className={`designed-event accent-${d.accent} treatment-${d.background}`}
    >
      {(e.coverImage || e.image) && (
        <CroppedArtwork
          src={e.coverImage || e.image}
          alt={`${e.title} banner`}
          crop={d.banner}
          kind="banner"
        />
      )}
      <div className="designed-event-body">
        <header className="designed-event-intro">
          {e.image && (
            <CroppedArtwork
              src={e.image}
              alt={`${e.title} poster`}
              crop={d.poster}
              kind="poster"
            />
          )}
          <div>
            <h1>{e.title || "Your event name"}</h1>
            <p className="designed-category">
              {e.testOnly ? "TEST · " : ""}
              {e.category}
            </p>

            <p>{e.shortDescription}</p>
            <p>
              <CalendarDays size={17} aria-hidden="true" />
              {eventDateLabel(start, e.timezone)} –{" "}
              {eventDateLabel(end, e.timezone)}
            </p>
            <p>
              <MapPin size={17} aria-hidden="true" />
              {location || "Location to be announced"}
              {e.city ? `, ${e.city}` : ""}
            </p>
            <p>
              <ShieldCheck size={17} aria-hidden="true" />
              {e.age ? `${e.age}+` : "No specific age restriction"}
            </p>
            {d.directions &&
              e.access === "PUBLIC" &&
              e.locationVisibility === "PUBLIC" && <p>{d.directions}</p>}
            <p>Hosted by {e.organizer?.name || "Your organizer profile"}</p>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setTab("Tickets");
              }}
            >
              <Ticket size={17} aria-hidden="true" />
              Get tickets
            </button>
          </div>
        </header>
        <div
          className="designed-tabs"
          role="tablist"
          aria-label="Event content"
        >
          {["Description", "Tickets"].map((t) => (
            <button
              type="button"
              key={t}
              role="tab"
              id={`event-tab-${t}`}
              aria-controls="event-tab-content"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              onKeyDown={(ev) => {
                if (["ArrowLeft", "ArrowRight"].includes(ev.key)) {
                  ev.preventDefault();
                  const next =
                    tab === "Description" ? "Tickets" : "Description";
                  setTab(next);
                  document.getElementById(`event-tab-${next}`)?.focus();
                }
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          id="event-tab-content"
          role="tabpanel"
          aria-labelledby={`event-tab-${tab}`}
        >
          {tab === "Description" ? (
            <EventDescription event={e} />
          ) : (
            <div className="designed-tickets">
              {tiers.map((t: any, i: number) => {
                const face =
                  t.originalPrice !== undefined
                    ? t.price
                    : Math.max(0, t.price - (t.discount || 0));
                const pricing = ticketPricing(
                  face,
                  1,
                  e.platformFeePolicy || "ABSORB",
                );
                return (
                  <Fragment key={t.id || i}>
                    {t.section &&
                      (i === 0 || tiers[i - 1].section !== t.section) && (
                        <h3>{t.section}</h3>
                      )}
                    <label className="designed-ticket">
                      <input
                        type="radio"
                        name="preview-tier"
                        checked={selected === (t.id || String(i))}
                        onChange={() => setSelected(t.id || String(i))}
                        disabled={t.availability === "PAUSED"}
                      />
                      {t.image && (
                        <img
                          src={t.image}
                          width={72}
                          height={72}
                          alt={`${t.name} ticket`}
                          loading="lazy"
                        />
                      )}
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                        {t.showRemaining && (
                          <small>
                            {Math.max(0, t.quantity - (t.sold || 0))} remaining
                          </small>
                        )}
                        {t.availability === "PAUSED" && (
                          <small>Currently unavailable</small>
                        )}
                      </span>
                      <span>
                        <strong>
                          {face ? currencyMYR(pricing.customerTotal) : "Free"}
                        </strong>
                        {pricing.platformFee > 0 && (
                          <small>
                            {e.platformFeePolicy === "CUSTOMER"
                              ? `Includes ${currencyMYR(pricing.platformFee)} service fee`
                              : "5% fee absorbed by organizer"}
                          </small>
                        )}
                      </span>
                    </label>
                  </Fragment>
                );
              })}
              <button
                type="button"
                className="button primary full"
                disabled={preview || bookingDisabled || !selected}
                onClick={() => onBook?.(selected)}
              >
                {preview
                  ? "Booking preview"
                  : bookingDisabled
                    ? "Booking unavailable"
                    : "Continue to booking"}
              </button>
              {preview && (
                <p className="setup-help">
                  Preview only. No reservation or payment is created.
                </p>
              )}
            </div>
          )}
        </div>
        <section className="designed-policies">
          <h2>Before you arrive</h2>
          {!preview && e.entryInstructions && <p>{e.entryInstructions}</p>}
          <p>
            {e.policies ||
              "Add entry and cancellation conditions before submitting."}
          </p>
          <p>
            Payment readiness and real-sales authorization are separate from
            event approval. Gateway charges are borne by the organizer.
          </p>
          {e.fields
            ?.filter((f: any) => !f.hidden)
            .map((f: any, i: number) => (
              <p key={f.id || i}>
                {f.label} ({f.required ? "required" : "optional"})
              </p>
            ))}
        </section>
      </div>
    </article>
  );
}
