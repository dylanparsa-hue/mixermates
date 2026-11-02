export const eventCategories = [
  "Social",
  "Food & Drink",
  "House Party",
  "Private Party",
  "Nightclub",
  "DJ Event",
  "EDM",
  "House Music",
  "Techno",
  "Concert",
  "Live Music",
  "Music Festival",
  "Entertainment",
] as const;
export const eventPresets = [
  "House Party",
  "Nightclub",
  "EDM",
  "House Music",
  "Techno",
  "Halloween",
  "Concert",
  "Festival",
] as const;
export const registrationTypes = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "select",
  "radio",
  "checkbox",
  "file",
  "consent",
] as const;
export const paymentMethods = {
  TOUCH_N_GO: "Touch ’n Go",
  DUITNOW: "DuitNow QR",
  BANK_QR: "Bank QR",
} as const;
export const paymentDisclosure =
  "Payments are made directly to the event organizer using the payment details provided for this event. MixerMates does not hold these funds. Your ticket will be confirmed only after the required payment and registration checks are completed.";
export const currencyMYR = (sen: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    sen / 100,
  );
export function decimalToSen(value: string) {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value))
    throw Error("Enter a non-negative price with up to two decimal places.");
  const [whole, part = ""] = value.split(".");
  const n = Number(whole) * 100 + Number(part.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 10000000)
    throw Error("Ticket price is too large.");
  return n;
}
export function validTimezone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
function parts(date: Date, zone: string) {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function localDateTime(date: Date | string, zone = "Asia/Kuala_Lumpur") {
  return parts(new Date(date), zone);
}
export function zonedInstant(value: string, zone: string) {
  if (!validTimezone(zone)) throw Error("400:Choose a valid timezone.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("400:Enter a valid date and time.");
  const wall = Date.parse(value + "Z");
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 16) !== value
  )
    throw Error("400:Enter a valid date and time.");
  let instant = wall;
  for (let i = 0; i < 3; i++)
    instant =
      wall - (Date.parse(parts(new Date(instant), zone) + "Z") - instant);
  if (parts(new Date(instant), zone) !== value)
    throw Error("400:This local time does not exist in the selected timezone.");
  return new Date(instant);
}

/** Product labels keep persisted permission values out of event copy. */
export function eventAccessLabel(value: string) {
  return (
    (
      {
        PUBLIC: "Public",
        PRIVATE: "Private",
        INVITATION_ONLY: "Invitation only",
      } as Record<string, string>
    )[value] || "Access unconfirmed"
  );
}
export function locationVisibilityLabel(value: string) {
  return (
    (
      {
        PUBLIC: "Exact location visible",
        APPROXIMATE: "Approximate area only",
        HIDDEN: "Exact location hidden",
      } as Record<string, string>
    )[value] || "Visibility unconfirmed"
  );
}
export function eventDateLabel(
  value: Date | string | null | undefined,
  zone: string,
) {
  const date = value ? new Date(value) : null;
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    date.getTime() <= 0 ||
    !validTimezone(zone)
  )
    return "Unconfirmed";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zone,
  }).format(date);
}
export function localEventDateLabel(value: string, zone: string) {
  try {
    return eventDateLabel(zonedInstant(value, zone), zone);
  } catch {
    return "Unconfirmed";
  }
}
