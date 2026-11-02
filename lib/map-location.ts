// Missing or protected coordinates must never become a marker at a guessed/default location.
export function mapLocation(event: {
  latitude?: unknown;
  longitude?: unknown;
}) {
  const { latitude, longitude } = event;
  return typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
    ? ([longitude, latitude] as [number, number])
    : null;
}
