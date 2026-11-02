import { actor, audit, transaction, type Tx } from "./domain-core";
import { ageOn } from "./rules";
import { uniqueSlug } from "./automatic-slugs";

export async function ensureOrganizerIdentity(tx: Tx, userId: string) {
  const existing = await tx.organizerIdentity.findUnique({ where: { userId } });
  if (existing) return existing;
  const user = await actor(tx, userId);
  const slug = await uniqueSlug(
    user.name,
    async (slug) =>
      !!(await tx.organizerIdentity.findUnique({ where: { slug } })),
    "organizer",
  );
  return tx.organizerIdentity.create({
    data: { userId, name: user.name, slug },
  });
}
/** A free creation entitlement only: never changes role, verification, subscription or sales policy. */
export function activateOrganizer(userId: string) {
  return transaction(async (tx) => {
    const u = await actor(tx, userId);
    if (ageOn(u.dob) < 18)
      throw Error("403:You must be 18 or older to organize an event.");
    if (!["ATTENDEE", "ORGANIZER", "ADMIN"].includes(u.role))
      throw Error(
        "403:This account cannot activate a personal organizer profile.",
      );
    const prior = u.capabilities.some((c) => c.capability === "ORGANIZER");
    await tx.userCapability.upsert({
      where: { userId_capability: { userId, capability: "ORGANIZER" } },
      create: { userId, capability: "ORGANIZER" },
      update: { active: true },
    });
    const identity = await ensureOrganizerIdentity(tx, userId);
    if (!prior)
      await audit(tx, userId, "FREE_ORGANIZER_ACCESS_ACTIVATED", userId, {
        entityType: "USER",
      });
    return {
      ok: true,
      identity,
      entitlement: "FREE_CREATION",
      salesEnabled: false,
    };
  });
}
