import { db } from "../lib/db";
import { reserveBooking, approveRegistration } from "../lib/booking-domain";
import { setEventStaff } from "../lib/staff-permissions";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { isolatedTestData } from "../lib/domain-core";
if (!isolatedTestData() || JSON.stringify(JSON.parse(readFileSync(".local/regression-isolated.json","utf8"))) !== JSON.stringify({fictional:true,phase:3}))
  throw Error("Fresh fictional access fixture only");
const id = "organizer-phase1-browser-fixture";
if (await db.event.findUnique({ where: { id } }))
  throw Error("Preserve existing fixture");
try {
  const e = await db.event.create({
    data: {
      id,
      slug: id,
      title: "Fictional browser regression",
      description:
        "A fictional local browser regression fixture. No real event, funds or admission.",
      category: "House Party",
      genre: "House",
      image: "/images/neon.jpg",
      city: "Test",
      venue: "Fictional test area",
      privateVenue: "PRIVATE FICTIONAL VENUE",
      latitude: 0,
      longitude: 0,
      startsAt: new Date(Date.now() + 14 * 86400000),
      endsAt: new Date(Date.now() + 14 * 86400000 + 7200000),
      capacity: 20,
      age: 18,
      access: "PUBLIC",
      approvalRequired: true,
      organizerId: "organizer",
      status: "PUBLISHED",
      reviewOutcome: "APPROVED",
      reviewedById: "admin",
      origin: "REAL",
      testOnly: true,
      configurationStatus: "FICTIONAL_APPROVED",
      tiers: { create: { name: "Free RSVP", price: 0, quantity: 20 } },
    },
    include: { tiers: true },
  });
  const b = await reserveBooking("attendee", {
    eventId: id,
    tierId: e.tiers[0].id,
    quantity: 1,
    idempotencyKey: "organizer-phase1-e2e-booking",
    expiresAt: new Date(Date.now() + 3600000),
  });
  await approveRegistration(
    "organizer",
    b.id,
    true,
    "Fictional local test only.",
  );
  await setEventStaff("organizer", {
    eventId: id,
    userId: "staff",
    active: true,
    canViewGuests: true,
    canCheckIn: true,
    canReviewPayments: false,
    canApproveRegistrations: false,
    canViewLocation: false,
  });
  await writeFile(
    ".local/phase10-fixture.json",
    JSON.stringify({
      halloween: { eventId: id },
      reschedule: { eventId: id, bookingId: b.id },
    }),
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Prepared fictional free booking, support and scanner fixtures. Historical Halloween untouched.",
  );
} finally {
  await db.$disconnect();
}
