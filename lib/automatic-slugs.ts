const reserved = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "logout",
  "register",
  "new",
  "create",
  "edit",
  "settings",
  "me",
  "support",
  "help",
  "ticket",
  "tickets",
  "events",
  "organizers",
  "null",
  "undefined",
  "root",
  "system",
  "test-lab",
  "coming-soon",
  "www",
]);
export function slugBase(name: string, fallback = "event") {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return !normalized || reserved.has(normalized) ? fallback : normalized;
}
/** Must run inside the same serializable transaction as creation. Unique indexes arbitrate races. */
export async function uniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
  fallback = "event",
) {
  const base = slugBase(name, fallback);
  for (let n = 1; n <= 10000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw Error("409:This name is used often. Add another word and try again.");
}
