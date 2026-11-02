import {
  publicCatalogueEnabled,
  publicCatalogueWhere,
} from "@/lib/public-catalogue";
import { eventOperationsView, operationalIssues } from "@/lib/readiness";
import { phase7Post } from "@/lib/phase7-api";
import { operationsOverview, operationsPost } from "@/lib/operations";
import {
  entranceOverview,
  entranceAction,
  entranceExportStream,
} from "@/lib/entrance";
import { eligibility } from "@/lib/booking-domain";
import { bookedHolder } from "@/lib/registration";
import { ticketExport } from "@/lib/ticket-export";
import { managementGet, managementPost } from "@/lib/management-api";
import { organizerActor } from "@/lib/event-management";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAccess, isAdmin } from "@/lib/access-policy";
import {
  getSiteConfig,
  isLocalDemoRequest,
  isIsolatedDemoEnvironment,
} from "@/lib/site-config";
import {
  consumeRateLimit,
  emailInput,
  passwordInput,
  registrationInput,
  requestRecovery,
  resetPassword,
  securityChange,
} from "@/lib/security";
import {
  createInvitation,
  redeemInvitation,
  revokeInvitation,
} from "@/lib/invitations";
import { setEventStaff } from "@/lib/staff-permissions";
import {
  cancelBooking,
  expireReservation,
  revokeTicket,
  updateEventLifecycle,
} from "@/lib/booking-domain";
import {
  isolatedTestData,
  eventPermission,
  audit,
  transaction,
} from "@/lib/domain-core";
import { isOrganizer } from "@/lib/access-policy";
import { canSeePrivateLocation, canAccessEvent } from "@/lib/event-access";
import { canReadUploadedMedia } from "@/lib/media-access";
import { readDesign } from "@/lib/page-design";
import {
  socialAction,
  blockedAccounts,
  socialPerson,
  permittedUsername,
} from "@/lib/social";
import { profileConnections } from "@/lib/profile";
import { createSession, currentUser, hashToken, requireUser } from "@/lib/auth";
import { ageOn, publicUser } from "@/lib/rules";
import { book, checkIn, reviewBooking, refundBooking } from "@/lib/services";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { boundedBody } from "@/lib/request-security";
import { validateImage } from "@/lib/image-security";
import { infrastructureFailure } from "@/lib/api-failure";
export const runtime = "nodejs";
const limits = new Map<string, { n: number; until: number }>();
const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });
const safeUser = (u: any) => ({
  ...publicUser(u),
  email: u.email,
  role: u.role,
  capabilities: (u.capabilities || [])
    .filter((c: any) => c.active !== false)
    .map((c: any) => c.capability),
  socialNotifications: u.socialNotifications,
  promotionalNotifications: u.promotionalNotifications,
  attendancePublic: u.attendancePublic,
  discoverable: u.discoverable,
  achievementsPublic: u.achievementsPublic,
  instagram: u.instagram,
  instagramPublic: u.instagramPublic,
});
async function eventData(e: any, u: any) {
  const permitted = await canSeePrivateLocation(e, u);
  const identity =
    e.organizerId && e.origin !== "PUBLIC_DEMO"
      ? await db.organizerIdentity.findUnique({
          where: { userId: e.organizerId },
        })
      : null;
  const publicLocation =
    e.access === "PUBLIC" && e.locationVisibility === "PUBLIC";
  const {
    privateVenue,
    latitude,
    longitude,
    sourceConfiguration,
    paymentDestinationId,
    ...rest
  } = e;
  return {
    ...rest,
    pageDesign:
      e.pageDesign && e.pageDesign !== "{}"
        ? JSON.stringify({
            ...readDesign(e.pageDesign),
            ...(!publicLocation && !permitted ? { directions: "" } : {}),
          })
        : "{}",
    // Hidden definitions are organizer tools, not a public or invited-guest projection.
    tiers: e.tiers
      ?.filter(
        (t: any) =>
          u?.id === e.organizerId ||
          u?.role === "ADMIN" ||
          t.availability !== "HIDDEN",
      )
      .map((t: any) => ({
        ...t,
        originalPrice: t.price,
        price: t.price - (t.discount || 0),
      })),
    fields: e.fields?.filter(
      (f: any) => u?.id === e.organizerId || u?.role === "ADMIN" || !f.hidden,
    ),
    salesAvailable: process.env.NODE_ENV !== "production",
    entryInstructions: permitted ? e.entryInstructions : "",
    venue:
      permitted && privateVenue
        ? privateVenue
        : publicLocation || permitted
          ? e.venue
          : "Location shared with confirmed guests",
    ...(publicLocation || permitted
      ? { latitude, longitude }
      : e.access === "PUBLIC" && e.locationVisibility === "APPROXIMATE"
        ? {
            latitude: Math.round(latitude * 10) / 10,
            longitude: Math.round(longitude * 10) / 10,
          }
        : {}),
    organizer:
      e.origin === "PUBLIC_DEMO"
        ? {
            id: "public-demo",
            name: "MixerMates Demo",
            username: "mixermates_demo",
            photo: "",
            city: "Fictional location",
            bio: "Fictional showcase. No real organizer or admission.",
            verification: "UNVERIFIED",
          }
        : e.organizer
          ? {
              ...publicUser(e.organizer),
              name: identity?.name || e.organizer.name,
              organizerSlug: identity?.slug || null,
            }
          : undefined,
    saved: !!(
      u &&
      (await db.savedEvent.findUnique({
        where: { userId_eventId: { userId: u.id, eventId: e.id } },
      }))
    ),
  };
}
async function authorizeEvent(eventId: string, userId: string, staff = false) {
  const e = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  if (
    e.organizerId !== userId &&
    !(
      staff &&
      (await db.eventStaff.findUnique({
        where: { eventId_userId: { eventId, userId } },
      }))
    )
  )
    throw new Error("403:This event is managed by another organizer.");
  return e;
}
async function socialAllowed(a: any, b: any) {
  if (!b || a.id === b.id || !b.active) throw new Error("400:Invalid contact.");
  if (ageOn(a.dob) < 18 || ageOn(b.dob) < 18)
    throw new Error(
      "403:Social connections and messaging are limited to adult accounts in this demo.",
    );
  if (
    await db.block.findFirst({
      where: {
        OR: [
          { fromId: a.id, toId: b.id },
          { fromId: b.id, toId: a.id },
        ],
      },
    })
  )
    throw new Error("403:This connection is unavailable.");
}
async function handle(req: NextRequest) {
  const p = req.nextUrl.pathname.replace("/api/", "");
  if (["message", "messages", "club", "clubs"].includes(p))
    return fail("This feature has been retired.", 410);
  if (
    p.startsWith("test-lab/") &&
    process.env.NODE_ENV === "development" &&
    process.env.MIXERMATES_TEST_LAB === "enabled"
  )
    return (await import("@/lib/test-lab-actions")).testLabRoute(req);
  const u = await currentUser();
  const lab =
    process.env.NODE_ENV === "development" &&
    process.env.MIXERMATES_TEST_LAB === "enabled" &&
    (await (await import("@/lib/test-lab")).localLabAccess());
  const config = lab
    ? { ...getSiteConfig(), siteMode: "full_platform" as const }
    : getSiteConfig();
  const access = apiAccess(
    p,
    req.method,
    u,
    config,
    isLocalDemoRequest(req.nextUrl.origin),
  );
  if (
    lab &&
    [
      "demo",
      "book",
      "review",
      "refund",
      "payout",
      "promotion",
      "event",
    ].includes(p)
  )
    return fail("Use the approval-driven Test Lab workflow.", 403);
  if (!access.allowed) return fail(access.error!, access.status!);
  if (req.method === "GET" || req.method === "HEAD") {
    if (p.startsWith("entrance-export/"))
      return new NextResponse(
        await entranceExportStream(
          (await requireUser()).id,
          p.split("/")[1],
          Object.fromEntries(req.nextUrl.searchParams),
        ),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              "attachment; filename=private-guest-list.csv",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    if (p.startsWith("entrance/"))
      return NextResponse.json(
        await entranceOverview(
          (await requireUser()).id,
          p.split("/")[1],
          Object.fromEntries(req.nextUrl.searchParams),
        ),
      );
    if (p === "event-operations")
      return NextResponse.json(
        await eventOperationsView(
          (await requireUser()).id,
          req.nextUrl.searchParams.get("event") || undefined,
        ),
      );
    if (p === "job-operations")
      return NextResponse.json(
        await operationalIssues((await requireUser()).id),
      );
    const managementResponse = await managementGet(p, u);
    if (managementResponse) return managementResponse;
    // An API URL without a file extension passes managed-hosting static asset routing.
    if (/^media\/[a-f0-9]{40}$/.test(p)) {
      const token = p.slice(6);
      const file = await db.fileUpload.findFirst({
        where: {
          path: {
            in: [
              `/api/media/${token}`,
              `/uploads/${token}.png`,
              `/uploads/${token}.jpg`,
            ],
          },
        },
        select: {
          private: true,
          data: true,
          mime: true,
          userId: true,
          path: true,
        },
      });
      if (
        !file ||
        file.private ||
        !file.data ||
        !(await canReadUploadedMedia(file, u))
      )
        return new NextResponse("Not found", { status: 404 });
      return new NextResponse(new Uint8Array(file.data), {
        headers: {
          "Content-Type": ["image/png", "image/jpeg", "image/webp"].includes(
            file.mime || "",
          )
            ? file.mime!
            : "image/jpeg",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (p === "me")
      return NextResponse.json({
        user: u ? safeUser(u) : null,
        testLab: !!lab,
        demo:
          isIsolatedDemoEnvironment() && isLocalDemoRequest(req.nextUrl.origin),
      });
    if (p === "events") {
      const q = req.nextUrl.searchParams;
      const events = await db.event.findMany({
        where: {
          status: "PUBLISHED",
          ...(publicCatalogueEnabled() ? { AND: [publicCatalogueWhere] } : {}),
          ...(!isAdmin(u)
            ? {
                OR: [
                  { access: "PUBLIC" },
                  ...(u ? [{ organizerId: u.id }] : []),
                ],
              }
            : {}),
          ...(config.siteMode === "coming_soon" && !isAdmin(u)
            ? {
                OR: [
                  { organizerId: u!.id },
                  { staff: { some: { userId: u!.id, active: true } } },
                ],
              }
            : {}),
          ...(q.get("city") && q.get("city") !== "All cities"
            ? { city: q.get("city")! }
            : {}),
          ...(q.get("category") && q.get("category") !== "All vibes"
            ? { category: q.get("category")! }
            : {}),
          ...(q.get("q")
            ? {
                AND: [
                  ...(publicCatalogueEnabled() ? [publicCatalogueWhere] : []),
                  {
                    OR: [
                      ...["title", "city", "genre"].map((f) => ({
                        [f]: { contains: q.get("q")! },
                      })),
                      {
                        AND: [
                          { access: "PUBLIC", locationVisibility: "PUBLIC" },
                          { venue: { contains: q.get("q")! } },
                        ],
                      },
                    ],
                  },
                ],
              }
            : {}),
          ...(q.get("free") === "true"
            ? { tiers: { some: { price: 0 } } }
            : {}),
        },
        include: {
          tiers: true,
          organizer: true,
          promotions: { where: { status: "APPROVED" } },
        },
        orderBy: { startsAt: "asc" },
      });
      return NextResponse.json(
        await Promise.all(events.map((e) => eventData(e, u))),
      );
    }
    if (p.startsWith("events/")) {
      const id = p.split("/")[1];
      const e = await db.event.findFirst({
        where: { OR: [{ id }, { slug: id }] },
        include: { tiers: true, fields: true, organizer: true },
      });
      if (!e || !(await canAccessEvent(e, u)))
        return fail("Event not found.", 404);
      return NextResponse.json(await eventData(e, u));
    }
    if (p.startsWith("people/")) {
      const me = await requireUser();
      const username = p.split("/")[1];
      const target = await db.user.findUnique({ where: { username } });
      if (!target) return fail("Profile unavailable.", 404);
      await socialAllowed(me, target);
      const [userA, userB] = [me.id, target.id].sort();
      const friend = await db.friendship.findUnique({
        where: { userA_userB: { userA, userB } },
      });
      const request = await db.friendRequest.findFirst({
        where: {
          status: "PENDING",
          OR: [
            { fromId: me.id, toId: target.id },
            { fromId: target.id, toId: me.id },
          ],
        },
      });
      if (!target.discoverable && !friend && !request)
        return fail("This profile is private.", 403);
      const attendance = target.attendancePublic
        ? await db.attendanceRecord.findMany({
            where: {
              userId: target.id,
              public: true,
              event: {
                access: "PUBLIC",
                status: { in: ["PUBLISHED", "COMPLETED"] },
              },
            },
            include: { event: true },
          })
        : [];
      return NextResponse.json({
        connections: await profileConnections(target, me),
        user: socialPerson(target),
        attendance: await Promise.all(
          attendance.map(async (a) => ({
            ...a,
            event: await eventData(a.event, me),
            ticketId: undefined,
          })),
        ),
        badges: target.achievementsPublic
          ? await db.userBadge.findMany({
              where: { userId: target.id },
              include: { badge: true },
            })
          : [],
        following: !!(await db.follow.findUnique({
          where: { fromId_toId: { fromId: me.id, toId: target.id } },
        })),
        friend: !!friend,
        request: request?.status || null,
        requestIncoming: request?.toId === me.id,
      });
    }
    if (p === "blocked-accounts") {
      const me = await requireUser();
      return NextResponse.json(await blockedAccounts(me.id));
    }
    if (p === "people") {
      const me = await requireUser();
      if (ageOn(me.dob) < 18)
        return NextResponse.json({
          people: [],
          requests: [],
          friends: [],
          conversations: [],
        });
      const blocks = await db.block.findMany({
        where: { OR: [{ fromId: me.id }, { toId: me.id }] },
      });
      const blocked = blocks.map((b) =>
        b.fromId === me.id ? b.toId : b.fromId,
      );
      const friends = await db.friendship.findMany({
        where: { OR: [{ userA: me.id }, { userB: me.id }] },
      });
      const requests = await db.friendRequest.findMany({
        where: { OR: [{ fromId: me.id }, { toId: me.id }], status: "PENDING" },
      });
      const ids = [
        ...friends.flatMap((f) => [f.userA, f.userB]),
        ...requests.flatMap((f) => [f.fromId, f.toId]),
      ];
      const people = await db.user.findMany({
        where: {
          id: { not: me.id, notIn: blocked },
          active: true,
          dob: {
            lte: new Date(
              new Date().setFullYear(new Date().getFullYear() - 18),
            ),
          },
          OR: [{ discoverable: true }, { id: { in: ids } }],
        },
      });
      const follows = await db.follow.findMany({ where: { fromId: me.id } });
      const names = new Map(people.map((x) => [x.id, x.username]));
      names.set(me.id, me.username);
      return NextResponse.json({
        people: people.map((x) => ({
          ...socialPerson(x),
          discoverable: x.discoverable,
          following: follows.some((f) => f.toId === x.id),
        })),
        requests: requests
          .filter((r) => names.has(r.fromId) && names.has(r.toId))
          .map((r) => ({
            fromId: names.get(r.fromId),
            toId: names.get(r.toId),
            status: r.status,
          })),
        friends: friends
          .filter((f) => names.has(f.userA) && names.has(f.userB))
          .map((f) => ({
            userA: names.get(f.userA),
            userB: names.get(f.userB),
          })),
      });
    }

    if (p === "tickets") {
      const me = await requireUser();
      const bookings = await db.booking.findMany({
        where: { userId: me.id },
        include: {
          event: true,
          tier: true,
          tickets: { include: { checkIn: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(
        await Promise.all(
          bookings.map(async (b) => ({
            ...b,
            event: await eventData(b.event, me),
            tickets: b.tickets.map(({ token, ...ticket }) => ({
              ...ticket,
              token:
                ticket.status === "ACTIVE" && !ticket.revokedAt ? token : "",
            })),
            receiptPath: undefined,
            eventTermsSnapshot: undefined,
          })),
        ),
      );
    }
    if (p.startsWith("ticket/") || p.startsWith("ticket-export/")) {
      const me = await requireUser();
      const ticket = await db.ticket.findUniqueOrThrow({
        where: { id: p.split("/")[1] },
        include: {
          booking: {
            include: {
              event: true,
              user: true,
              tier: true,
              recipientVersion: true,
              payment: {
                include: {
                  reviews: true,
                  evidence: true,
                  simulationAttempts: true,
                },
              },
            },
          },
        },
      });
      if (ticket.booking.userId !== me.id) return fail("Private ticket.", 403);
      const valid =
        ticket.status === "ACTIVE" &&
        !ticket.revokedAt &&
        ticket.origin === ticket.booking.origin &&
        ticket.testOnly === ticket.booking.testOnly &&
        eligibility(
          ticket.booking,
          ticket.booking.event,
          ticket.booking.payment,
          { admission: true },
        ).eligible;
      const event = await eventData(ticket.booking.event, me);
      if (p.startsWith("ticket-export/")) {
        const safe = req.nextUrl.searchParams.get("share") === "1";
        const svg = await ticketExport(
          ticket,
          event,
          await bookedHolder(db, ticket.booking, me.name),
          valid,
          safe,
          null,
          "image/png",
        );
        return new NextResponse(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Content-Disposition": `attachment; filename="mixermates-${safe ? "share-preview" : "private-ticket"}.svg"`,
            "Cache-Control": "private, no-store",
            "Content-Security-Policy":
              "default-src 'none'; img-src data:; sandbox",
          },
        });
      }
      const qr = valid
        ? await QRCode.toDataURL(ticket.token, { width: 420, margin: 3 })
        : "";
      return NextResponse.json({
        id: ticket.id,
        status: ticket.status,
        testOnly: ticket.testOnly,
        token: valid ? ticket.token : "",
        qr,
        event: await eventData(ticket.booking.event, me),
        holder: await bookedHolder(db, ticket.booking, me.name),
        tier: ticket.booking.tier.name,
        booking: undefined,
      });
    }
    if (p === "notifications") {
      const me = await requireUser();
      return NextResponse.json(
        await db.notification.findMany({
          where: { userId: me.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    }
    if (p === "clubs") {
      const me = await requireUser();
      if (ageOn(me.dob) < 18) return NextResponse.json([]);
      const clubs = await db.club.findMany({
        include: {
          members: { where: { userId: me.id } },
          _count: { select: { members: true } },
        },
      });
      return NextResponse.json(
        clubs.map(({ members, _count, ...club }) => ({
          ...club,
          joined: members.length > 0,
          public: members[0]?.public || false,
          memberCount: _count.members,
        })),
      );
    }
    if (p === "profile") {
      const me = await requireUser();
      return NextResponse.json({
        connections: await profileConnections(me, me),
        user: safeUser(me),
        attendance: await db.attendanceRecord
          .findMany({
            where: { userId: me.id },
            include: { event: true },
          })
          .then((xs) =>
            Promise.all(
              xs.map(async (x) => ({
                ...x,
                event: await eventData(x.event, me),
                ticketId: undefined,
              })),
            ),
          ),
        badges: await db.userBadge.findMany({
          where: { userId: me.id },
          include: { badge: true },
        }),
        saved: await db.savedEvent
          .findMany({
            where: { userId: me.id },
            include: { event: { include: { tiers: true, organizer: true } } },
          })
          .then((xs) => Promise.all(xs.map((x) => eventData(x.event, me)))),
      });
    }
    if (p === "operations")
      return NextResponse.json(
        await operationsOverview(
          (await requireUser()).id,
          req.nextUrl.searchParams,
        ),
      );
    if (p === "organizer") {
      const me = await requireUser();
      const events = await db.event.findMany({
        where: {
          ...(isAdmin(me)
            ? {}
            : {
                OR: [
                  { organizerId: me.id },
                  { staff: { some: { userId: me.id, active: true } } },
                ],
              }),
        },
        include: {
          tiers: true,
          fields: true,
          bookings: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              tier: true,
              tickets: { include: { checkIn: true } },
              payment: true,
            },
          },
          promotions: true,
          activity: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        events: await Promise.all(
          events.map(async (e) => {
            const safeEvent = {
              ...e,
              bookings: e.bookings.map((b) => ({
                ...b,
                tickets: b.tickets.map(({ token, ...t }) => t),
              })),
            };
            if (e.organizerId === me.id || isAdmin(me)) return safeEvent;
            const staff = await db.eventStaff.findUnique({
              where: { eventId_userId: { eventId: e.id, userId: me.id } },
            });
            return {
              ...safeEvent,
              sourceConfiguration: undefined,
              paymentDestinationId: staff?.canReviewPayments
                ? e.paymentDestinationId
                : undefined,
              privateVenue: staff?.canViewLocation ? e.privateVenue : undefined,
              latitude: staff?.canViewLocation ? e.latitude : undefined,
              longitude: staff?.canViewLocation ? e.longitude : undefined,
              activity: [],
              promotions: [],
              bookings: !staff?.canViewGuests
                ? []
                : safeEvent.bookings
                    .filter(
                      (b) =>
                        b.status === "APPROVED" ||
                        staff.canApproveRegistrations ||
                        staff.canReviewPayments,
                    )
                    .map((b) => ({
                      ...b,
                      eventTermsSnapshot: staff.canViewLocation
                        ? b.eventTermsSnapshot
                        : "{}",
                      answers: staff.canApproveRegistrations ? b.answers : "{}",
                      receiptPath: staff.canReviewPayments
                        ? b.receiptPath
                        : null,
                      recipientSnapshot: staff.canReviewPayments
                        ? b.recipientSnapshot
                        : null,
                      recipientVersionId: staff.canReviewPayments
                        ? b.recipientVersionId
                        : null,
                      payment: staff.canReviewPayments ? b.payment : null,
                      total: staff.canReviewPayments ? b.total : 0,
                      user: {
                        ...b.user,
                        email: staff.canApproveRegistrations
                          ? b.user.email
                          : "",
                      },
                    })),
            };
          }),
        ),
        verification: me.verification,
        payouts: await db.payout.findMany({
          where: { organizerId: me.id },
          orderBy: { createdAt: "desc" },
        }),
      });
    }
    if (p.startsWith("receipt/")) {
      const me = await requireUser();
      const b = await db.booking.findUniqueOrThrow({
        where: { id: p.split("/")[1] },
        include: { event: true },
      });
      if (b.userId !== me.id)
        await eventPermission(db, me.id, b.eventId, "payments");
      if (!b.receiptPath) return fail("No receipt.", 404);
      const stored = await db.fileUpload.findUnique({
        where: { path: b.receiptPath },
        select: { data: true },
      });
      const file =
        stored?.data ??
        (await readFile(
          path.join(
            process.cwd(),
            "uploads/private",
            path.basename(b.receiptPath),
          ),
        ));
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": b.receiptPath.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
          "Content-Disposition": 'inline; filename="sample-receipt"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (p === "admin") {
      const me = await requireUser();
      if (me.role !== "ADMIN")
        return fail("Administrator access required.", 403);
      const [
        users,
        events,
        bookings,
        verifications,
        promotions,
        reports,
        payments,
        payouts,
        audit,
      ] = await Promise.all([
        db.user.findMany(),
        db.event.findMany(),
        db.booking.findMany(),
        db.organizerVerification.findMany({
          include: { user: { select: { name: true, email: true } } },
        }),
        db.eventPromotion.findMany({ include: { event: true } }),
        db.report.findMany(),
        db.payment.findMany(),
        db.payout.findMany(),
        db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      ]);
      return NextResponse.json({
        users: users.map(safeUser),
        events,
        bookings,
        verifications,
        promotions,
        reports,
        payments,
        payouts,
        audit,
      });
    }
    return fail("Not found.", 404);
  }
  const origin = req.headers.get("origin");
  if (!origin && !isolatedTestData())
    return fail("A same-origin request is required.", 403);
  if (
    origin &&
    origin !== req.nextUrl.origin &&
    origin !== process.env.APP_ORIGIN
  )
    return fail("Request origin is not allowed.", 403);
  if (Number(req.headers.get("content-length") || 0) > 5_500_000)
    return fail("Upload too large.", 413);
  if (p === "upload") {
    const uploader = await requireUser();
    await consumeRateLimit("image-upload", uploader.id, 20, 60000);
    const content = await boundedBody(req, 4_100_000);
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") || "" },
      body: new Uint8Array(content),
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 4_000_000 || file.size === 0)
      return fail("Choose a JPG or PNG under 4 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!jpg && !png && !webp)
      return fail("Only JPG, PNG and WebP images are accepted.");
    if (file.type !== (png ? "image/png" : webp ? "image/webp" : "image/jpeg"))
      return fail("Image content and file type must match.");
    await validateImage(bytes, file.type);
    const isPrivate = form.get("private") === "true";
    if (form.get("purpose") === "PAYMENT_QR") {
      await organizerActor(db, (await requireUser()).id);
      if (!isPrivate) return fail("Payment QR uploads must be private.", 400);
      await consumeRateLimit("qr-upload", (await requireUser()).id, 20, 60000);
    }
    const name = `${randomBytes(20).toString("hex")}.${png ? "png" : webp ? "webp" : "jpg"}`;
    const savedPath = isPrivate ? name : `/api/media/${name.split(".")[0]}`;
    const uploaded = await db.fileUpload.create({
      data: {
        path: savedPath,
        data: bytes,
        mime: png ? "image/png" : webp ? "image/webp" : "image/jpeg",
        userId: (await requireUser()).id,
        private: isPrivate,
      },
    });
    return NextResponse.json({ path: savedPath, id: uploaded.id });
  }
  const data = JSON.parse(
    (
      await boundedBody(
        req,
        p === "event-workspace" || p === "event-draft" ? 600_000 : 100_000,
      )
    ).toString(),
  );
  const authEndpoints = [
    "login",
    "preview/login",
    "admin/login",
    "register",
    "reset-request",
    "reset-password",
  ];
  if (authEndpoints.includes(p)) {
    const trustForwarded =
      isolatedTestData() || process.env.AUTH_TRUST_PROXY === "true";
    const ip = trustForwarded
      ? req.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim()
          .slice(0, 100) || "local"
      : "untrusted-proxy";
    await consumeRateLimit(`auth-ip:${p}`, ip, p === "admin/login" ? 10 : 30);
    const account =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : typeof data.token === "string"
          ? hashToken(data.token)
          : "invalid-input";
    await consumeRateLimit(
      `auth-account:${p}`,
      account,
      p === "admin/login" ? 20 : 30,
    );
  }
  if (p === "login" || p === "admin/login" || p === "preview/login") {
    if ((p === "admin/login" || p === "preview/login") && !origin)
      return fail("A same-origin sign-in request is required.", 403);
    const d = z
      .object({ email: emailInput, password: z.string().min(1).max(128) })
      .strict()
      .parse(data);
    const user = await db.user.findUnique({
      where: { email: d.email.toLowerCase() },
      include: { capabilities: { where: { active: true } } },
    });
    // Compare even for unknown accounts; responses do not reveal administrator existence.
    const matches = await compare(
      d.password,
      user?.passwordHash ||
        "$2b$12$N.1Hr.Yw3oZfB9b0FXgCxO0FLZpAk.MzOTqZfe0bJ69oNbJ7yYh6W",
    );
    if (
      !user ||
      !user.active ||
      !matches ||
      (p === "admin/login" && !isAdmin(user)) ||
      (p === "preview/login" && !isOrganizer(user)) ||
      (process.env.NODE_ENV === "production" && d.email.endsWith("@vibey.demo"))
    )
      return fail("Email or password is incorrect.", 401);
    await createSession(user.id, user);
    return NextResponse.json(safeUser(user));
  }
  if (p === "register") {
    if (
      lab &&
      (typeof data.email !== "string" ||
        !data.email.toLowerCase().endsWith("@example.test"))
    )
      return fail("Use a fictional @example.test email in the Test Lab.", 400);
    const d = registrationInput.parse(data);
    if (!permittedUsername(d.username.toLowerCase()))
      return fail("Choose another username. This name is reserved.");
    const age = ageOn(new Date(d.dob));
    if (age < 13 || age > 110)
      return fail("You must be at least 13 years old.");
    const { password, ...fields } = d;
    const user = await db.user.create({
      data: {
        ...fields,
        email: d.email.toLowerCase(),
        username: d.username.toLowerCase(),
        dob: new Date(d.dob),
        passwordHash: await hash(password, 12),
      },
    });
    await createSession(user.id);
    return NextResponse.json(safeUser(user));
  }
  if (p === "logout") {
    const token = (await cookies()).get("vibey-session")?.value;
    if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
    (await cookies()).delete("vibey-session");
    return NextResponse.json({ ok: true });
  }
  if (p === "demo") {
    if (!isIsolatedDemoEnvironment() || !isLocalDemoRequest(req.nextUrl.origin))
      return fail("Demo switcher is unavailable.", 403);
    const user = await db.user.findUniqueOrThrow({
      where: {
        id: z
          .enum(["attendee", "organizer", "staff", "admin", "sarah"])
          .parse(data.id),
      },
    });
    await createSession(user.id);
    return NextResponse.json(safeUser(user));
  }
  if (p === "reset-request")
    return NextResponse.json(
      await requestRecovery(emailInput.parse(data.email)),
    );
  if (p === "reset-password")
    return NextResponse.json(
      await resetPassword(
        z.string().parse(data.token),
        passwordInput.parse(data.password),
      ),
    );
  if (p === "activity") {
    const d = z
      .object({
        eventId: z.string(),
        kind: z.enum(["VIEW", "PROMOTION_CLICK", "PROMOTION_IMPRESSION"]),
      })
      .parse(data);
    const e = await db.event.findUnique({ where: { id: d.eventId } });
    if (!e || e.status !== "PUBLISHED") return fail("Event unavailable.", 404);
    const key = `activity:${req.headers.get("x-forwarded-for") || "local"}:${d.eventId}:${d.kind}`;
    const l = limits.get(key);
    if (!l || l.until < Date.now()) {
      await db.eventActivity.create({ data: d });
      limits.set(key, { n: 1, until: Date.now() + 10000 });
    }
    return NextResponse.json({ ok: true });
  }
  const me = await requireUser();
  if (p.startsWith("operations/"))
    return NextResponse.json(await operationsPost(me.id, p.slice(11), data));
  if (p.startsWith("event-operations/") || p.startsWith("job-operations/")) {
    await consumeRateLimit("phase7:" + p, me.id, 30, 60000);
    return NextResponse.json(await phase7Post(me.id, p, data));
  }
  const managementResponse = await managementPost(p, me, data);
  if (managementResponse) return managementResponse;
  const mutationLimits: Record<string, number> = {
    invitations: 30,
    "invitations/redeem": 30,
    "invitations/revoke": 30,
    checkin: 300,
    book: 60,
    review: 60,
    refund: 30,
    staff: 30,
    "security/account": 20,
    "event-state": 30,
    "booking/cancel": 60,
    "booking/expire": 60,
    "ticket/revoke": 60,
    "admin-action": 30,
  };
  if (mutationLimits[p])
    await consumeRateLimit(`mutation:${p}`, me.id, mutationLimits[p], 60000);
  if (p === "entrance/preview" || p === "entrance/admit") {
    await consumeRateLimit("entrance", me.id, 300, 60000);
    return NextResponse.json(
      await entranceAction(me.id, data, p === "entrance/admit"),
    );
  }
  if (p === "invitations")
    return NextResponse.json(await createInvitation(me.id, data));
  if (p === "invitations/redeem") {
    const d = z
      .object({
        eventId: z.string().min(1).max(191),
        token: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(data);
    return NextResponse.json(await redeemInvitation(me.id, d.eventId, d.token));
  }
  if (p === "invitations/revoke")
    return NextResponse.json(
      await revokeInvitation(me.id, z.string().min(1).max(191).parse(data.id)),
    );
  if (p === "staff") return NextResponse.json(await setEventStaff(me.id, data));
  if (p === "security/account") {
    const d = z
      .object({
        userId: z.string().min(1).max(191),
        role: z.enum(["ATTENDEE", "ORGANIZER", "STAFF", "ADMIN"]).optional(),
        active: z.boolean().optional(),
        organizerCapability: z.boolean().optional(),
      })
      .strict()
      .parse(data);
    const { userId, ...change } = d;
    await securityChange(me.id, userId, change);
    return NextResponse.json({ ok: true });
  }
  if (p === "event-state")
    return NextResponse.json(
      await updateEventLifecycle(
        me.id,
        z.string().parse(data.eventId),
        z.string().parse(data.status),
      ),
    );
  if (p === "booking/cancel")
    return NextResponse.json(
      await cancelBooking(me.id, z.string().parse(data.bookingId)),
    );
  if (p === "booking/expire")
    return NextResponse.json(
      await expireReservation(me.id, z.string().parse(data.bookingId)),
    );
  if (p === "ticket/revoke")
    return NextResponse.json(
      await revokeTicket(me.id, z.string().parse(data.ticketId)),
    );
  if (p === "save") {
    const id = z.string().parse(data.eventId);
    const key = { userId_eventId: { userId: me.id, eventId: id } };
    const existing = await db.savedEvent.findUnique({ where: key });
    if (existing) await db.savedEvent.delete({ where: key });
    else await db.savedEvent.create({ data: { userId: me.id, eventId: id } });
    return NextResponse.json({ saved: !existing });
  }
  if (p === "book") {
    if (process.env.DEMO_MODE !== "true")
      return fail("Payments are unavailable outside demo mode.", 503);
    const d = z
      .object({
        eventId: z.string(),
        tierId: z.string(),
        quantity: z.number().int().min(1).max(10),
        answers: z.record(z.string(), z.string().max(2000)),
        idempotencyKey: z.string().min(10),
        paymentOutcome: z.enum(["SUCCEEDED", "FAILED"]).optional(),
        receiptPath: z
          .string()
          .regex(/^[a-f0-9]{40}\.(png|jpg)$/)
          .optional(),
      })
      .parse(data);
    if (
      d.receiptPath &&
      !(await db.fileUpload.findFirst({
        where: { path: d.receiptPath, userId: me.id, private: true },
      }))
    )
      return fail("This attachment does not belong to your account.", 403);
    return NextResponse.json(await book(me.id, d));
  }
  if (p === "refund")
    return NextResponse.json(
      await refundBooking(me.id, z.string().parse(data.bookingId)),
    );
  if (p === "review")
    return NextResponse.json(
      await reviewBooking(
        me.id,
        z.string().parse(data.bookingId),
        z.boolean().parse(data.approve),
      ),
    );
  if (p === "checkin") {
    if (data.identityConfirmed !== true)
      return fail(
        "Confirm the guest’s photo ID and entry requirements before check-in.",
      );
    return NextResponse.json(
      await checkIn(
        me.id,
        z.string().parse(data.eventId),
        z.string().min(20).max(100).parse(data.token),
        z.enum(["QR", "MANUAL"]).default("QR").parse(data.method),
      ),
    );
  }
  if (p === "profile") {
    const d = z
      .object({
        website: z
          .string()
          .max(240)
          .refine((value) => {
            if (!value) return true;
            try {
              const url = new URL(value);
              return (
                ["https:", "http:"].includes(url.protocol) &&
                !url.username &&
                !url.password
              );
            } catch {
              return false;
            }
          }, "Enter a complete https:// website address.")
          .optional(),
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_]{3,24}$/)
          .optional(),
        name: z.string().min(2).max(80),
        city: z.string().min(2).max(80),
        bio: z.string().max(400),
        interests: z.string().max(200),
        instagram: z.string().regex(/^[a-zA-Z0-9_.]{0,30}$/),
        tiktok: z
          .string()
          .regex(
            /^$|^https:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]{1,30}\/?$/,
          )
          .optional(),
        instagramPublic: z.boolean(),
        attendancePublic: z.boolean(),
        discoverable: z.boolean(),
        achievementsPublic: z.boolean(),
        photo: z
          .string()
          .regex(
            /^$|^\/api\/media\/[a-f0-9]{40}$|^\/uploads\/[a-f0-9]{40}\.(jpg|png)$|^\/images\/profile-avatar\.jpg$/,
          )
          .optional(),
        cover: z
          .string()
          .regex(
            /^\/api\/media\/[a-f0-9]{40}$|^\/images\/[\w-]+\.(jpg|png)$|^\/uploads\/[a-f0-9]{40}\.(jpg|png)$/,
          )
          .optional(),
        socialNotifications: z.boolean().optional(),
        promotionalNotifications: z.boolean().optional(),
      })
      .parse(data);
    for (const file of [d.photo, d.cover])
      if (
        (file?.startsWith("/uploads/") || file?.startsWith("/api/media/")) &&
        !(await db.fileUpload.findFirst({
          where: { path: file, userId: me.id, private: false },
        }))
      )
        return fail("This image does not belong to your account.", 403);
    if (
      d.username &&
      d.username !== me.username &&
      !permittedUsername(d.username)
    )
      return fail("Choose another username. This name is reserved.");
    if (ageOn(me.dob) < 18) d.discoverable = false;
    try {
      await db.user.update({ where: { id: me.id }, data: d });
    } catch (error: any) {
      if (error?.code === "P2002")
        return fail("That username is already taken. Choose another.", 409);
      throw error;
    }
    return NextResponse.json({ ok: true });
  }
  if (p === "club") {
    const d = z
      .object({
        clubId: z.string(),
        action: z.enum(["join", "leave", "visibility"]),
        public: z.boolean().optional(),
      })
      .parse(data);
    const club = await db.club.findUniqueOrThrow({ where: { id: d.clubId } });
    if (ageOn(me.dob) < club.age)
      return fail("You must meet the club age requirement.", 403);
    if (d.action === "leave")
      await db.clubMembership.deleteMany({
        where: { userId: me.id, clubId: club.id },
      });
    else if (d.action === "join")
      await db.clubMembership.upsert({
        where: { userId_clubId: { userId: me.id, clubId: club.id } },
        create: { userId: me.id, clubId: club.id, public: d.public === true },
        update: {},
      });
    else
      await db.clubMembership.update({
        where: { userId_clubId: { userId: me.id, clubId: club.id } },
        data: { public: d.public === true },
      });
    return NextResponse.json({ ok: true });
  }
  if (p === "attendance-privacy") {
    const d = z
      .object({ bookingId: z.string(), public: z.boolean() })
      .parse(data);
    const b = await db.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
    });
    if (b.userId !== me.id) return fail("Private registration.", 403);
    if (ageOn(me.dob) < 18 && d.public)
      return fail("Attendance discovery is disabled for minor accounts.", 403);
    await db.$transaction([
      db.booking.update({
        where: { id: b.id },
        data: { attendancePublic: d.public },
      }),
      db.attendanceRecord.updateMany({
        where: { userId: me.id, eventId: b.eventId },
        data: { public: d.public },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (p === "attendees") {
    const eventId = z.string().parse(data.eventId);
    if (
      !(await db.attendanceRecord.findUnique({
        where: { userId_eventId: { userId: me.id, eventId } },
      }))
    )
      return fail("Check in to discover opted-in attendees.", 403);
    if (ageOn(me.dob) < 18) return NextResponse.json([]);
    const records = await db.attendanceRecord.findMany({
      where: {
        eventId,
        public: true,
        event: { access: "PUBLIC", status: "PUBLISHED" },
        user: { discoverable: true, attendancePublic: true },
      },
      include: { user: true },
    });
    const people = [];
    for (const r of records)
      try {
        await socialAllowed(me, r.user);
        people.push(publicUser(r.user));
      } catch {}
    return NextResponse.json(people);
  }
  if (p === "notifications") {
    await db.notification.updateMany({
      where: {
        userId: me.id,
        ...(data.id ? { id: z.string().parse(data.id) } : {}),
      },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  if (p === "social") {
    const d = z
      .object({
        targetId: z.string().min(1).max(191),
        action: z.enum([
          "request",
          "accept",
          "reject",
          "cancel",
          "remove",
          "block",
          "unblock",
          "follow",
          "unfollow",
          "report",
        ]),
        reason: z.string().max(1000).optional(),
      })
      .parse(data);
    await socialAction(me.id, d.targetId, d.action, d.reason);
    return NextResponse.json({ ok: true });
  }
  if (p === "message" || p === "club")
    return fail("This feature has been retired.", 410);
  if (p === "event") {
    if (!isIsolatedDemoEnvironment())
      return fail("Use the draft and publication-review workflow.", 403);
    const d = z
      .object({
        title: z.string().min(5).max(120),
        description: z.string().min(20).max(6000),
        category: z.string().min(2).max(50),
        genre: z.string().min(2).max(80),
        city: z.string().min(2).max(80),
        venue: z.string().min(3).max(200),
        privateVenue: z.string().max(300).default(""),
        image: z
          .string()
          .refine(
            (v) =>
              /^\/images\/[\w-]+\.(jpg|png)$/.test(v) ||
              /^\/uploads\/[a-f0-9]{40}\.(jpg|png)$/.test(v) ||
              /^\/api\/media\/[a-f0-9]{40}$/.test(v),
            "Upload artwork or choose a demo image.",
          ),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        age: z.number().int().min(0).max(99),
        capacity: z.number().int().min(1).max(100000),
        access: z.enum(["PUBLIC", "PRIVATE", "INVITATION", "INVITATION_ONLY"]),
        approvalRequired: z.boolean(),
        theme: z.string().max(40),
        status: z.enum(["DRAFT", "PUBLISHED"]),
        price: z.number().int().min(0).max(10000000),
        ticketName: z.string().min(1).max(80),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        tiers: z
          .array(
            z.object({
              name: z.string().min(1).max(80),
              price: z.number().int().min(0).max(10000000),
              quantity: z.number().int().min(1).max(100000),
              maxPerOrder: z.number().int().min(1).max(10).default(4),
            }),
          )
          .min(1)
          .max(10)
          .optional(),
        fields: z
          .array(
            z.object({
              label: z
                .string()
                .min(2)
                .max(80)
                .refine(
                  (v) => !["Full name", "Email", "rules"].includes(v),
                  "This question name is reserved.",
                ),
              type: z.enum([
                "text",
                "textarea",
                "email",
                "tel",
                "select",
                "checkbox",
              ]),
              required: z.boolean(),
              options: z.string().max(1000).default(""),
            }),
          )
          .max(20)
          .optional(),
      })
      .parse(data);
    if (ageOn(me.dob) < 18)
      return fail("You must be 18 or older to create events.", 403);
    if (
      new Date(d.endsAt) <= new Date(d.startsAt) ||
      new Date(d.startsAt) < new Date()
    )
      return fail("Use a future date and an end time after the start.");
    if (
      (d.price > 0 || d.tiers?.some((t) => t.price > 0)) &&
      d.status === "PUBLISHED" &&
      me.verification !== "VERIFIED"
    )
      return fail(
        "Verified organizer status is required to publish paid demo events.",
        403,
      );
    const { price, ticketName, tiers: customTiers, fields, ...event } = d;
    if (event.access === "INVITATION") event.access = "INVITATION_ONLY";
    if (!isIsolatedDemoEnvironment() && event.status === "PUBLISHED")
      event.status = "DRAFT";
    const tiers = customTiers || [
      { name: ticketName, price, quantity: d.capacity, maxPerOrder: 4 },
    ];
    if (tiers.reduce((sum, t) => sum + t.quantity, 0) > d.capacity)
      return fail("Ticket quantities cannot exceed the event capacity.");
    if (new Set(fields?.map((f) => f.label)).size !== (fields?.length || 0))
      return fail("Question names must be unique.");
    if (fields?.some((f) => f.type === "select" && !f.options.trim()))
      return fail("Dropdown questions need comma-separated options.");
    if (data.id) {
      const result = await transaction(async (tx) => {
        const old = await tx.event.findUniqueOrThrow({
          where: { id: z.string().parse(data.id) },
        });
        if (
          old.status !== d.status &&
          ["SUSPENDED", "CANCELLED", "COMPLETED"].includes(old.status)
        )
          throw Error(
            "403:Only an authorized administrator may restore event eligibility.",
          );
        if (old.pendingChangeId)
          throw Error("409:Resolve the pending event change before editing.");
        if (old.organizerId !== me.id)
          throw new Error("403:Only the event organizer can edit this event.");
        if (await tx.booking.count({ where: { eventId: old.id } }))
          throw new Error(
            "409:This event has registrations. Ticket sales can still be paused, but details are locked to protect existing bookings.",
          );
        await tx.event.update({
          where: { id: old.id },
          data: {
            ...event,
            stateVersion: { increment: 1 },
            startsAt: new Date(d.startsAt),
            endsAt: new Date(d.endsAt),
          },
        });
        await tx.eventTicketTier.deleteMany({ where: { eventId: old.id } });
        await tx.eventTicketTier.createMany({
          data: tiers.map((t) => ({ ...t, eventId: old.id })),
        });
        await tx.eventRegistrationField.deleteMany({
          where: { eventId: old.id },
        });
        if (fields?.length)
          await tx.eventRegistrationField.createMany({
            data: fields.map((f) => ({ ...f, eventId: old.id })),
          });
        await audit(tx, me.id, "EVENT_EDITED", old.id, {
          eventId: old.id,
          entityType: "EVENT",
        });
        return { id: old.id, slug: old.slug };
      });
      return NextResponse.json(result);
    }
    const e = await transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          ...event,
          organizerId: me.id,
          origin: isIsolatedDemoEnvironment() ? "DEMO" : "LEGACY_DEMO",
          testOnly: true,
          slug: `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(3).toString("hex")}`,
          startsAt: new Date(d.startsAt),
          endsAt: new Date(d.endsAt),
          tiers: { create: tiers },
          fields: { create: fields || [] },
        },
      });
      await audit(tx, me.id, "EVENT_CREATED", created.id, {
        eventId: created.id,
        entityType: "EVENT",
        newState: created.status,
      });
      return created;
    });
    return NextResponse.json({ id: e.id, slug: e.slug });
  }
  if (p === "pause") {
    const e = await authorizeEvent(data.eventId, me.id);
    if (e.pendingChangeId)
      throw Error(
        "409:Resolve the pending event change before changing sales availability.",
      );
    await transaction(async (tx) => {
      const current = await tx.event.findUniqueOrThrow({ where: { id: e.id } });
      if (current.pendingChangeId || current.stateVersion !== e.stateVersion)
        throw Error("409:Event changed. Reload.");
      await tx.event.update({
        where: { id: e.id },
        data: { salesPaused: !e.salesPaused, stateVersion: { increment: 1 } },
      });
      await audit(tx, me.id, "EVENT_SALES_PAUSE_CHANGED", e.id, {
        eventId: e.id,
        entityType: "EVENT",
        previousState: String(e.salesPaused),
        newState: String(!e.salesPaused),
      });
    });
    return NextResponse.json({ ok: true });
  }
  if (p === "verification") {
    if (me.verification === "VERIFIED")
      return fail("You are already verified.");
    await db.$transaction([
      db.organizerVerification.create({
        data: {
          userId: me.id,
          note: z.string().min(10).max(1000).parse(data.note),
        },
      }),
      db.user.update({
        where: { id: me.id },
        data: { verification: "PENDING_REVIEW" },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (p === "payout") {
    if (process.env.DEMO_MODE !== "true")
      return fail("Only simulated settlement is supported.", 503);
    const result = await db.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({
        where: {
          status: "SUCCEEDED",
          payoutId: null,
          amount: { gt: 0 },
          booking: { status: "APPROVED", event: { organizerId: me.id } },
        },
      });
      if (!payments.length)
        throw new Error("400:No unsettled approved demo revenue is available.");
      const amount = payments.reduce((sum, p) => sum + p.amount - p.fee, 0);
      const payout = await tx.payout.create({
        data: { organizerId: me.id, amount },
      });
      const changed = await tx.payment.updateMany({
        where: {
          id: { in: payments.map((p) => p.id) },
          payoutId: null,
          status: "SUCCEEDED",
        },
        data: { payoutId: payout.id },
      });
      if (changed.count !== payments.length)
        throw new Error("409:Settlement changed. Try again.");
      await tx.adminAuditLog.create({
        data: {
          userId: me.id,
          action: "DEMO_PAYOUT_REQUESTED",
          targetId: payout.id,
        },
      });
      return payout;
    });
    return NextResponse.json(result);
  }
  if (p === "promotion") {
    const e = await authorizeEvent(data.eventId, me.id);
    const packs: Record<string, number> = {
      "Homepage Spotlight": 9900,
      "City Spotlight": 4900,
      "Category Spotlight": 2900,
    };
    const pack = z.string().parse(data.package);
    if (!packs[pack] || process.env.DEMO_MODE !== "true")
      return fail("Invalid demo package.");
    await db.eventPromotion.create({
      data: { eventId: e.id, package: pack, amount: packs[pack] },
    });
    return NextResponse.json({ ok: true });
  }
  if (p === "activity") {
    const d = z
      .object({
        eventId: z.string(),
        kind: z.enum(["VIEW", "PROMOTION_CLICK"]),
      })
      .parse(data);
    await db.eventActivity.create({ data: d });
    return NextResponse.json({ ok: true });
  }
  if (p === "report-event") {
    await db.report.create({
      data: {
        userId: me.id,
        targetId: z.string().parse(data.eventId),
        reason: z.string().min(3).max(1000).parse(data.reason),
      },
    });
    return NextResponse.json({ ok: true });
  }
  if (p === "deactivate") {
    await transaction(async (tx) => {
      await tx.user.update({
        where: { id: me.id },
        data: {
          active: false,
          discoverable: false,
          securityVersion: { increment: 1 },
        },
      });
      await tx.session.deleteMany({ where: { userId: me.id } });
      await audit(tx, me.id, "ACCOUNT_DEACTIVATED", me.id, {
        entityType: "USER",
        previousState: "ACTIVE",
        newState: "INACTIVE",
      });
    });
    (await cookies()).delete("vibey-session");
    return NextResponse.json({ ok: true });
  }
  if (p === "admin-action") {
    if (me.role !== "ADMIN") return fail("Administrator access required.", 403);
    if (
      process.env.NODE_ENV === "production" &&
      ["payout", "promotion"].includes(data.kind)
    )
      return fail(
        "Financial actions are unavailable until separately approved.",
        503,
      );
    const d = z
      .object({
        kind: z.enum([
          "verification",
          "promotion",
          "report",
          "payout",
          "event",
        ]),
        id: z.string(),
        approve: z.boolean(),
      })
      .parse(data);
    if (d.kind === "event") {
      await updateEventLifecycle(
        me.id,
        d.id,
        d.approve ? "PUBLISHED" : "SUSPENDED",
      );
      return NextResponse.json({ ok: true });
    }
    await transaction(async (tx) => {
      let previousState: string | undefined;
      if (d.kind === "verification") {
        previousState = (
          await tx.organizerVerification.findUniqueOrThrow({
            where: { id: d.id },
          })
        ).status;
        const v = await tx.organizerVerification.update({
          where: { id: d.id },
          data: { status: d.approve ? "VERIFIED" : "REJECTED" },
        });
        await tx.user.update({
          where: { id: v.userId },
          data: { verification: d.approve ? "VERIFIED" : "REJECTED" },
        });
      }
      if (d.kind === "promotion")
        await tx.eventPromotion.update({
          where: { id: d.id },
          data: { status: d.approve ? "APPROVED" : "REJECTED" },
        });
      if (d.kind === "report")
        await tx.report.update({
          where: { id: d.id },
          data: { status: "RESOLVED" },
        });
      if (d.kind === "payout") {
        const p = await tx.payout.findUniqueOrThrow({ where: { id: d.id } });
        if (p.status !== "PENDING")
          throw new Error("409:Payout has already been reviewed.");
        await tx.payout.update({
          where: { id: d.id },
          data: { status: d.approve ? "COMPLETED" : "REJECTED" },
        });
        if (!d.approve)
          await tx.payment.updateMany({
            where: { payoutId: d.id },
            data: { payoutId: null },
          });
      }
      await audit(
        tx,
        me.id,
        `${d.kind.toUpperCase()}_${d.approve ? "APPROVED" : "REJECTED"}`,
        d.id,
        {
          entityType: d.kind.toUpperCase(),
          previousState,
          newState:
            d.kind === "verification"
              ? d.approve
                ? "VERIFIED"
                : "REJECTED"
              : d.approve
                ? "APPROVED"
                : "REJECTED",
        },
      );
    });
    return NextResponse.json({ ok: true });
  }
  return fail("Unknown action.", 404);
}
async function route(req: NextRequest) {
  let response: NextResponse;
  try {
    response = await handle(req);
  } catch (e: any) {
    const unavailable = infrastructureFailure(e);
    if (unavailable) response = fail(unavailable.message, unavailable.status);
    else if (e instanceof SyntaxError) response = fail("Invalid request data.");
    else if (e instanceof z.ZodError)
      response = fail(e.issues[0]?.message || "Check the form fields.");
    else if (e.code === "P2002")
      response = fail("That email, username, or record already exists.", 409);
    else if (e.code === "P2025") response = fail("Record not found.", 404);
    else {
      const m = e.message || "Something went wrong.";
      const match = m.match(/^(\d{3}):(.*)$/);
      if (match) response = fail(match[2], Number(match[1]));
      else {
        console.error("API request failed", {
          code: typeof e?.code === "string" ? e.code : "INTERNAL_ERROR",
        });
        response = fail(
          "Unable to complete this request. Please try again.",
          500,
        );
      }
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const GET = route;
export const POST = route;
