/** Discovery uses stored instants; the calendar groups those instants in Kuala Lumpur. */
export function upcomingEvents<
  T extends { startsAt: string | Date; endsAt: string | Date },
>(events: T[], now = Date.now()) {
  return events
    .filter((e) => +new Date(e.endsAt) > now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}
export function malaysiaDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
