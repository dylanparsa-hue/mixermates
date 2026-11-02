"use client";
import dynamic from "next/dynamic";
import { readDesign } from "@/lib/page-design";
import { EventPageContent } from "./event-page-content";
const EventPageDesigner = dynamic(() => import("./event-page-designer"), {
  ssr: false,
});
import { ticketPricing } from "@/lib/ticket-pricing";
import { FeeBreakdown } from "./fee-breakdown";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Upload,
  LoaderCircle,
  ImagePlus,
  Eye,
} from "lucide-react";
import { api } from "./shared";
import { EventQuestions } from "./event-questions";
import {
  currencyMYR,
  decimalToSen,
  eventCategories,
  eventPresets,
  localDateTime,
  localEventDateLabel,
  eventAccessLabel,
  zonedInstant,
} from "@/lib/event-config";
import {
  eventWizardErrors,
  firstInvalidStep,
  type FieldErrors,
} from "@/lib/event-wizard-validation";
const steps = [
  "Event Details",
  "Tickets",
  "Design Event Page",
  "Submit for Approval",
];
const newTier = (index = 0) => ({
  name: index ? `Ticket ${index + 1}` : "Free RSVP",
  description: "",
  image: "",
  section: "",
  showRemaining: false,
  price: 0,
  discount: 0,
  priceInput: "0.00",
  pricingMode: "FREE",
  currency: "MYR",
  quantity: index ? 0 : 100,
  minPerOrder: 1,
  maxPerOrder: 4,
  sortOrder: index,
  availability: "AVAILABLE",
  saleStart: null,
  saleEnd: null,
});
import { TEST_EVENT_POLICY } from "@/lib/simulator-constants";
const blank = {
  title: "",
  subcategory: "",
  shortDescription: "",
  description: "",
  category: "House Party",
  genre: "",
  image: "",
  coverImage: "",
  pageDesign: readDesign({}),
  supportingImages: [] as string[],
  startsLocal: "",
  endsLocal: "",
  timezone: "Asia/Kuala_Lumpur",
  city: "",
  venue: "",
  privateVenue: "",
  locationVisibility: "HIDDEN",
  latitude: 0,
  longitude: 0,
  age: 18,
  capacity: 100,
  access: "PUBLIC",
  invitationsEnabled: false,
  approvalRequired: true,
  guestListVisibility: "PRIVATE",
  idCheckRequired: true,
  policies: "",
  entryInstructions: "",
  theme: "House Party",
  platformFeePolicy: "ABSORB",
  paymentMode: "ORGANIZER_QR",
  paymentDestinationId: null as string | null,
  tiers: [newTier()] as any[],
  fields: [] as any[],
  entryOptions: [] as any[],
};
export function editableEvent(e: any) {
  const result: any = Object.fromEntries(
    Object.keys(blank).map((k) => [
      k,
      k === "startsLocal" || k === "endsLocal"
        ? new Date(e[k === "startsLocal" ? "startsAt" : "endsAt"]).getTime() > 0
          ? localDateTime(
              e[k === "startsLocal" ? "startsAt" : "endsAt"],
              e.timezone,
            )
          : ""
        : k === "pageDesign"
          ? readDesign(e.pageDesign)
          : k === "supportingImages" || k === "entryOptions"
            ? JSON.parse(e[k] || "[]")
            : (e[k] ?? (blank as any)[k]),
    ]),
  );
  if (!result.shortDescription && e.description)
    result.shortDescription = e.description.slice(0, 240);
  if (!eventCategories.includes(result.category)) result.category = "Nightclub";
  if (!eventPresets.includes(result.theme)) result.theme = "EDM";
  result.tiers = (e.tiers || []).map(({ eventId, sold, ...t }: any) => ({
    ...t,
    priceInput: (t.price / 100).toFixed(2),
    pricingMode: t.price > 0 ? "PAID" : "FREE",
  }));
  result.fields = (e.fields || []).map(({ eventId, ...q }: any) => q);
  if (e.creatorState?.payload) {
    const { id, version, creationKey, ...snapshot } = JSON.parse(
      e.creatorState.payload,
    );
    Object.assign(result, snapshot);
  }
  return result;
}
export function CreateEvent({ user, notify, onActivated }: any) {
  const [form, setForm] = useState<any>(() => structuredClone(blank)),
    [step, setStep] = useState(0),
    [record, setRecord] = useState<any>(null),
    [setup, setSetup] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<FieldErrors>({}),
    [saved, setSaved] = useState(""),
    [dirty, setDirty] = useState(false),
    [focusKey, setFocusKey] = useState("");
  const creationKey = useRef(crypto.randomUUID()),
    heading = useRef<HTMLHeadingElement>(null),
    requestLock = useRef(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const entitled =
        ["ORGANIZER", "ADMIN"].includes(user.role) ||
        user.capabilities?.includes("ORGANIZER");
      if (!entitled) {
        await api("become-organizer", {});
        await onActivated?.();
      }
      const data = await api("setup");
      if (!active) return;
      setSetup(data);
      const id = new URLSearchParams(location.search).get("edit");
      if (id) {
        const event = data.events.find((e: any) => e.id === id);
        if (!event)
          throw Error(
            "This draft is unavailable or belongs to another organizer.",
          );
        setRecord(event);
        setForm(editableEvent(event));
      } else
        setForm((f: any) => ({
          ...f,
          ...(data.creatorReadiness?.simulatorEnabled
            ? {
                paymentMode: "TEST_SIMULATOR",
                policies: TEST_EVENT_POLICY,
                approvalRequired: false,
                idCheckRequired: false,
              }
            : {}),
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || f.timezone,
        }));
      setReady(true);
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [user.id, onActivated]);
  useEffect(() => {
    if (!focusKey) return;
    const target = document.getElementById(focusKey);
    for (
      let ancestor = target?.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    )
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    target?.focus();
    setFocusKey("");
  }, [focusKey, step, errors]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigate = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest("a[href]");
      if (
        dirty &&
        anchor &&
        anchor.getAttribute("target") !== "_blank" &&
        !anchor.getAttribute("href")?.startsWith("#") &&
        !window.confirm(
          "Leave with unsaved changes? Save your draft to keep them.",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const update = (key: string, value: any) => {
    setForm((f: any) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaved("");
    setErrors((old) => {
      const next = { ...old };
      delete next[key];
      if (
        key === "tiers" &&
        !value.some((t: any) => t.price > 0 || t.pricingMode === "PAID")
      )
        for (const k of [
          "organizerVerification",
          "paymentDestinationId",
          "policies",
          "paidEvents",
        ])
          delete next[k];
      return next;
    });
  };
  const listUpdate = (key: string, index: number, k: string, v: any) => {
    update(
      key,
      form[key].map((x: any, i: number) =>
        i === index ? { ...x, [k]: v } : x,
      ),
    );
    if (key === "tiers" || key === "entryOptions")
      setErrors((old) => {
        const next = { ...old };
        delete next[`${key === "tiers" ? "tier" : "entry"}-${index}-${k}`];
        return next;
      });
  };
  const reject = (problems: FieldErrors) => {
    const invalidStep = firstInvalidStep(problems);
    setStep(invalidStep);
    setErrors(problems);
    setError("");
    setFocusKey(
      Object.keys(problems).find(
        (key) => firstInvalidStep({ [key]: problems[key] }) === invalidStep,
      ) || Object.keys(problems)[0],
    );
  };
  const lock =
    record &&
    ["PENDING_REVIEW", "SUSPENDED", "CANCELLED", "COMPLETED"].includes(
      record.status,
    );
  async function persist(action: "save" | "next" | "submit") {
    if (requestLock.current || lock) return;
    const through = action === "submit" ? 2 : Math.min(step, 2);
    if (action !== "save" && through === 0) {
      const problems = eventWizardErrors(form, through);
      if (Object.keys(problems).length) {
        reject(problems);
        return;
      }
    }
    requestLock.current = true;
    setBusy(true);
    setError("");
    try {
      // Account/recipient approval can change in another tab. Recheck before advancing,
      // while the server independently validates the same requirements.
      if (action !== "save" && through >= 1) {
        const current = await api("setup");
        setSetup(current);
        const problems = eventWizardErrors(
          form,
          through,
          new Date(),
          current.creatorReadiness,
        );
        if (Object.keys(problems).length) {
          reject(problems);
          return;
        }
      }
      const draft = {
        ...form,
        ...(record
          ? { id: record.id, version: record.stateVersion }
          : { creationKey: creationKey.current }),
      };
      const result = await api("event-workspace", {
        draft,
        ...(action === "next" ? { advanceTo: step + 1 } : {}),
      });
      setRecord(result.event);
      setForm(result.form);
      setDirty(false);
      setSaved("Draft saved to your account");
      window.history.replaceState(null, "", `/create?edit=${result.event.id}`);
      if (action === "next") {
        setErrors({});
        setStep(step + 1);
        heading.current?.focus();
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      if (action === "submit") {
        const submitted = await api("event-submit", {
          eventId: result.event.id,
          wizard: true,
        });
        setRecord({
          ...result.event,
          status: submitted.published ? "PUBLISHED" : "PENDING_REVIEW",
        });
        setSaved(
          submitted.published
            ? "TEST event published locally. Open it below to buy a test ticket."
            : "Submitted for administrator review",
        );
        notify(
          submitted.published
            ? "TEST event published locally. No real sales."
            : "Event submitted for review. Sales remain disabled.",
        );
      }
    } catch (e: any) {
      if (e.fieldErrors) reject(e.fieldErrors);
      else setError(e.message);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  async function uploadPublicImage(file: File): Promise<string> {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 4_000_000
    )
      throw Error("Choose a PNG, JPG or WebP image up to 4 MB.");
    if (requestLock.current)
      throw Error("Wait for the current save or upload to finish.");
    requestLock.current = true;
    setBusy(true);
    setDirty(true);
    setSaved("");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      return result.path;
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  async function upload(file: File, key: string) {
    if (requestLock.current) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 4_000_000 ||
      !file.size
    ) {
      setErrors((old) => ({
        ...old,
        [key]: "Choose a PNG, JPG or WebP image up to 4 MB.",
      }));
      setFocusKey(key);
      return;
    }
    requestLock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload", {
          method: "POST",
          body: data,
        }),
        result = await response.json();
      if (!response.ok) throw Error(result.error);
      update(
        key,
        key === "supportingImages"
          ? [...form.supportingImages, result.path]
          : result.path,
      );
    } catch (e: any) {
      setErrors((old) => ({ ...old, [key]: e.message }));
      setFocusKey(key);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  const fieldError = (key: string) =>
    errors[key] && (
      <small id={`${key}-error`} className="creator-field-error">
        {errors[key]}
      </small>
    );
  const input = (label: string, k: string, type = "text", extra: any = {}) => (
    <label key={k} htmlFor={k}>
      {label}
      <input
        id={k}
        name={k}
        type={type}
        value={form[k]}
        onChange={(e) =>
          update(k, type === "number" ? Number(e.target.value) : e.target.value)
        }
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
        {...extra}
      />
      {fieldError(k)}
    </label>
  );
  const select = (
    label: string,
    k: string,
    options: readonly string[],
    labels: Record<string, string> = {},
  ) => (
    <label htmlFor={k}>
      {label}
      <select
        id={k}
        name={k}
        value={form[k]}
        onChange={(e) => update(k, e.target.value)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {labels[v] || v}
          </option>
        ))}
      </select>
      {fieldError(k)}
    </label>
  );
  const ticketInput = (
    label: string,
    i: number,
    k: string,
    type = "text",
    extra: any = {},
  ) => {
    const key = `tier-${i}-${k}`;
    return (
      <label htmlFor={key}>
        {label}
        <input
          id={key}
          name={key}
          type={type}
          value={form.tiers[i][k]}
          onChange={(e) =>
            listUpdate(
              "tiers",
              i,
              k,
              type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
          {...extra}
        />
        {fieldError(key)}
      </label>
    );
  };
  const artwork = (key: string, label: string, optional = false) => (
    <div className={`creator-artwork creator-artwork-${key}`}>
      {form[key] ? (
        <img
          src={form[key]}
          width={key === "image" ? 425 : 1440}
          height={key === "image" ? 601 : 450}
          alt={`${label} preview`}
        />
      ) : (
        <div className="creator-artwork-empty">
          <ImagePlus size={24} aria-hidden="true" />
          <span>{label}</span>
        </div>
      )}
      <label htmlFor={key}>
        {form[key] ? `Replace ${label.toLowerCase()}` : label}
        {optional ? " (optional)" : ""}
        <input
          id={key}
          name={key}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={!!errors[key]}
          aria-describedby={`${key}-help${errors[key] ? ` ${key}-error` : ""}`}
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0], key);
            e.target.value = "";
          }}
        />
        <small id={`${key}-help`}>
          PNG, JPG or WebP · Up to 4 MB.{" "}
          {key === "image"
            ? "Portrait 3:4 works best."
            : "Wide 16:5 works best."}
        </small>
        {fieldError(key)}
      </label>
      {optional && form[key] && (
        <button
          type="button"
          className="text-button"
          onClick={() => update(key, "")}
        >
          Remove banner
        </button>
      )}
    </div>
  );
  if (!ready)
    return (
      <section className="page-width setup-page creator-page">
        <h1>
          {error
            ? "Event workspace unavailable"
            : "Opening your event workspace…"}
        </h1>
        <p role={error ? "alert" : "status"}>
          {error || "Your tickets, friends and settings stay on this account."}
        </p>
        {error && (
          <button
            className="button secondary"
            onClick={() => location.reload()}
          >
            Try again
          </button>
        )}
      </section>
    );
  return (
    <div className="page-width setup-page creator-page">
      <header className="creator-heading">
        <Link href="/organizer">
          <ArrowLeft size={16} aria-hidden="true" />
          Organizer Studio
        </Link>
        <div>
          <h1>{record ? "Edit your event" : "Create an event"}</h1>
          <span className="setup-state">
            {record?.status?.toLowerCase().replaceAll("_", " ") || "New draft"}
          </span>
        </div>
      </header>
      <nav className="creator-progress" aria-label="Event setup steps">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={busy || i > step}
            aria-current={i === step ? "step" : undefined}
            onClick={() => {
              setStep(i);
              setErrors({});
              setError("");
            }}
          >
            <span>
              {i < step ? <Check size={15} aria-hidden="true" /> : i + 1}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="setup-editor creator-editor">
        <div className="creator-step-heading">
          <h2 tabIndex={-1} ref={heading}>
            {steps[step]}
          </h2>
          <p>
            {step === 0
              ? "Start with the essentials. You can save a draft anytime."
              : step === 1
                ? "Choose how your guests join."
                : "Give your event a face, then send it for review."}
          </p>
        </div>
        {record?.configurationStatus === "UNCONFIRMED" && (
          <p className="setup-notice">
            Historical details are unconfirmed. Publication remains blocked.
          </p>
        )}
        {lock && (
          <p className="setup-notice" role="status">
            {record.status === "PENDING_REVIEW"
              ? "Your event is awaiting independent review. Editing is paused."
              : "This event is locked for editing."}
          </p>
        )}
        {error && (
          <p className="setup-error" role="alert">
            {error}
          </p>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="creator-error-summary" role="alert">
            <p>Complete these requirements before continuing:</p>
            <ul>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setStep(firstInvalidStep({ [key]: message }));
                      setFocusKey(key);
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form
          noValidate
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void persist(step === 3 ? "submit" : "next");
          }}
        >
          <fieldset disabled={busy || !!lock}>
            {step === 0 && (
              <>
                <div className="setup-fields">
                  {input("Event name", "title", "text", { maxLength: 100 })}
                  {select("Category", "category", eventCategories)}
                </div>
                <div className="setup-fields">
                  {input(
                    "Start date and time",
                    "startsLocal",
                    "datetime-local",
                  )}
                  {input("End date and time", "endsLocal", "datetime-local")}
                </div>
                <div className="creator-timezone">
                  {input("Time zone", "timezone", "text", {
                    list: "creator-timezones",
                  })}
                  <datalist id="creator-timezones">
                    {[
                      "Asia/Kuala_Lumpur",
                      "Asia/Singapore",
                      "Asia/Bangkok",
                      "Asia/Jakarta",
                      "Europe/London",
                      "America/New_York",
                    ].map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </datalist>
                </div>
                <label>
                  Location type
                  <select
                    aria-label="Location type"
                    value={form.pageDesign.venueMode || "PHYSICAL"}
                    onChange={(e) => {
                      const mode = e.target.value;
                      setForm((f: any) => ({
                        ...f,
                        pageDesign: { ...f.pageDesign, venueMode: mode },
                        ...(mode === "TBA"
                          ? {
                              venue: "To be announced",
                              locationVisibility: "HIDDEN",
                            }
                          : mode === "PRIVATE"
                            ? { locationVisibility: "HIDDEN" }
                            : {}),
                      }));
                      setDirty(true);
                    }}
                  >
                    <option value="PHYSICAL">Physical venue</option>
                    <option value="TBA">To be announced</option>
                    <option value="PRIVATE">
                      Private venue — exact address protected
                    </option>
                  </select>
                </label>
                {input(
                  "Minimum age (0 for no specific restriction)",
                  "age",
                  "number",
                  { min: 0, max: 99 },
                )}
                <div className="setup-fields">
                  {input("City", "city", "text", { maxLength: 80 })}
                  {input(
                    form.access === "PUBLIC"
                      ? "Venue or approximate area"
                      : "Approximate area (safe to share)",
                    "venue",
                    "text",
                    { maxLength: 160 },
                  )}
                </div>
                <label htmlFor="shortDescription">
                  Short description
                  <textarea
                    aria-label="Short description"
                    id="shortDescription"
                    name="shortDescription"
                    rows={3}
                    maxLength={240}
                    value={form.shortDescription}
                    onChange={(e) => update("shortDescription", e.target.value)}
                    aria-invalid={!!errors.shortDescription}
                    aria-describedby={
                      errors.shortDescription
                        ? "shortDescription-error"
                        : undefined
                    }
                  />
                  {fieldError("shortDescription")}
                  <small className="creator-counter">
                    {form.shortDescription.length}/240
                  </small>
                </label>
                {select(
                  "Event type",
                  "access",
                  ["PUBLIC", "PRIVATE", "INVITATION_ONLY"],
                  {
                    PUBLIC: "Public",
                    PRIVATE: "Private",
                    INVITATION_ONLY: "Invitation only",
                  },
                )}
                {form.access !== "PUBLIC" && (
                  <p className="setup-help">
                    Only authorized guests can open a private event. Exact
                    addresses stay hidden until the required checks are
                    complete.
                  </p>
                )}
                <details className="creator-options">
                  <summary>More event details</summary>
                  <div className="creator-option-fields">
                    <label>
                      Tags
                      <input
                        value={form.pageDesign.tags || ""}
                        maxLength={240}
                        placeholder="Music, food, workshop…"
                        onChange={(e) =>
                          update("pageDesign", {
                            ...form.pageDesign,
                            tags: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Additional venue directions
                      <textarea
                        value={form.pageDesign.directions || ""}
                        maxLength={1000}
                        onChange={(e) =>
                          update("pageDesign", {
                            ...form.pageDesign,
                            directions: e.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="setup-fields">
                      {input("Music genre (optional)", "genre", "text", {
                        maxLength: 80,
                      })}
                      {input("Subcategory (optional)", "subcategory", "text", {
                        maxLength: 80,
                      })}
                      {select(
                        "Location visibility",
                        "locationVisibility",
                        ["HIDDEN", "APPROXIMATE", "PUBLIC"],
                        {
                          HIDDEN: "Hidden until confirmed",
                          APPROXIMATE: "Approximate area only",
                          PUBLIC: "Public venue (public events only)",
                        },
                      )}
                    </div>
                    {input(
                      "Private address or online joining link (optional)",
                      "privateVenue",
                      "text",
                      { maxLength: 500 },
                    )}
                    <label>
                      Private entry instructions (confirmed guests only)
                      <textarea
                        value={form.entryInstructions}
                        maxLength={3000}
                        onChange={(e) =>
                          update("entryInstructions", e.target.value)
                        }
                      />
                    </label>
                    {form.access === "PUBLIC" &&
                      form.locationVisibility === "PUBLIC" &&
                      form.venue && (
                        <a
                          href={
                            "https://www.google.com/maps/search/?api=1&query=" +
                            encodeURIComponent(form.venue + " " + form.city)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Check public venue on Google Maps (new tab)
                        </a>
                      )}
                    <p className="setup-help">
                      For online events, use “Online” as the city and “Online
                      event” as the venue. Joining links belong in the private
                      field.
                    </p>
                    <div className="setup-fields">
                      {input("Map latitude (optional)", "latitude", "number", {
                        min: -90,
                        max: 90,
                        step: "any",
                      })}
                      {input(
                        "Map longitude (optional)",
                        "longitude",
                        "number",
                        { min: -180, max: 180, step: "any" },
                      )}
                    </div>
                    {[
                      [
                        "approvalRequired",
                        "Review registrations before admission",
                      ],
                      [
                        "invitationsEnabled",
                        "Enable account-bound invitations",
                      ],
                      ["idCheckRequired", "Check photo ID at entry"],
                    ].map(([k, label]) => (
                      <label className="setup-check" key={k}>
                        <input
                          name={k}
                          type="checkbox"
                          checked={form[k]}
                          onChange={(e) => update(k, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </details>
                <details className="creator-options">
                  <summary>Registration questions & entry options</summary>
                  <div className="creator-option-fields">
                    <EventQuestions
                      form={form}
                      update={update}
                      listUpdate={listUpdate}
                      setError={setError}
                      errors={errors}
                    />
                  </div>
                </details>
                <p className="creator-account">
                  Organized by {setup.identity?.name || user.name}.{" "}
                  <Link href="/organizer?tab=Settings">
                    Edit organizer name
                  </Link>
                </p>
              </>
            )}
            {step === 1 && (
              <>
                {input("Total event capacity", "capacity", "number", {
                  min: 1,
                  max: 100000,
                })}
                <div id="tiers" tabIndex={-1}>
                  {fieldError("tiers")}
                </div>
                {form.tiers.map((t: any, i: number) => (
                  <section
                    className="creator-tier"
                    key={t.id || i}
                    aria-label={`Ticket type ${i + 1}`}
                  >
                    <div className="setup-row">
                      <h3>Ticket type {i + 1}</h3>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove ticket ${i + 1}`}
                        onClick={() =>
                          update(
                            "tiers",
                            form.tiers.filter((_: any, j: number) => i !== j),
                          )
                        }
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                    <fieldset className="creator-ticket-mode">
                      <legend>Ticket option</legend>
                      {["FREE", "PAID"].map((mode) => (
                        <label key={mode}>
                          <input
                            type="radio"
                            name={`pricing-${i}`}
                            value={mode}
                            checked={
                              (t.pricingMode ||
                                (t.price > 0 ? "PAID" : "FREE")) === mode
                            }
                            onChange={() =>
                              update(
                                "tiers",
                                form.tiers.map((x: any, j: number) =>
                                  j === i
                                    ? {
                                        ...x,
                                        pricingMode: mode,
                                        name:
                                          mode === "PAID" &&
                                          x.name === "Free RSVP"
                                            ? "General Admission"
                                            : x.name,
                                        price: mode === "FREE" ? 0 : x.price,
                                        priceInput:
                                          mode === "FREE"
                                            ? "0.00"
                                            : x.priceInput,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          {mode === "FREE" ? "Free RSVP" : "Paid ticket"}
                        </label>
                      ))}
                    </fieldset>
                    <div className="setup-fields">
                      {ticketInput("Ticket name", i, "name", "text", {
                        maxLength: 80,
                      })}
                      {(t.pricingMode === "PAID" || t.price > 0) && (
                        <label htmlFor={`tier-${i}-price`}>
                          Price (MYR)
                          <input
                            id={`tier-${i}-price`}
                            name={`tier-${i}-price`}
                            inputMode="decimal"
                            value={t.priceInput ?? (t.price / 100).toFixed(2)}
                            aria-invalid={!!errors[`tier-${i}-price`]}
                            aria-describedby={
                              errors[`tier-${i}-price`]
                                ? `tier-${i}-price-error`
                                : undefined
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              let price = 0;
                              try {
                                price = decimalToSen(value);
                              } catch {}
                              update(
                                "tiers",
                                form.tiers.map((x: any, j: number) =>
                                  i === j
                                    ? { ...x, priceInput: value, price }
                                    : x,
                                ),
                              );
                            }}
                          />
                          {fieldError(`tier-${i}-price`)}
                        </label>
                      )}
                      {ticketInput("Quantity", i, "quantity", "number", {
                        min: 1,
                        max: 100000,
                      })}
                      {ticketInput(
                        "Maximum per booking",
                        i,
                        "maxPerOrder",
                        "number",
                        { min: 1, max: 10 },
                      )}
                    </div>
                    <details className="creator-options">
                      <summary>More ticket options</summary>
                      <label
                        className="creator-field"
                        htmlFor={`tier-${i}-discount`}
                      >
                        Discount per ticket (MYR)
                        <input
                          id={`tier-${i}-discount`}
                          name={`ticket-${i}-discount`}
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.01"
                          value={(t.discount || 0) / 100}
                          onChange={(e) => {
                            let discount = t.discount || 0;
                            try {
                              discount = decimalToSen(e.target.value || "0");
                            } catch {
                              return;
                            }
                            update(
                              "tiers",
                              form.tiers.map((x: any, j: number) =>
                                i === j ? { ...x, discount } : x,
                              ),
                            );
                          }}
                          aria-invalid={!!errors[`tier-${i}-discount`]}
                          aria-describedby={
                            errors[`tier-${i}-discount`]
                              ? `tier-${i}-discount-error`
                              : undefined
                          }
                        />
                        {fieldError(`tier-${i}-discount`)}
                      </label>
                      <div className="creator-option-fields">
                        <label>
                          Ticket section
                          <input
                            maxLength={80}
                            value={t.section || ""}
                            onChange={(e) =>
                              listUpdate("tiers", i, "section", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Ticket image
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file)
                                try {
                                  listUpdate(
                                    "tiers",
                                    i,
                                    "image",
                                    await uploadPublicImage(file),
                                  );
                                } catch (e: any) {
                                  setError(e.message);
                                }
                            }}
                          />
                        </label>
                        {t.image && (
                          <>
                            <img
                              src={t.image}
                              alt={`${t.name} ticket`}
                              width={100}
                              height={100}
                            />
                            <button
                              type="button"
                              className="text-button"
                              onClick={() =>
                                listUpdate("tiers", i, "image", "")
                              }
                            >
                              Remove ticket image
                            </button>
                          </>
                        )}
                        <label className="setup-check">
                          <input
                            type="checkbox"
                            checked={!!t.showRemaining}
                            onChange={(e) =>
                              listUpdate(
                                "tiers",
                                i,
                                "showRemaining",
                                e.target.checked,
                              )
                            }
                          />
                          Display remaining ticket count
                        </label>
                        <p className="setup-help">
                          Valid for this event’s date and time. Multi-session
                          tickets are not supported.
                        </p>
                        <div className="setup-actions">
                          <button
                            type="button"
                            className="button secondary"
                            disabled={form.tiers.length >= 10}
                            onClick={() => {
                              const copy = {
                                ...t,
                                name: t.name + " copy",
                                sortOrder: form.tiers.length,
                              };
                              delete copy.id;
                              update("tiers", [...form.tiers, copy]);
                            }}
                          >
                            Duplicate ticket
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={i === 0}
                            onClick={() => {
                              const tiers = [...form.tiers];
                              [tiers[i - 1], tiers[i]] = [
                                tiers[i],
                                tiers[i - 1],
                              ];
                              update(
                                "tiers",
                                tiers.map((x, j) => ({ ...x, sortOrder: j })),
                              );
                            }}
                          >
                            Move ticket up
                          </button>
                        </div>

                        <div className="setup-fields">
                          {ticketInput(
                            "Minimum per booking",
                            i,
                            "minPerOrder",
                            "number",
                            { min: 1, max: 10 },
                          )}
                          {ticketInput(
                            "Ticket description",
                            i,
                            "description",
                            "text",
                            { maxLength: 500 },
                          )}
                          <label htmlFor={`tier-${i}-availability`}>
                            Availability
                            <select
                              id={`tier-${i}-availability`}
                              name={`tier-${i}-availability`}
                              aria-invalid={!!errors[`tier-${i}-availability`]}
                              aria-describedby={
                                errors[`tier-${i}-availability`]
                                  ? `tier-${i}-availability-error`
                                  : undefined
                              }
                              value={t.availability}
                              onChange={(e) =>
                                listUpdate(
                                  "tiers",
                                  i,
                                  "availability",
                                  e.target.value,
                                )
                              }
                            >
                              {["AVAILABLE", "HIDDEN", "PAUSED"].map((v) => (
                                <option key={v} value={v}>
                                  {v === "AVAILABLE"
                                    ? "Available"
                                    : v === "HIDDEN"
                                      ? "Hidden"
                                      : "Paused"}
                                </option>
                              ))}
                            </select>
                            {fieldError(`tier-${i}-availability`)}
                          </label>
                          {["saleStart", "saleEnd"].map((k) => (
                            <label htmlFor={`tier-${i}-${k}`} key={k}>
                              {k === "saleStart" ? "Sales open" : "Sales close"}{" "}
                              ({form.timezone})
                              <input
                                id={`tier-${i}-${k}`}
                                name={`tier-${i}-${k}`}
                                aria-invalid={!!errors[`tier-${i}-${k}`]}
                                aria-describedby={
                                  errors[`tier-${i}-${k}`]
                                    ? `tier-${i}-${k}-error`
                                    : undefined
                                }
                                type="datetime-local"
                                value={
                                  t[k] ? localDateTime(t[k], form.timezone) : ""
                                }
                                onChange={(e) => {
                                  try {
                                    listUpdate(
                                      "tiers",
                                      i,
                                      k,
                                      e.target.value
                                        ? zonedInstant(
                                            e.target.value,
                                            form.timezone,
                                          ).toISOString()
                                        : null,
                                    );
                                  } catch {
                                    setErrors((old) => ({
                                      ...old,
                                      [`tier-${i}-${k}`]:
                                        "Choose a valid date and time.",
                                    }));
                                  }
                                }}
                              />
                              {fieldError(`tier-${i}-${k}`)}
                            </label>
                          ))}
                        </div>
                        <div className="setup-actions">
                          <button
                            type="button"
                            className="text-button"
                            disabled={i === 0}
                            onClick={() => {
                              const tiers = [...form.tiers];
                              [tiers[i - 1], tiers[i]] = [
                                tiers[i],
                                tiers[i - 1],
                              ];
                              update(
                                "tiers",
                                tiers.map((x, j) => ({ ...x, sortOrder: j })),
                              );
                            }}
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={i === form.tiers.length - 1}
                            onClick={() => {
                              const tiers = [...form.tiers];
                              [tiers[i + 1], tiers[i]] = [
                                tiers[i],
                                tiers[i + 1],
                              ];
                              update(
                                "tiers",
                                tiers.map((x, j) => ({ ...x, sortOrder: j })),
                              );
                            }}
                          >
                            Move down
                          </button>
                        </div>
                      </div>
                    </details>
                  </section>
                ))}
                <button
                  type="button"
                  className="button secondary creator-add-ticket"
                  disabled={form.tiers.length >= 10}
                  onClick={() =>
                    update("tiers", [...form.tiers, newTier(form.tiers.length)])
                  }
                >
                  <Plus size={17} aria-hidden="true" />
                  Add ticket type
                </button>
                <p className="setup-help">
                  {form.tiers.reduce((n: number, t: any) => n + t.quantity, 0)}{" "}
                  of {form.capacity} places allocated.
                </p>
                <fieldset
                  className="fee-policy"
                  disabled={busy || !!record?._count?.bookings}
                >
                  <legend>Who pays the 5% MixerMates fee?</legend>
                  {[
                    ["ABSORB", "Organizer absorbs it."],
                    ["CUSTOMER", "Customer pays it."],
                  ].map(([value, label]) => (
                    <label className="fee-policy-choice" key={value}>
                      <input
                        type="radio"
                        name="platformFeePolicy"
                        value={value}
                        checked={form.platformFeePolicy === value}
                        onChange={() => update("platformFeePolicy", value)}
                      />
                      {label}
                    </label>
                  ))}
                  <p>
                    Free tickets have no platform fee. Gateway fees are always
                    paid by the organizer.
                  </p>
                  {!!record?._count?.bookings && (
                    <p>
                      Fee settings are locked after a booking. Existing bookings
                      keep their original terms.
                    </p>
                  )}
                </fieldset>
                <div aria-live="polite" aria-atomic="true">
                  {form.tiers
                    .filter((t: any) => Number.isSafeInteger(t.price))
                    .map((t: any, i: number) => (
                      <section
                        key={t.id || i}
                        aria-label={`Fee preview for ${t.name || "ticket"}`}
                      >
                        <h3>
                          {t.name || `Ticket ${i + 1}`} · per-ticket preview
                        </h3>
                        <FeeBreakdown
                          pricing={ticketPricing(
                            t.price,
                            1,
                            form.platformFeePolicy,
                            Math.min(t.discount || 0, t.price),
                          )}
                          organizer
                        />
                      </section>
                    ))}
                </div>
                <p className="setup-help">
                  Direct QR payments go to you. MixerMates commission is
                  recorded as owed; it is not automatically withheld. Real
                  collection remains inactive.
                </p>
                {setup.creatorReadiness?.simulatorEnabled && (
                  <section className="creator-options creator-paid-requirements">
                    <h3>Payment method</h3>
                    <div className="creator-option-fields">
                      <label htmlFor="paymentMode">
                        Payment method
                        <select
                          id="paymentMode"
                          name="paymentMode"
                          value={form.paymentMode}
                          onChange={(e) => {
                            const mode = e.target.value;
                            setForm((f: any) => ({
                              ...f,
                              paymentMode: mode,
                              ...(mode === "TEST_SIMULATOR"
                                ? {
                                    paymentDestinationId: null,
                                    policies: f.policies || TEST_EVENT_POLICY,
                                  }
                                : {}),
                            }));
                            setErrors({});
                            setDirty(true);
                          }}
                        >
                          <option value="TEST_SIMULATOR">
                            Test Payment Simulator
                          </option>
                          <option value="ORGANIZER_QR">
                            Manual QR payment review
                          </option>
                        </select>
                      </label>
                      <p className="setup-help">
                        {form.paymentMode === "TEST_SIMULATOR"
                          ? "TEST MODE. No bank account, payment QR or receipt needed. Submit for independent review, then buy a fictional ticket after approval."
                          : "Advanced test: an approved fictional recipient and independent payment review are required."}
                      </p>
                    </div>
                  </section>
                )}
                {form.tiers.some((t: any) => t.price > 0) && (
                  <p className="setup-help">
                    You can design and submit without a payment recipient.
                    Payment verification is separate and required before
                    accepting actual funds. Real sales remain disabled.
                  </p>
                )}
              </>
            )}
            {step === 2 && (
              <EventPageDesigner
                form={form}
                update={update}
                organizer={{ name: setup.identity?.name || user.name }}
                uploadImage={uploadPublicImage}
                errors={errors}
              />
            )}
            {step === 3 && (
              <section className="creator-review">
                <h3>Ready for review?</h3>
                {record && (
                  <Link
                    className="button secondary"
                    href={`/events/${record.slug}?preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preview Event (new tab)
                  </Link>
                )}
                <p>
                  Check your artwork, details, tickets and policies below. No
                  bank account is needed to submit. Approval does not authorize
                  real sales.
                </p>
                <p>
                  5% MixerMates fee:{" "}
                  {form.platformFeePolicy === "CUSTOMER"
                    ? "Customer pays"
                    : "Organizer absorbs"}
                  . Gateway charges remain organizer-borne.
                </p>
                <EventPageContent
                  preview
                  event={{
                    ...form,
                    organizer: { name: setup.identity?.name || user.name },
                    testOnly: true,
                  }}
                />
              </section>
            )}
          </fieldset>
          <div className="creator-footer">
            <button
              type="button"
              className="button secondary"
              disabled={busy || !!lock}
              onClick={() => void persist("save")}
            >
              {busy ? (
                <LoaderCircle
                  size={16}
                  className="creator-spinner"
                  aria-hidden="true"
                />
              ) : null}
              Save Draft
            </button>
            <div>
              {step > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setStep(step - 1);
                    setErrors({});
                    setError("");
                  }}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </button>
              )}
              <button
                type="submit"
                className="button primary"
                disabled={busy || !!lock}
              >
                {busy ? "Saving…" : step === 3 ? "Submit for Approval" : "Next"}
                {!busy && step < 3 && (
                  <ArrowRight size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <p className="setup-save-state" role="status">
            {saved ||
              (dirty
                ? "Unsaved changes"
                : "Your draft is private. Save it to continue later.")}
          </p>
          {record && (
            <Link href={`/events/${record.slug}?preview=1`}>
              {record.status === "PUBLISHED"
                ? "Open TEST event & buy tickets"
                : "Preview saved event"}
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
