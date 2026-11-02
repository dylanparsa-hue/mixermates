import {
  eventCategories,
  validTimezone,
  zonedInstant,
  decimalToSen,
} from "./event-config";
export type FieldErrors = Record<string, string>;
export type CreatorReadiness = {
  verification: string;
  approvedDestinationIds: string[];
  paidEventsEnabled: boolean;
  simulatorEnabled?: boolean;
};
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const integer = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
export function paidEventErrors(
  d: any,
  readiness?: CreatorReadiness,
): FieldErrors {
  if (
    !(d.tiers || []).some((t: any) => t.price > 0 || t.pricingMode === "PAID")
  )
    return {};
  const errors: FieldErrors = {};
  // Content review is independent of payment-recipient and sales readiness.
  if (!text(d.policies))
    errors.policies =
      "Add entry and cancellation conditions so guests know the entry rules and what happens if the event is cancelled.";
  return errors;
}
/** Shared feedback; server independently runs this on every advance and again at submission. */
export function eventWizardErrors(
  d: any,
  through: number,
  now = new Date(),
  readiness?: CreatorReadiness,
): FieldErrors {
  const errors: FieldErrors = {};
  if (text(d.title).length < 3 || d.title === "Untitled event")
    errors.title = "Add an event name (at least 3 characters).";
  if (!eventCategories.includes(d.category))
    errors.category = "Choose a category.";
  if (text(d.shortDescription).length < 20)
    errors.shortDescription =
      "Add a short description (at least 20 characters).";
  let start: Date | undefined, end: Date | undefined;
  if (!validTimezone(d.timezone)) errors.timezone = "Choose a valid time zone.";
  try {
    start = zonedInstant(d.startsLocal, d.timezone);
    if (start <= now) errors.startsLocal = "Choose a future date.";
  } catch {
    errors.startsLocal = "Choose a start date and time.";
  }
  try {
    end = zonedInstant(d.endsLocal, d.timezone);
    if (start && end <= start)
      errors.endsLocal = "End time must be after start time.";
  } catch {
    errors.endsLocal = "Choose an end date and time.";
  }
  if (d.age !== undefined && !integer(d.age, 0, 99))
    errors.age = "Choose a minimum age between 0 and 99.";
  if (text(d.city).length < 2) errors.city = "Add a city.";
  if (text(d.venue).length < 2)
    errors.venue = "Add a venue or approximate area.";
  if (!["PUBLIC", "PRIVATE", "INVITATION_ONLY"].includes(d.access))
    errors.access = "Choose public or private.";
  for (const [i, q] of (d.fields || []).entries()) {
    if (text(q.label).length < 2)
      errors[`question-${i}`] = "Add a question or remove it.";
    if (["select", "radio"].includes(q.type) && !text(q.options))
      errors[`question-${i}`] = "Add choices for this question.";
    if (q.hidden && q.required)
      errors[`question-${i}`] =
        "Make this hidden question optional or show it to guests.";
    if (
      q.condition &&
      !(d.entryOptions || []).some((o: any) => o.key === q.condition)
    )
      errors[`question-${i}`] =
        "Choose an existing entry option or show this question for all entries.";
  }
  for (const [i, o] of (d.entryOptions || []).entries()) {
    if (!text(o.label) || text(o.label).length < 2)
      errors[`entry-${i}-label`] = "Add an entry option name.";
    if (!["FEE", "BYOB"].includes(o.relationship))
      errors[`entry-${i}-relationship`] =
        "Choose Fee or BYOB to confirm how this entry option is priced.";
    if (!integer(o.price, 0, 10000000))
      errors[`entry-${i}-price`] =
        "Set this entry option’s price. Use 0 for a free option.";
    if (o.priceInput !== undefined) {
      try {
        if (decimalToSen(o.priceInput) !== o.price) throw Error();
      } catch {
        errors[`entry-${i}-price`] =
          "Use a price with up to 2 decimal places. Use 0 for a free option.";
      }
    }
  }
  if (through < 1) return errors;
  if (!integer(d.capacity, 1, 100000))
    errors.capacity = "Set a capacity between 1 and 100,000.";
  if (!d.tiers?.length) errors.tiers = "Add at least one ticket type.";
  let total = 0;
  const names = new Set<string>();
  for (const [i, t] of (d.tiers || []).entries()) {
    const key = `tier-${i}-`,
      name = text(t.name).toLowerCase();
    if (name.length < 2) errors[key + "name"] = "Add a ticket name.";
    else if (names.has(name))
      errors[key + "name"] = "Use a different ticket name.";
    names.add(name);
    if (!integer(t.quantity, 1, 100000))
      errors[key + "quantity"] = "Add a quantity of at least 1.";
    total += Number(t.quantity) || 0;
    if (!integer(t.maxPerOrder, 1, 10))
      errors[key + "maxPerOrder"] = "Choose 1 to 10 tickets per booking.";
    if (!integer(t.minPerOrder, 1, 10) || t.minPerOrder > t.maxPerOrder)
      errors[key + "minPerOrder"] =
        "Minimum must be between 1 and the booking maximum.";
    if (t.maxPerOrder > t.quantity)
      errors[key + "maxPerOrder"] = "Maximum cannot exceed ticket quantity.";
    if (!integer(t.price, 0, 10000000))
      errors[key + "price"] = "Enter a valid ticket price.";
    if (!integer(t.discount ?? 0, 0, t.price))
      errors[key + "discount"] =
        "Discount must be between zero and the ticket price.";
    if (t.priceInput !== undefined) {
      try {
        if (decimalToSen(t.priceInput) !== t.price) throw Error();
      } catch {
        errors[key + "price"] = "Use a price with up to 2 decimal places.";
      }
    }
    if (t.pricingMode === "PAID" && t.price < 1)
      errors[key + "price"] = "Add a price above RM0 for a paid ticket.";
    if (
      !["AVAILABLE", "HIDDEN", "PAUSED"].includes(t.availability || "AVAILABLE")
    )
      errors[key + "availability"] = "Choose ticket availability.";
    const saleStart = t.saleStart ? new Date(t.saleStart) : null,
      saleEnd = t.saleEnd ? new Date(t.saleEnd) : null;
    if (
      saleStart &&
      (!Number.isFinite(+saleStart) || (start && saleStart >= start))
    )
      errors[key + "saleStart"] = "Sales must start before the event.";
    if (
      saleEnd &&
      (!Number.isFinite(+saleEnd) ||
        (start && saleEnd > start) ||
        (saleStart && saleEnd <= saleStart))
    )
      errors[key + "saleEnd"] =
        "Sales must end after opening and before the event.";
  }
  if (total > d.capacity)
    errors.capacity = "Ticket quantities exceed event capacity.";
  Object.assign(errors, paidEventErrors(d, readiness));
  if (through < 2) return errors;
  if (d.pageDesign?.sections?.some((s: any) => !s.title.trim()))
    errors.pageDesign = "Give every page section a title or remove it.";
  if (!d.image) errors.image = "Upload a valid image or choose artwork.";
  return errors;
}
export function firstInvalidStep(errors: FieldErrors) {
  if (
    Object.keys(errors).some(
      (k) =>
        [
          "title",
          "category",
          "shortDescription",
          "startsLocal",
          "endsLocal",
          "timezone",
          "city",
          "venue",
          "access",
          "age",
          "eventConfiguration",
        ].includes(k) ||
        k.startsWith("entry-") ||
        k.startsWith("question-"),
    )
  )
    return 0;
  if (
    Object.keys(errors).some(
      (k) =>
        k === "paymentDestinationId" ||
        k === "organizerVerification" ||
        k === "paidEvents" ||
        k === "policies" ||
        k === "capacity" ||
        k === "tiers" ||
        k.startsWith("tier-") ||
        k.startsWith("entry-") ||
        k.startsWith("question-"),
    )
  )
    return 1;
  return 2;
}
