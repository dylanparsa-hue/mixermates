import { randomUUID } from "node:crypto";
import { db } from "./db";
import { actor, audit, notify, transaction, type Tx } from "./domain-core";
import { assertSimulator } from "./payment-simulator";
import { saveEventDraft, submitEvent } from "./event-management";
import { activateOrganizer } from "./organizer-identity";
import { localDateTime } from "./event-config";
import { TEST_EVENT_POLICY } from "./simulator-policy";

export async function publishSimulatorEvent(tx: Tx, userId: string, e: any) {
  const marker = await assertSimulator(tx);
  await actor(tx, userId);
  if (
    e.organizerId !== userId ||
    !e.testOnly ||
    e.paymentMode !== "TEST_SIMULATOR" ||
    e.status !== "DRAFT" ||
    e.id === "halloween" ||
    e.paymentDestinationId
  )
    throw Error(
      "403:Only your fictional simulator draft can be published locally.",
    );
  await tx.event.update({
    where: { id: e.id },
    data: {
      status: "PUBLISHED",
      origin: "REAL",
      configurationStatus: "FICTIONAL_APPROVED",
      reviewOutcome: "APPROVED",
      reviewNotes:
        "Explicit local simulator publication. No genuine event moderation or sales authority.",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      salesPaused: false,
      stateVersion: { increment: 1 },
      refundPolicy: JSON.stringify({
        kind: "REVIEW_REQUIRED",
        terms: TEST_EVENT_POLICY,
        deadline: null,
        allowAfterChange: true,
      }),
    },
  });
  await tx.eventStaff.upsert({
    where: {
      eventId_userId: {
        eventId: e.id,
        userId: marker.personas["Entrance Staff"],
      },
    },
    create: {
      eventId: e.id,
      userId: marker.personas["Entrance Staff"],
      active: true,
      canCheckIn: true,
      canViewGuests: true,
    },
    update: { active: true, canCheckIn: true, canViewGuests: true },
  });
  await audit(tx, userId, "LOCAL_SIMULATOR_EVENT_PUBLISHED", e.id, {
    eventId: e.id,
    entityType: "EVENT",
    previousState: e.status,
    newState: "PUBLISHED",
    reasonCode:
      "Explicit guarded fictional publication; not independent production moderation.",
  });
  await notify(
    tx,
    userId,
    "sim-published:" + e.id,
    "Test event published",
    "Your fictional event is available from Explore. No real payments or admission.",
    "/events/" + e.slug,
  );
  return { ok: true, published: true, slug: e.slug };
}

/** Add fresh scenarios without deleting, resetting or modifying earlier bookings. */
export async function freshSimulatorScenarios(userId: string) {
  const marker = await assertSimulator();
  await activateOrganizer(userId);
  const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14),
    rows: any[] = [];
  const definitions = [
    { name: "Neon After Dark", key: "paid", price: 3500, capacity: 40 },
    { name: "Sunset Free RSVP", key: "free", price: 0, capacity: 30 },
    { name: "One Last Ticket", key: "last", price: 1200, capacity: 1 },
    { name: "Registration Review", key: "approval", price: 2000, capacity: 10 },
    { name: "Private Invitation", key: "private", price: 2500, capacity: 10 },
    { name: "Sold Out", key: "sold", price: 1000, capacity: 1 },
    { name: "Cancelled Night", key: "cancelled", price: 1000, capacity: 10 },
  ];
  for (const def of definitions) {
    const e = await saveEventDraft(userId, {
      creationKey: randomUUID(),
      title: `TEST · ${def.name} · ${stamp}`,
      shortDescription:
        "Fictional local event. No money moves and no real venue or admission.",
      description: TEST_EVENT_POLICY,
      startsLocal: localDateTime(new Date(Date.now() + 7 * 86400000)),
      endsLocal: localDateTime(
        new Date(Date.now() + 7 * 86400000 + 3 * 3600000),
      ),
      city: "Test Kuala Lumpur",
      venue: "Fictional studio",
      image: def.key === "free" ? "/images/rooftop.jpg" : "/images/neon.jpg",
      capacity: def.capacity,
      approvalRequired: def.key === "approval",
      idCheckRequired: false,
      paymentMode: "TEST_SIMULATOR",
      access: def.key === "private" ? "INVITATION_ONLY" : "PUBLIC",
      invitationsEnabled: def.key === "private",
      policies: TEST_EVENT_POLICY,
      tiers: [
        {
          name: def.price ? "General Admission" : "Free RSVP",
          price: def.price,
          quantity: def.capacity > 1 ? def.capacity - 2 : 1,
          maxPerOrder: Math.min(4, def.capacity > 1 ? def.capacity - 2 : 1),
        },
        ...(def.capacity > 1
          ? [
              {
                name: "Premium",
                price: def.price ? def.price + 1500 : 0,
                quantity: 2,
                maxPerOrder: 2,
              },
            ]
          : []),
      ],
    });
    await transaction(tx=>publishSimulatorEvent(tx,userId,e));
    if (def.key === "sold") {
      // A genuine fictional reservation owns the sole unit, rather than falsifying a sold counter.
      await (
        await import("./booking-domain")
      ).reserveBooking(marker.personas["Community Friend"], {
        eventId: e.id,
        tierId: (
          await db.eventTicketTier.findFirstOrThrow({
            where: { eventId: e.id },
          })
        ).id,
        quantity: 1,
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() + 23 * 3600000),
      });
    }
    if (def.key === "cancelled")
      await (
        await import("./booking-domain")
      ).updateEventLifecycle(userId, e.id, "CANCELLED");
    if (def.key === "private") {
      const invitation = await (
        await import("./invitations")
      ).createInvitation(userId, {
        eventId: e.id,
        inviteeId: userId,
        expiresAt: new Date(Date.now() + 6 * 86400000),
      });
      await (
        await import("./invitations")
      ).redeemInvitation(userId, e.id, invitation.token);
    }
    rows.push({ key: def.key, id: e.id, slug: e.slug });
  }
  // Optional advanced fixture retains approved fictional recipient + independent review identities.
  const organizerId = marker.personas.Organizer;
  const manual = await saveEventDraft(organizerId, {
    creationKey: randomUUID(),
    title: `TEST · Manual QR Review · ${stamp}`,
    shortDescription:
      "Advanced fictional receipt and independent payment review scenario.",
    description: TEST_EVENT_POLICY,
    startsLocal: localDateTime(new Date(Date.now() + 8 * 86400000)),
    endsLocal: localDateTime(new Date(Date.now() + 8 * 86400000 + 7200000)),
    city: "Test Kuala Lumpur",
    venue: "Fictional studio",
    image: "/images/live.jpg",
    capacity: 20,
    approvalRequired: true,
    idCheckRequired: false,
    paymentDestinationId: marker.destinationId,
    policies: TEST_EVENT_POLICY,
    tiers: [
      {
        name: "Manual review ticket",
        price: 1800,
        quantity: 20,
        maxPerOrder: 4,
      },
    ],
  });
  await submitEvent(organizerId, manual.id);
  await (
    await import("./booking-domain")
  ).updateEventLifecycle(
    marker.personas.Administrator,
    manual.id,
    "PUBLISHED",
    {
      notes: "Explicit fictional fixture review; no funds or sales.",
      reviewerId: marker.personas.Administrator,
      outcome: "APPROVED",
    },
  );
  await transaction(async (tx) => {
    await assertSimulator(tx);
    await tx.event.update({
      where: { id: manual.id },
      data: { origin: "REAL", configurationStatus: "FICTIONAL_APPROVED" },
    });
    for (const [uid, permissions] of [
      [marker.personas["Finance Reviewer"], { canReviewPayments: true }],
      [
        marker.personas["Entrance Staff"],
        { canCheckIn: true, canViewGuests: true },
      ],
    ] as const)
      await tx.eventStaff.upsert({
        where: { eventId_userId: { eventId: manual.id, userId: uid } },
        create: {
          eventId: manual.id,
          userId: uid,
          active: true,
          ...permissions,
        },
        update: { active: true, ...permissions },
      });
    await audit(tx, userId, "SIMULATOR_FIXTURES_ADDED", manual.id, {
      eventId: manual.id,
      entityType: "EVENT",
      reasonCode: "Explicit non-destructive fictional scenario generation.",
    });
  });
  rows.push({ key: "manual", id: manual.id, slug: manual.slug });
  return { events: rows };
}
