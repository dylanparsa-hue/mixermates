import { db } from "./db";
import {
  publicCatalogueEnabled,
  publicCatalogueWhere,
} from "./public-catalogue";
import { canAccessEvent } from "./event-access";
import type { AccessUser } from "./access-policy";
/** Explicit projection: never serializes account contact, private venues, drafts or attendee records. */
export async function publicOrganizerProfile(slug: string, user: AccessUser) {
  const identity = await db.organizerIdentity.findUnique({
    where: { slug },
    include: { user: { select: { active: true } } },
  });
  if (!identity?.user.active) return null;
  const candidates = await db.event.findMany({
    where: {
      organizerId: identity.userId,
      access: "PUBLIC",
      status: "PUBLISHED",
      ...(publicCatalogueEnabled() ? { AND: [publicCatalogueWhere] } : {}),
    },
    select: {
      id: true,
      organizerId: true,
      slug: true,
      title: true,
      image: true,
      city: true,
      startsAt: true,
      timezone: true,
      category: true,
      access: true,
      status: true,
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  const events = [];
  for (const event of candidates)
    if (await canAccessEvent(event, user)) {
      const { organizerId, ...safe } = event;
      events.push(safe);
    }
  const own = user?.id === identity.userId || user?.role === "ADMIN";
  if (!events.length && !own) return null;
  return { name: identity.name, slug: identity.slug, events };
}
