// Add useful scenarios to the verified disposable Lab, never the canonical DB.
import { assertLabEnvironment } from "../lib/test-lab";
import { db } from "../lib/db";
import { saveEventDraft, submitEvent } from "../lib/event-management";
import { updateEventLifecycle } from "../lib/booking-domain";
import { setEventStaff } from "../lib/staff-permissions";
import { localDateTime } from "../lib/event-config";
import { writeFile } from "node:fs/promises";
const marker = await assertLabEnvironment();
const scenarios = [
  ["paid", "After Hours Studio", 3500, true, 40, "PUBLIC", "/images/neon.jpg"],
  ["free", "Sunset Social RSVP", 0, false, 40, "PUBLIC", "/images/rooftop.jpg"],
  [
    "private",
    "The Listening Room",
    2500,
    true,
    20,
    "INVITATION_ONLY",
    "/images/social.jpg",
  ],
  ["tiers", "Live Sessions", 4500, false, 40, "PUBLIC", "/images/live.jpg"],
  [
    "approval",
    "Meet at Midnight",
    2000,
    true,
    30,
    "PUBLIC",
    "/images/social.jpg",
  ],
  [
    "manual",
    "Neon Transfer Rehearsal",
    3500,
    true,
    40,
    "PUBLIC",
    "/images/neon.jpg",
  ],
  [
    "limited",
    "Six Places After Dark",
    1500,
    false,
    6,
    "PUBLIC",
    "/images/rooftop.jpg",
  ],
] as const;
const results = [];
for (const [key, name, price, approval, capacity, access, image] of scenarios) {
  const creationKey =
    "a9846e4a-006a-4cc2-9800-00000000000" +
    scenarios.findIndex((s) => s[0] === key);
  let e = await db.event.findUnique({ where: { creationKey } });
  if (!e) {
    const starts = new Date(Date.now() + 7 * 86400000),
      ends = new Date(+starts + 4 * 3600000);
    e = await saveEventDraft(marker.personas.Organizer, {
      creationKey,
      title: "TEST · " + name,
      description:
        "Fictional local event for booking, registration and admission rehearsal. No real venue, money or entry.",
      category: key === "tiers" ? "Live Music" : "House Party",
      genre: "House",
      image,
      startsLocal: localDateTime(starts, "Asia/Kuala_Lumpur"),
      endsLocal: localDateTime(ends, "Asia/Kuala_Lumpur"),
      city: "Kuala Lumpur",
      venue: "FICTIONAL studio",
      privateVenue: "Fictional venue only. No real address.",
      access,
      locationVisibility: "HIDDEN",
      invitationsEnabled: access !== "PUBLIC",
      age: 18,
      capacity,
      approvalRequired: approval,
      idCheckRequired: true,
      policies: "Local fictional rehearsal only. No real admission.",
      paymentDestinationId: price ? marker.destinationId : null,
      tiers:
        key === "tiers"
          ? [
              {
                name: "General admission",
                price,
                quantity: 30,
                maxPerOrder: 4,
              },
              { name: "Balcony", price: 6500, quantity: 10, maxPerOrder: 2 },
            ]
          : [
              {
                name: price ? "General admission" : "Free RSVP",
                price,
                quantity: capacity,
                maxPerOrder: Math.min(4, capacity),
              },
            ],
      fields: [{ label: "Full name as on IC", type: "text", required: true }],
    });
    await submitEvent(marker.personas.Organizer, e.id);
    await updateEventLifecycle(
      marker.personas.Administrator,
      e.id,
      "PUBLISHED",
      {
        notes: "Independent fictional fixture review. No real sales authority.",
        reviewerId: marker.personas.Administrator,
        outcome: "APPROVED",
      },
    );
    await db.event.update({
      where: { id: e.id },
      data: {
        origin: "REAL",
        configurationStatus: "FICTIONAL_APPROVED",
        sourceConfiguration: JSON.stringify({
          testLab: true,
          nonce: marker.nonce,
          scenario: key,
        }),
        refundPolicy: JSON.stringify({
          kind: "REVIEW_REQUIRED",
          terms: "Fictional refunds require review. No money moves.",
          deadline: null,
          allowAfterChange: true,
        }),
      },
    });
    for (const [role, permissions] of [
      ["Finance Reviewer", { canReviewPayments: true }],
      ["Entrance Staff", { canCheckIn: true, canViewGuests: true }],
    ] as const)
      await setEventStaff(marker.personas.Administrator, {
        eventId: e.id,
        userId: marker.personas[role],
        active: true,
        ...permissions,
      });
  }
  results.push({ id: e.id, slug: e.slug, key, title: e.title });
}
// Readable fictional names; historical unique slug/ID and actual event names stay intact.
for (const e of await db.event.findMany({
  where: {
    testOnly: true,
    title: { startsWith: "TEST · Cinematic Rehearsal " },
  },
}))
  await db.event.update({
    where: { id: e.id },
    data: { title: "TEST · Cinematic Rehearsal" },
  });
await writeFile(
  ".local/ui-fixes-scenarios.json",
  JSON.stringify(results, null, 2),
  { mode: 0o600 },
);
console.log(
  "Prepared " +
    results.length +
    " approved fictional scenarios. No real event or funds.",
);
await db.$disconnect();
