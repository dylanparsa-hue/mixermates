"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { readDesign } from "@/lib/page-design";
import { EventPageContent, CroppedArtwork } from "./event-page-content";
const RichEditor = dynamic(() => import("./rich-event-editor"), {
  ssr: false,
  loading: () => <p role="status">Loading editor…</p>,
});
export default function EventPageDesigner({
  form,
  update,
  organizer,
  uploadImage,
  errors,
}: any) {
  const [mode, setMode] = useState("Edit"),
    [width, setWidth] = useState("Desktop"),
    [error, setError] = useState("");
  const d = readDesign(form.pageDesign),
    set = (key: string, value: any) =>
      update("pageDesign", { ...d, [key]: value });
  const move = (index: number, delta: number) => {
    const next = [...d.sections];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    set("sections", next);
  };
  async function asset(file: File, key: string) {
    try {
      setError("");
      update(key, await uploadImage(file));
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <div
      className="event-designer"
      id="pageDesign"
      tabIndex={-1}
      aria-describedby={errors.pageDesign ? "pageDesign-error" : undefined}
    >
      {errors.pageDesign && (
        <p id="pageDesign-error" role="alert" className="creator-field-error">
          {errors.pageDesign}
        </p>
      )}
      <div className="designer-toolbar">
        <div className="designer-switch" aria-label="Designer view">
          {["Edit", "Preview"].map((v) => (
            <button
              type="button"
              key={v}
              className="button secondary"
              aria-pressed={mode === v}
              onClick={() => setMode(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="designer-switch" aria-label="Preview width">
          {["Desktop", "Mobile"].map((v) => (
            <button
              type="button"
              key={v}
              className="button secondary"
              aria-pressed={width === v}
              onClick={() => setWidth(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className={`designer-workspace view-${mode.toLowerCase()}`}>
        <aside
          className="designer-controls"
          aria-label="Event page editing controls"
        >
          <h3>Make it your event</h3>
          <p>
            Changes appear in the customer preview. Save Draft to keep them.
          </p>
          {(
            [
              ["coverImage", "Banner", "banner"],
              ["image", "Poster", "poster"],
            ] as const
          ).map(([key, label, kind]) => (
            <details key={key} className="designer-disclosure" open>
              <summary>{label}</summary>
              {form[key] && (
                <CroppedArtwork
                  src={form[key]}
                  alt={`${label} crop preview`}
                  crop={d[kind]}
                  kind={kind}
                />
              )}
              <label htmlFor={key}>
                {form[key]
                  ? `Replace ${label.toLowerCase()}`
                  : `Upload ${label.toLowerCase()}`}
                <input
                  id={key}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `${key}-error` : undefined}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void asset(file, key);
                  }}
                />
              </label>
              {errors[key] && (
                <small id={`${key}-error`} className="creator-field-error">
                  {errors[key]}
                </small>
              )}
              <small>
                {kind === "banner" ? "1440 × 450 px" : "425 × 601 px"}{" "}
                recommended. JPG, PNG or WebP; up to 4 MB.
              </small>
              {form[key] && (
                <>
                  <div className="crop-controls">
                    {(
                      [
                        ["x", "Horizontal position", 0, 100, 1],
                        ["y", "Vertical position", 0, 100, 1],
                        ["zoom", "Crop zoom", 1, 3, 0.05],
                      ] as const
                    ).map(([axis, text, min, max, step]) => (
                      <label key={axis}>
                        {label} {text.toLowerCase()}
                        <input
                          aria-label={`${label} ${text.toLowerCase()}`}
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={d[kind][axis]}
                          onChange={(e) =>
                            set(kind, {
                              ...d[kind],
                              [axis]: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => update(key, "")}
                  >
                    Remove {label.toLowerCase()}
                  </button>
                </>
              )}
            </details>
          ))}
          <details className="designer-disclosure">
            <summary>Choose provided artwork</summary>
            <label>
              Poster artwork
              <select
                value={form.image.startsWith("/images/") ? form.image : ""}
                onChange={(e) => update("image", e.target.value)}
              >
                <option value="">Choose artwork</option>
                {[
                  "halloween",
                  "neon",
                  "sunset",
                  "festival",
                  "live",
                  "rooftop",
                ].map((n) => (
                  <option key={n} value={`/images/${n}.jpg`}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </details>
          <label>
            Event accent
            <select
              value={d.accent}
              onChange={(e) => set("accent", e.target.value)}
            >
              <option value="rose">MixerMates rose</option>
              <option value="violet">Violet</option>
              <option value="ocean">Ocean</option>
              <option value="amber">Amber</option>
            </select>
          </label>
          <label>
            Page background
            <select
              value={d.background}
              onChange={(e) => set("background", e.target.value)}
            >
              <option value="plain">Plain</option>
              <option value="soft">Soft surface</option>
            </select>
          </label>
          <h3>About the event</h3>
          <RichEditor
            label="Event description"
            value={d.about}
            uploadImage={uploadImage}
            onChange={(value) => set("about", value)}
          />
          <h3>Page sections</h3>
          {d.sections.map((s, i) => (
            <details key={s.id} className="designer-disclosure" open>
              <summary>{s.title}</summary>
              <label>
                Section title
                <input
                  value={s.title}
                  maxLength={80}
                  onChange={(e) =>
                    set(
                      "sections",
                      d.sections.map((x) =>
                        x.id === s.id ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <RichEditor
                label={`${s.title} content`}
                value={s.content}
                uploadImage={uploadImage}
                onChange={(value) =>
                  set(
                    "sections",
                    d.sections.map((x) =>
                      x.id === s.id ? { ...x, content: value } : x,
                    ),
                  )
                }
              />
              <div className="designer-section-actions">
                <button
                  type="button"
                  className="button secondary"
                  aria-label={`Move ${s.title} up`}
                  disabled={!i}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="button secondary"
                  aria-label={`Move ${s.title} down`}
                  disabled={i === d.sections.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (confirm(`Remove ${s.title}?`))
                      set(
                        "sections",
                        d.sections.filter((x) => x.id !== s.id),
                      );
                  }}
                >
                  <Trash2 size={16} />
                  Remove section
                </button>
              </div>
            </details>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={d.sections.length >= 8}
            onClick={() =>
              set("sections", [
                ...d.sections,
                {
                  id: crypto.randomUUID(),
                  title: "What to expect",
                  content: { type: "doc", content: [{ type: "paragraph" }] },
                },
              ])
            }
          >
            <Plus size={17} />
            Add page section
          </button>
          <p className="setup-help">
            Entry policies, registration requirements and fee disclosures always
            remain on the customer page.
          </p>
        </aside>
        <section
          className={`designer-preview viewport-${width.toLowerCase()}`}
          aria-label="Live customer event preview"
        >
          <EventPageContent
            preview
            event={{ ...form, organizer, testOnly: true }}
          />
        </section>
      </div>
    </div>
  );
}
