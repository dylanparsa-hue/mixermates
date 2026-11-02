"use client";
import { upcomingEvents, malaysiaDay } from "@/lib/discovery";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  NightHero,
  EventRow,
  CreatorEditorial,
  NightReminder,
  OrganizerCampaign,
} from "./cinematic-discovery";
import { EventArtwork } from "./event-artwork";
import Link from "next/link";

import {
  ArrowRight,
  Search,
  Map,
  X,
  SlidersHorizontal,
  Headphones,
} from "lucide-react";
import { api, date, cities, categories, Empty } from "./shared";
import { eventCategories } from "@/lib/event-config";
const discoveryCategories = [
  ...categories,
  ...eventCategories
    .filter(
      (name) =>
        name !== "Private Party" &&
        !categories.some(([label]) => label === name),
    )
    .map((name) => [name, Headphones] as const),
];
const categoryRows = [
  discoveryCategories.slice(0, 8),
  discoveryCategories.slice(8),
];
const categoryPhotos = [
  "festival",
  "neon",
  "social",
  "live",
  "sunset",
  "rooftop",
  "festival",
  "live",
];

function Explore({
  version,
  save,
  notify,
  testLab = false,
}: {
  testLab?: boolean;
  version: number;
  save: (e: any) => void;
  notify: (s: string) => void;
}) {
  const params = useSearchParams();
  const [events, setEvents] = useState<any[] | null>(null),
    [q, setQ] = useState(params.get("q") || ""),
    [city, setCity] = useState(params.get("city") || "All cities"),
    [category, setCategory] = useState(params.get("category") || "All vibes"),
    [filters, setFilters] = useState(false),
    [free, setFree] = useState(params.get("free") === "true"),
    [when, setWhen] = useState(params.get("when") || "Any date"),
    [age, setAge] = useState(params.get("age") || "Any age"),
    [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || ""),
    [error, setError] = useState(""),
    [selectedDay, setSelectedDay] = useState(params.get("day") || ""),
    [showAll, setShowAll] = useState(params.get("view") === "all");
  useEffect(() => {
    api("events")
      .then((es) => {
        setEvents(es);
        es.filter((e: any) => e.promotions?.length > 0).forEach((e: any) =>
          api("activity", {
            eventId: e.id,
            kind: "PROMOTION_IMPRESSION",
          }).catch(() => {}),
        );
      })
      .catch((e) => setError(e.message));
  }, [version]);
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value, empty] of [
      ["q", q, ""],
      ["city", city, "All cities"],
      ["category", category, "All vibes"],
      ["when", when, "Any date"],
      ["age", age, "Any age"],
      ["maxPrice", maxPrice, ""],
      ["day", selectedDay, ""],
      ["free", free ? "true" : "", ""],
      ["view", showAll ? "all" : "", ""],
    ]) {
      if (value === empty) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    if (url.href !== location.href) window.history.replaceState(null, "", url);
  }, [q, city, category, when, age, maxPrice, selectedDay, free, showAll]);
  useEffect(() => {
    const restore = () => {
      const p = new URLSearchParams(location.search);
      setQ(p.get("q") || "");
      setCity(p.get("city") || "All cities");
      setCategory(p.get("category") || "All vibes");
      setWhen(p.get("when") || "Any date");
      setAge(p.get("age") || "Any age");
      setMaxPrice(p.get("maxPrice") || "");
      setSelectedDay(p.get("day") || "");
      setFree(p.get("free") === "true");
      setShowAll(p.get("view") === "all");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const upcoming = upcomingEvents(events || []).filter(
    (e) =>
      !testLab ||
      (e.testOnly &&
        e.origin === "REAL" &&
        e.configurationStatus === "FICTIONAL_APPROVED"),
  );
  const filtered = upcoming.filter((e) => {
    if (selectedDay && malaysiaDay(e.startsAt) !== selectedDay) return false;
    const hay =
      `${e.title} ${e.city} ${e.venue} ${e.genre} ${e.organizer?.name}`.toLowerCase();
    const today = new Date();
    const mytNow = new Date(today.getTime() + 8 * 3600000);
    const midnight =
      Date.UTC(
        mytNow.getUTCFullYear(),
        mytNow.getUTCMonth(),
        mytNow.getUTCDate(),
      ) -
      8 * 3600000;
    const day = mytNow.getUTCDay();
    const saturday =
      midnight +
      ((6 - day + 7) % 7) * 86400000 -
      (day === 0 ? 86400000 * 7 : 0);
    const weekendStart = day === 0 ? midnight - 86400000 : saturday;
    const inWeekend =
      +new Date(e.startsAt) >= weekendStart &&
      +new Date(e.startsAt) < weekendStart + 2 * 86400000;
    return (
      hay.includes(q.toLowerCase()) &&
      (city === "All cities" || e.city === city) &&
      (category === "All vibes" ||
        (category === "Electronic"
          ? e.genre.includes("Electronic")
          : category === "Festival"
            ? ["Festival", "Music Festival"].includes(e.category)
            : category === "Nightlife"
              ? ["Nightlife", "Nightclub"].includes(e.category)
              : category === "Concert"
                ? ["Concert", "Live Music"].includes(e.category)
                : category === "House Music"
                  ? e.genre.includes("House")
                  : e.category === category)) &&
      (!free || e.tiers.some((t: any) => !t.price)) &&
      (age === "Any age" || e.age <= Number(age)) &&
      (!maxPrice ||
        Math.min(...e.tiers.map((t: any) => t.price)) <=
          Number(maxPrice) * 100) &&
      (when === "Any date" ||
        (when === "This weekend"
          ? inWeekend
          : date(e.startsAt, {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            }) ===
            date(new Date().toISOString(), {
              day: "numeric",
              month: "numeric",
              year: "numeric",
            })))
    );
  });
  const active =
    showAll ||
    selectedDay ||
    q ||
    city !== "All cities" ||
    category !== "All vibes" ||
    free ||
    when !== "Any date" ||
    maxPrice ||
    age !== "Any age";
  const chooseCategory = (name: string) => {
    setCategory(name);
    document.getElementById("event-results")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <>
      <div className="cinema-discovery" id="discover">
        <NightHero />
        <div className="page-width discovery-wrap mm-discovery">
          <div className="cinema-category-strips" aria-label="Event categories">
            {categoryRows.map((row, index) => (
              <div
                key={index}
                className="cinema-chip-row"
                role="region"
                aria-label={`Event categories, row ${index + 1}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  const row = e.currentTarget;
                  const buttons = Array.from(
                    row.querySelectorAll<HTMLButtonElement>("button"),
                  );
                  const i = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? buttons.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              buttons.length - 1,
                              i + (e.key === "ArrowRight" ? 1 : -1),
                            ),
                          );
                  buttons[next]?.focus({ preventScroll: true });
                  buttons[next]?.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                    behavior: "instant",
                  });
                }}
              >
                {row.map(([name, Icon], i) => (
                  <button
                    key={name}
                    aria-pressed={category === name}
                    className={category === name ? "active" : ""}
                    onClick={() => chooseCategory(name)}
                  >
                    <EventArtwork
                      src={`/images/${categoryPhotos[i % categoryPhotos.length]}.jpg`}
                      alt=""
                      width={40}
                      height={40}
                      sizes="40px"
                      loading="lazy"
                    />
                    <span>{name}</span>
                    <Icon size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="cinema-catalogue-tools">
            <h2>FIND YOUR NIGHT.</h2>
            <Link href="/map">
              <Map size={16} aria-hidden="true" /> Map view
            </Link>
          </div>
          <form
            className="search-bar cinema-search"
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById("event-results")?.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
                block: "start",
              });
            }}
          >
            <label className="search-input">
              <Search size={20} />
              <input
                aria-label="Search events"
                name="q"
                autoComplete="off"
                placeholder="Search events, artists, places…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <button
              aria-label="Filters"
              aria-expanded={filters}
              aria-controls="discovery-filters"
              className={`filter-button ${filters ? "selected" : ""}`}
              type="button"
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={17} />
              <span>Filters</span>
            </button>
            <button className="search-submit" aria-label="Search">
              <ArrowRight size={21} />
            </button>
          </form>
          {filters && (
            <div className="filter-panel" id="discovery-filters">
              <label>
                City
                <select
                  aria-label="Filter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <select
                  aria-label="Filter date"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                >
                  {["Any date", "Tonight", "This weekend"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => setFree(e.target.checked)}
                />
                Free events only
              </label>
              <label>
                Maximum price (RM)
                <input
                  type="number"
                  min="0"
                  placeholder="Any price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </label>
              <label>
                Age requirement
                <select value={age} onChange={(e) => setAge(e.target.value)}>
                  <option>Any age</option>
                  <option value="18">18 and under</option>
                  <option value="21">21 and under</option>
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setSelectedDay("");
                  setFree(false);
                  setMaxPrice("");
                  setAge("Any age");
                  setWhen("Any date");
                  setCategory("All vibes");
                  setCity("All cities");
                  setQ("");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
          <div id="event-results" className="cinema-results" aria-live="polite">
            {error ? (
              <Empty title="We couldn’t load the events" text={error}>
                <button
                  className="button secondary"
                  onClick={() => location.reload()}
                >
                  Try again
                </button>
              </Empty>
            ) : !events ? (
              <div className="cinema-loading" aria-label="Loading events">
                {[1, 2, 3, 4].map((i) => (
                  <div className="skeleton" key={i} />
                ))}
              </div>
            ) : filtered.length ? (
              <>
                {active && (
                  <div className="cinema-result-summary">
                    <p>
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "event" : "events"}
                      {category !== "All vibes" ? ` · ${category}` : ""}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQ("");
                        setCity("All cities");
                        setCategory("All vibes");
                        setWhen("Any date");
                        setFree(false);
                        setMaxPrice("");
                        setAge("Any age");
                        setSelectedDay("");
                        setShowAll(false);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                <EventRow
                  title={active ? "Your kind of nights" : "Featured events"}
                  events={active ? filtered : filtered.slice(0, 8)}
                  save={save}
                  testLab={testLab}
                  priority
                  onViewAll={active ? undefined : () => setShowAll(true)}
                />
                {!active && (
                  <>
                    <CreatorEditorial events={upcoming} />
                    {upcoming.filter((e) =>
                      ["Nightlife", "Nightclub", "House Party"].includes(
                        e.category,
                      ),
                    ).length > 0 && (
                      <EventRow
                        title="After dark"
                        events={upcoming.filter((e) =>
                          ["Nightlife", "Nightclub", "House Party"].includes(
                            e.category,
                          ),
                        )}
                        save={save}
                        testLab={testLab}
                      />
                    )}
                    <NightReminder />
                    {upcoming.filter((e) =>
                      [
                        "Concert",
                        "Live Music",
                        "Festival",
                        "Music Festival",
                      ].includes(e.category),
                    ).length > 0 && (
                      <EventRow
                        title="Live for the music"
                        events={upcoming.filter((e) =>
                          [
                            "Concert",
                            "Live Music",
                            "Festival",
                            "Music Festival",
                          ].includes(e.category),
                        )}
                        save={save}
                        testLab={testLab}
                      />
                    )}
                    <OrganizerCampaign />
                  </>
                )}
              </>
            ) : (
              <Empty
                icon={Search}
                title="A different vibe is out there."
                text="Try another city, date, or category to find your next night."
              />
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export { Explore };
