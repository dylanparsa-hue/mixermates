import { db } from "./db";
import { actor, eventPermission } from "./domain-core";
import { publicationProblems } from "./event-management";
export async function eventOperationsView(userId: string, eventId?: string) {
  const u = await actor(db, userId);
  if (
    u.role !== "ADMIN" &&
    u.role !== "ORGANIZER" &&
    !u.capabilities.some((c) => c.capability === "ORGANIZER")
  )
    throw Error("403:Organizer management access required.");
  const events = await db.event.findMany({
    where: u.role === "ADMIN" ? {} : { organizerId: u.id },
    select: { id: true, title: true, status: true, pendingChangeId: true },
    orderBy: { createdAt: "desc" },
  });
  if (eventId) await eventPermission(db, userId, eventId, "manage");
  if (!events.length) return { events, event: null };
  const selected = eventId || events[0].id;
  await eventPermission(db, userId, selected, "manage");
  const e = await db.event.findUniqueOrThrow({
    where: { id: selected },
    include: {
      tiers: true,
      fields: true,
      staff: { where: { active: true } },
      organizer: {
        select: { id: true, name: true, active: true, verification: true },
      },
      paymentDestination: {
        include: {
          activeVersion: true,
          versions: { orderBy: { version: "desc" } },
        },
      },
    },
  });
  const verifications = await db.organizerVerification.findMany({
    where: { userId: e.organizerId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const changes = await db.eventChange.findMany({
    where: { eventId: e.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const related = await db.event.findMany({
    where: { organizerId: e.organizerId },
    select: { id: true, title: true, status: true },
    take: 50,
  });
  const problems = await publicationProblems(db, e);
  const check = (name: string, pass: boolean, detail: string) => ({
    name,
    pass,
    status: pass ? "TECHNICALLY_VERIFIED" : "INCOMPLETE",
    detail,
  });
  const version = e.paymentDestination?.activeVersion;
  const software = [
    check(
      "Event information",
      !!e.title &&
        e.configurationStatus !== "UNCONFIRMED" &&
        e.startsAt > new Date() &&
        e.endsAt > e.startsAt,
      "Name, approved configuration and future schedule must be explicit.",
    ),
    check(
      "Venue and location",
      e.configurationStatus !== "UNCONFIRMED" && !!e.venue && !!e.privateVenue,
      "Exact venue remains private; software presence is not venue authorization.",
    ),
    check(
      "Capacity and prices",
      e.capacity > 0 &&
        e.tiers.length > 0 &&
        e.tiers.every((t) => t.quantity > 0 && t.price >= 0),
      "Configured integer prices and positive inventory; not owner approval of commercial terms.",
    ),
    check(
      "Organizer account eligible",
      e.organizer.active && e.organizer.verification === "VERIFIED",
      "A fictional verification flag does not establish genuine identity.",
    ),
    check(
      "Current recipient and QR",
      !!version &&
        version.status === "APPROVED" &&
        !version.disabledAt &&
        e.paymentDestination?.status === "APPROVED",
      "Pending/rejected/disabled/superseded versions cannot replace booking snapshots.",
    ),
    check(
      "Payment instructions",
      !!version?.instructions,
      "A customer needs approved instructions; never use a historical QR as current authority.",
    ),
    check(
      "Registration and invitations",
      e.fields.length > 0 && (e.access === "PUBLIC" || e.invitationsEnabled),
      "Required form fields, separate approval and scoped invitations need rehearsal.",
    ),
    check(
      "18+ entrance rules",
      e.age >= 18 && e.idCheckRequired,
      "Physical ID checks still require an approved human procedure.",
    ),
    check(
      "Entrance staff assigned",
      e.staff.some((s) => s.canCheckIn && s.canViewGuests),
      "Assignment is stored; device/permission rehearsal must still be performed.",
    ),
    check(
      "Refund policy reviewed",
      (() => {
        try {
          return !!JSON.parse(e.refundPolicy).approvedById;
        } catch {
          return false;
        }
      })(),
      "Versioned policy applies prospectively; original booking terms remain intact.",
    ),
    check(
      "No unresolved term change",
      !e.pendingChangeId,
      "New sales remain paused while a change is in review.",
    ),
    check(
      "Publication configuration",
      problems.length === 0,
      problems.join(" ") ||
        "Software publication prerequisites passed; this does not authorize real sales.",
    ),
  ];
  const human = [
    "Actual event year, times, venue and capacity approved",
    "Organizer identity, event legitimacy and responsible contact",
    "Venue authorization and required event documents",
    "Recipient ownership and current QR confirmed through real procedure",
    "Named finance and registration reviewers; review deadline",
    "Support contact, cancellation/refund responsibilities and retention",
    "Reservation duration and rescheduling/refund rights approved",
    "Phone camera/Safari/lighting/ID/guest-list rehearsal",
    "Network contingency and incident escalation",
    "External notification delivery configured and verified",
  ];
  return {
    events,
    event: e,
    changes,
    bookings: await db.booking.count({ where: { eventId: e.id } }),
    readiness: {
      software,
      human: human.map((name) => ({
        name,
        status: "NEEDS_VERIFICATION",
        blockerStatus: name.startsWith("External")
          ? "BLOCKED_EXTERNAL_SERVICE"
          : /Actual event|Support contact|Reservation duration|Named finance/.test(
                name,
              )
            ? "BLOCKED_OWNER_DECISION"
            : "NEEDS_HUMAN_VERIFICATION",
      })),
      categories: [
        {
          name: "Event details",
          items: [
            "Configured title, date, time and venue fields",
            "Configured capacity and ticket tier values",
            "Age and real event terms need separate owner approval",
          ],
          status: software.slice(0, 3).every((c) => c.pass)
            ? "TECHNICALLY_VERIFIED"
            : "INCOMPLETE",
        },
        {
          name: "Organizer",
          items: [
            "Account eligibility",
            "Responsible contact and event legitimacy",
          ],
          status: "NEEDS_HUMAN_VERIFICATION",
        },
        {
          name: "Payments",
          items: [
            "Current recipient and QR",
            "Named independent funds reviewer",
            "Refund procedure",
          ],
          status: "BLOCKED_OWNER_DECISION",
        },
        {
          name: "Registration",
          items: [
            "Required questions and private invitations",
            "Approval responsibility",
            "Alternative entry / BYOB terms",
          ],
          status: "BLOCKED_OWNER_DECISION",
        },
        {
          name: "Entrance",
          items: [
            "Staff and scanner permissions",
            "ID and guest-list procedure",
            "Physical phone and network contingency rehearsal",
          ],
          status: "NEEDS_HUMAN_VERIFICATION",
        },
        {
          name: "Operations",
          items: [
            "Support, cancellation and refund policies",
            "Reservation expiry and customer communication",
            "Venue and legal responsibilities",
            "External delivery provider",
          ],
          status: "BLOCKED_EXTERNAL_SERVICE",
        },
      ],
      realIdentityVerified: verifications.some(
        (v) => v.status === "VERIFIED" && !v.testOnly,
      ),
      realRecipientVerified:
        !!version && !version.testOnly && version.status === "APPROVED",
      salesAuthorized: false,
      testOnly: e.testOnly,
    },
    verifications,
    relatedEvents: related,
  };
}
export async function operationalIssues(userId: string) {
  const u = await actor(db, userId);
  if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
  const now = new Date(),
    stale = new Date(now.getTime() - 24 * 3600000);
  const [jobs, expired, reviews, recovery, logs] = await Promise.all([
    db.notification.findMany({
      where: { jobStatus: { in: ["FAILED", "RETRY", "PROCESSING"] } },
      select: {
        id: true,
        title: true,
        jobStatus: true,
        attempts: true,
        retryCycles: true,
        lastAttemptAt: true,
        lastError: true,
        nextAttemptAt: true,
        leaseUntil: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.booking.findMany({
      where: {
        origin: "REAL",
        testOnly: true,
        inventoryHeld: true,
        reviewHold: false,
        paymentState: { notIn: ["CONFIRMED", "REFUND_PENDING", "REFUNDED"] },
        lifecycle: { in: ["RESERVED", "PENDING"] },
        reservationExpiresAt: { lte: now },
      },
      select: { id: true, eventId: true, reservationExpiresAt: true },
      take: 100,
    }),
    db.booking.findMany({
      where: {
        origin: "REAL",
        paymentState: { in: ["PROOF_SUBMITTED", "UNDER_REVIEW"] },
        createdAt: { lt: stale },
      },
      select: { id: true, eventId: true, createdAt: true },
      take: 100,
    }),
    db.booking.findMany({
      where: {
        origin: "REAL",
        paymentState: "CONFIRMED",
        registrationState: "APPROVED",
        lifecycle: { in: ["RESERVED", "PENDING"] },
        tickets: { none: {} },
      },
      select: { id: true, eventId: true },
      take: 100,
    }),
    db.adminAuditLog.findMany({
      where: {
        OR: [
          { entityType: "OPERATIONAL" },
          { action: "ISSUANCE_RETRY_REQUIRED" },
          { action: { contains: "CHECKIN_REJECTED" } },
        ],
      },
      select: {
        id: true,
        action: true,
        targetId: true,
        eventId: true,
        createdAt: true,
        reasonCode: true,
        newState: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return {
    jobs,
    expired,
    reviews,
    recovery,
    logs,
    externalEmail: "NOT_CONFIGURED",
    salesEnabled: false,
    localOnly: true,
  };
}
