"use client";
import { upcomingEvents } from "@/lib/discovery";
import { mapLocation } from "@/lib/map-location";
import { useTheme } from "./theme";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Map, X } from "lucide-react";
import { api, date, categories, PageHeading } from "./shared";

function MapPage({ version }: any) {
  const { resolved } = useTheme();
  const [events, setEvents] = useState<any[] | null>(null),
    [selected, setSelected] = useState<any>(null),
    [category, setCategory] = useState("All vibes"),
    [error, setError] = useState(""),
    [view, setView] = useState("list"),
    [period, setPeriod] = useState("upcoming"),
    [wide, setWide] = useState(false);
  const periodEvents =
    period === "upcoming"
      ? upcomingEvents(events || [])
      : (events || []).filter((e) => +new Date(e.endsAt) <= Date.now());
  const visibleEvents = periodEvents.filter(
    (e) => category === "All vibes" || e.category === category,
  );
  const mapEl = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    markers = useRef<any[]>([]);
  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    api("events")
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, [version]);
  useEffect(() => {
    if (!events || !mapEl.current || (!wide && view !== "map")) return;
    let cancelled = false;
    import("maplibre-gl")
      .then((ml) => {
        if (cancelled) return;
        ml.setWorkerUrl("/vendor/maplibre-6.4.1/maplibre-gl-worker.mjs");
        const m = new ml.Map({
          container: mapEl.current!,
          style:
            resolved === "light"
              ? "https://tiles.openfreemap.org/styles/positron"
              : process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
                "https://tiles.openfreemap.org/styles/dark",
          attributionControl: false,
          center: [101.67, 3.16],
          zoom: 10,
        });
        map.current = m;
        m.addControl(new ml.NavigationControl(), "top-right");
        m.addControl(
          new ml.AttributionControl({ compact: false }),
          "bottom-right",
        );
        m.on("error", () =>
          setError(
            "Map tiles are unavailable. The event list and location controls still work.",
          ),
        );
        for (const e of periodEvents) {
          const point = mapLocation(e);
          if (!point) continue;
          const el = document.createElement("button");
          el.className = "map-marker";
          el.style.display =
            category === "All vibes" || e.category === category ? "" : "none";
          el.setAttribute("aria-label", e.title);
          el.textContent = "";
          const dot = document.createElement("span");
          dot.setAttribute("aria-hidden", "true");
          el.append(dot);
          el.onclick = () => {
            setSelected(e);
            m.flyTo({
              center: point,
              zoom: 13,
              animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
            });
          };
          const marker = new ml.Marker({ element: el })
            .setLngLat(point)
            .addTo(m);
          markers.current.push({ marker, event: e });
        }
      })
      .catch(() =>
        setError(
          "The interactive map could not start. You can still explore events from the list.",
        ),
      );
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current = [];
    };
  }, [events, resolved, period, wide, view]);
  useEffect(() => {
    for (const { marker, event } of markers.current)
      marker.getElement().style.display =
        category === "All vibes" || event.category === category ? "" : "none";
  }, [category]);
  return (
    <div className="page-width standard-page mm-map-page">
      <PageHeading
        eyebrow="A GOOD NIGHT IS CLOSER THAN YOU THINK"
        title="Follow the feeling."
        description="Explore events across Malaysia. Protected locations stay off the map until access is authorized."
      />
      <div className="mm-map-toolbar">
        <label>
          Show events
          <select
            aria-label="Event period"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setSelected(null);
            }}
          >
            <option value="upcoming">Upcoming events</option>
            <option value="past">Past events · history</option>
          </select>
        </label>
        <div className="mm-map-toggle" aria-label="Map display">
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Event list
          </button>
          <button
            aria-pressed={view === "map"}
            onClick={() => {
              setView("map");
              setTimeout(() => map.current?.resize(), 0);
            }}
          >
            Map
          </button>
        </div>
        <span>
          {visibleEvents.length} {period === "past" ? "past" : "upcoming"}{" "}
          events
        </span>
      </div>
      <div className={`map-layout mm-map-${view}`}>
        <div className="map-list">
          <select
            aria-label="Map category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories
              .filter((c) => c[0] !== "Electronic")
              .map(([c]) => (
                <option key={c}>{c}</option>
              ))}
          </select>
          {events && !visibleEvents.length && (
            <p className="mm-map-empty">
              No {period} events match this category. Try another vibe.
            </p>
          )}
          {visibleEvents.map((e) => (
            <button
              className={`map-event ${selected?.id === e.id ? "active" : ""}`}
              key={e.id}
              onClick={() => {
                setSelected(e);
                const point = mapLocation(e);
                if (point) map.current?.flyTo({ center: point, zoom: 13 });
              }}
            >
              <img src={e.image} alt="" width={80} height={80} loading="lazy" />
              <div>
                <span className="eyebrow">
                  {date(e.startsAt)} · {e.category}
                </span>
                <strong>{e.title}</strong>
                <small>
                  <MapPin size={12} />
                  {e.city}
                </small>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
        <div className="map-container">
          <div
            ref={mapEl}
            className="interactive-map"
            aria-label="Event locations map"
          />
          {error && <div className="map-notice">{error}</div>}
          {!error &&
            visibleEvents.length > 0 &&
            !visibleEvents.some((e) => mapLocation(e)) && (
              <div className="mm-map-private-note">
                <MapPin size={20} aria-hidden="true" />
                <strong>No public pins yet</strong>
                <p>
                  Choose an event from the list. Protected locations stay
                  private until access is approved.
                </p>
              </div>
            )}
          {selected && (
            <div className="map-preview">
              <img src={selected.image} alt="" width={120} height={120} />
              <div>
                <span className="eyebrow">{selected.city}</span>
                <h3>{selected.title}</h3>
                <p>
                  {!mapLocation(selected)
                    ? "Location shared with confirmed guests"
                    : selected.venue}
                </p>
                <Link className="text-button" href={`/events/${selected.slug}`}>
                  Meet your next night
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <button
                className="icon-button"
                aria-label="Close event preview"
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { MapPage };
