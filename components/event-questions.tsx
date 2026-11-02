"use client";
import { Plus, Trash2 } from "lucide-react";
import {
  registrationTypes,
  decimalToSen,
  currencyMYR,
} from "@/lib/event-config";
export function EventQuestions({
  form,
  update,
  listUpdate,
  setError,
  errors,
}: any) {
  return (
    <>
      <p>
        Full name, email and ticket quantity are standard. Add event-specific
        questions below.
      </p>
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          update("fields", [
            ...form.fields,
            {
              label: "",
              type: "text",
              required: false,
              hidden: false,
              options: "",
              condition: "",
            },
          ])
        }
        disabled={form.fields.length >= 25}
      >
        <Plus size={15} aria-hidden="true" />
        Add question
      </button>
      {form.fields.map((q: any, i: number) => (
        <section className="setup-list-item" key={q.id || i}>
          <div className="setup-row">
            <h3>Question {i + 1}</h3>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove question ${i + 1}`}
              onClick={() =>
                update(
                  "fields",
                  form.fields.filter((_: any, j: number) => j !== i),
                )
              }
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
          <label>
            Question label
            <input
              id={`question-${i}`}
              name={`question-${i}`}
              aria-invalid={!!errors[`question-${i}`]}
              aria-describedby={
                errors[`question-${i}`] ? `question-${i}-error` : undefined
              }
              value={q.label}
              maxLength={100}
              onChange={(e) => listUpdate("fields", i, "label", e.target.value)}
            />
          </label>
          {errors[`question-${i}`] && (
            <small id={`question-${i}-error`} className="creator-field-error">
              {errors[`question-${i}`]}
            </small>
          )}
          <div className="setup-fields">
            <label>
              Answer type
              <select
                value={q.type}
                onChange={(e) =>
                  listUpdate("fields", i, "type", e.target.value)
                }
              >
                {registrationTypes.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Visibility
              <select
                value={
                  q.hidden ? "hidden" : q.required ? "required" : "optional"
                }
                onChange={(e) =>
                  update(
                    "fields",
                    form.fields.map((f: any, j: number) =>
                      j === i
                        ? {
                            ...f,
                            hidden: e.target.value === "hidden",
                            required: e.target.value === "required",
                          }
                        : f,
                    ),
                  )
                }
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
          {["select", "radio"].includes(q.type) && (
            <label>
              Options, separated by commas
              <input
                value={q.options}
                onChange={(e) =>
                  listUpdate("fields", i, "options", e.target.value)
                }
              />
            </label>
          )}
          <label>
            Show for entry option (optional)
            <select
              value={q.condition}
              onChange={(e) =>
                listUpdate("fields", i, "condition", e.target.value)
              }
            >
              <option value="">All entries</option>
              {form.entryOptions.map((o: any) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      ))}
      <details>
        <summary>Entry options</summary>
        <p>
          Pricing relationships must be confirmed before checkout. Unconfirmed
          values stay explicit.
        </p>
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            update("entryOptions", [
              ...form.entryOptions,
              {
                key: "option-" + crypto.randomUUID().slice(0, 8),
                label: "New entry option",
                price: null,
                relationship: "UNCONFIRMED",
                proofRequired: true,
              },
            ])
          }
        >
          Add entry option
        </button>
        {form.entryOptions.map((o: any, i: number) => (
          <div className="setup-list-item" key={o.key}>
            <label>
              Option name
              <input
                id={`entry-${i}-label`}
                name={`entry-${i}-label`}
                aria-invalid={!!errors[`entry-${i}-label`]}
                aria-describedby={
                  errors[`entry-${i}-label`]
                    ? `entry-${i}-label-error`
                    : undefined
                }
                value={o.label}
                onChange={(e) =>
                  listUpdate("entryOptions", i, "label", e.target.value)
                }
              />
              {errors[`entry-${i}-label`] && (
                <small
                  id={`entry-${i}-label-error`}
                  className="creator-field-error"
                >
                  {errors[`entry-${i}-label`]}
                </small>
              )}
            </label>
            <label>
              Relationship
              <select
                id={`entry-${i}-relationship`}
                name={`entry-${i}-relationship`}
                aria-invalid={!!errors[`entry-${i}-relationship`]}
                aria-describedby={
                  errors[`entry-${i}-relationship`]
                    ? `entry-${i}-relationship-error`
                    : undefined
                }
                value={o.relationship}
                onChange={(e) =>
                  listUpdate("entryOptions", i, "relationship", e.target.value)
                }
              >
                {["UNCONFIRMED", "FEE", "BYOB"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {errors[`entry-${i}-relationship`] && (
                <small
                  id={`entry-${i}-relationship-error`}
                  className="creator-field-error"
                >
                  {errors[`entry-${i}-relationship`]}
                </small>
              )}
            </label>
            <label>
              Entry price in MYR
              <input
                id={`entry-${i}-price`}
                name={`entry-${i}-price`}
                aria-invalid={!!errors[`entry-${i}-price`]}
                aria-describedby={
                  errors[`entry-${i}-price`]
                    ? `entry-${i}-price-error`
                    : undefined
                }
                type="text"
                inputMode="decimal"
                value={
                  o.priceInput ??
                  (o.price === null ? "" : (o.price / 100).toFixed(2))
                }
                onChange={(e) => {
                  const priceInput = e.target.value;
                  let price: number | null = null;
                  try {
                    price = decimalToSen(priceInput);
                  } catch {}
                  update(
                    "entryOptions",
                    form.entryOptions.map((option: any, j: number) =>
                      j === i ? { ...option, price, priceInput } : option,
                    ),
                  );
                }}
              />
              {errors[`entry-${i}-price`] && (
                <small
                  id={`entry-${i}-price-error`}
                  className="creator-field-error"
                >
                  {errors[`entry-${i}-price`]}
                </small>
              )}
            </label>
            <p>
              {o.price === null ? "Price unresolved" : currencyMYR(o.price)} ·
              Proof {o.proofRequired ? "required" : "optional"}
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                update(
                  "entryOptions",
                  form.entryOptions.filter((_: any, j: number) => j !== i),
                )
              }
            >
              Remove option
            </button>
          </div>
        ))}
      </details>
    </>
  );
}
