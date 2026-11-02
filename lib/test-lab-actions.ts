import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { db } from "./db";
import {
  assertLabEnvironment,
  labContext,
  labLogin,
  switchLabPersona,
  switchLabWorkspace,
  endLab,
  labRoles,
  type LabRole,
} from "./test-lab";
import { boundedBody } from "./request-security";
import { consumeRateLimit } from "./security";
import { saveEventDraft, submitEvent } from "./event-management";
import { updateEventLifecycle, approveRegistration } from "./booking-domain";
import { reviewPayment, submitPaymentEvidence } from "./payment-foundation";
import { setEventStaff } from "./staff-permissions";
import { entranceAction } from "./entrance";
import { requestRefund, reviewRefund, supportRequest } from "./operations";
import { requestEventChange, reviewEventChange } from "./event-operations";
import { localDateTime } from "./event-config";
import { readFile, readdir } from "node:fs/promises";
import { cookies } from "next/headers";
import { transaction, audit, eventPermission } from "./domain-core";
import { classifyPage } from "./access-policy";
const opts = {
  headers: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  },
};
const json = (x: unknown) => NextResponse.json(x, opts);
export async function testLabRoute(request: Request) {
  try {
    await assertLabEnvironment(request);
    const data =
      request.method === "POST"
        ? JSON.parse((await boundedBody(request, 24000)).toString())
        : {};
    const action = new URL(request.url).pathname.split("/").at(-1);
    if (action === "enter" && request.method === "GET") {
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw Error("403:Open the local preview directly.");
      await labLogin(request);
      const url = new URL(request.url);
      const next = url.searchParams.get("next") || "/explore";
      const target = new URL(next, url.origin);
      const allowed =
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !/[\\\u0000-\u001f]/.test(next) &&
        target.origin === url.origin &&
        (target.pathname === "/test-lab" ||
          classifyPage(target.pathname) !== "UNKNOWN");
      return NextResponse.redirect(
        allowed ? target : new URL("/explore", url.origin),
        { status: 303, ...opts },
      );
    }
    if (action === "login" && request.method === "POST") {
      await labLogin(request);
      return json({ ok: true });
    }
    const { marker, user, role } = await labContext(request);
    if (request.method === "POST")
      await consumeRateLimit("test-lab-action", marker.ownerId, 100);
    if (["activate-organizer", "cancel-subscription"].includes(action || ""))
      throw Error("410:Subscriptions are retired. Use Create Event for free organizer access.");
    if (action === "workspace" && request.method === "POST") {
      const d = z
        .object({ workspace: z.enum(["Customer", "Organizer", "Admin"]) })
        .strict()
        .parse(data);
      await switchLabWorkspace(request, d.workspace);
      return json({ ok: true });
    }
    if (action === "private-invitation" && request.method === "POST") {
      if (!user || user.id !== marker.personas.Customer)
        throw Error("403:Use the fictional customer workspace.");
      const simulator = (
        await import("./simulator-policy")
      ).simulatorEnvironment();
      const fresh = simulator
        ? await db.event.findFirst({
            where: {
              organizerId: user.id,
              testOnly: true,
              paymentMode: "TEST_SIMULATOR",
              access: "INVITATION_ONLY",
              status: "PUBLISHED",
              configurationStatus: "FICTIONAL_APPROVED",
            },
            orderBy: { createdAt: "desc" },
          })
        : null;
      const event =
        fresh ||
        (await db.event.findUnique({
          where: { creationKey: "a9846e4a-006a-4cc2-9800-000000000002" },
        }));
      if (
        !event ||
        !event.testOnly ||
        (event.organizerId !== marker.personas.Organizer &&
          event.id !== fresh?.id) ||
        event.status !== "PUBLISHED"
      )
        throw Error("404:Fictional private invitation unavailable.");
      const invite = await (
        await import("./invitations")
      ).createInvitation(event.organizerId, {
        eventId: event.id,
        inviteeId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      });
      return json({ url: "/join/" + event.slug + "#invite=" + invite.token });
    }
    if (action === "switch" && request.method === "POST") {
      await switchLabPersona(request, data.role);
      return json({ ok: true });
    }
    if (action === "logout" && request.method === "POST") {
      await endLab();
      return json({ ok: true });
    }
    if (action === "mailbox" && request.method === "POST") {
      const email = z
        .string()
        .email()
        .refine((v) => v.endsWith("@example.test"))
        .parse(data.email);
      const account = await db.user.findUnique({ where: { email } });
      if (
        !account ||
        account.role !== "ATTENDEE" ||
        Object.values(marker.personas).includes(account.id) ||
        account.id === marker.ownerId
      )
        throw Error("404:No signup-customer recovery mail.");
      const files = await readdir(process.cwd() + "/.local/mail").catch(
        () => [],
      );
      for (const file of files.reverse()) {
        if (!/^[a-f0-9]{32}\.json$/.test(file)) continue;
        const mail = JSON.parse(
          await readFile(process.cwd() + "/.local/mail/" + file, "utf8"),
        );
        if (mail.recipient === email && new Date(mail.expires) > new Date())
          return json({ token: mail.token });
      }
      throw Error(
        "404:Request password recovery for this fictional signup account first.",
      );
    }
    const ownEvents = await db.event.findMany({
      where: { organizerId: marker.personas.Organizer, testOnly: true },
      include: { tiers: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const selected = (await cookies()).get("mm-lab-event")?.value;
    const e =
      ownEvents.find((e) => e.id === (data.eventId || selected)) ||
      (!data.eventId ? ownEvents[0] : null);
    const permitted = (roles: LabRole[]) => {
      if (!user || !roles.some((r) => marker.personas[r] === user.id))
        throw Error("403:Switch to " + roles.join(" or ") + " for this step.");
      return user.id;
    };
    if (action === "state" && request.method === "GET") {
      let canSeeBooking = !!user && role !== "Community Friend";
      if (e && user && ["Finance Reviewer", "Entrance Staff"].includes(role)) {
        try {
          await eventPermission(
            db,
            user.id,
            e.id,
            role === "Finance Reviewer" ? "payments" : "checkin",
          );
        } catch {
          canSeeBooking = false;
        }
      }
      const b =
        e && canSeeBooking
          ? await db.booking.findFirst({
              where: {
                eventId: e.id,
                userId:
                  role === "Signup customer"
                    ? user!.id
                    : marker.personas.Customer,
              },
              orderBy: { createdAt: "desc" },
              include: {
                tickets: { include: { checkIn: true } },
                payment: {
                  include: {
                    evidence: { orderBy: { createdAt: "desc" }, take: 1 },
                    refunds: true,
                  },
                },
              },
            })
          : null;
      const notices = user
        ? await db.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              title: true,
              body: true,
              link: true,
              read: true,
            },
          })
        : [];
      const changes = e
        ? await db.eventChange.findMany({
            where: { eventId: e.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, kind: true, status: true, reason: true },
          })
        : [];
      const canReview = [
        "Organizer",
        "Administrator",
        "Finance Reviewer",
      ].includes(role);
      const support = await db.report.findMany({
        where: {
          ...(role === "Administrator" ? {} : { userId: user?.id || "NONE" }),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, status: true, reason: true },
      });
      return json({
        role,
        simulatorEnabled: (
          await import("./simulator-policy")
        ).simulatorEnvironment(),
        workspace:
          (await cookies()).get("mm-lab-workspace")?.value ||
          (role === "Administrator" ? "Admin" : role),
        identity: user ? { name: user.name, role: user.role } : null,
        roles: labRoles,
        events: ownEvents.map((x) => ({
          id: x.id,
          title: x.title,
          status: x.status,
          slug: x.slug,
        })),
        event: e
          ? {
              id: e.id,
              title: e.title,
              slug: e.slug,
              status: e.status,
              startsAt: e.startsAt,
              termsVersion: e.termsVersion,
              reviewOutcome: e.reviewOutcome,
              tiers: e.tiers.map((t) => ({
                id: t.id,
                name: t.name,
                price: t.price,
                available: t.quantity - t.sold,
              })),
            }
          : null,
        booking: b
          ? {
              id: b.id,
              quantity: b.quantity,
              lifecycle: b.lifecycle,
              paymentState: b.paymentState,
              registrationState: b.registrationState,
              total: canReview || role === "Customer" ? b.total : null,
              tickets: b.tickets.map((t) => ({
                id: t.id,
                status: t.status,
                checkedIn: !!t.checkIn,
              })),
              evidenceId: canReview ? b.payment?.evidence[0]?.id : undefined,
              refund: b.payment?.refunds[0]
                ? {
                    id: b.payment.refunds[0].id,
                    status: b.payment.refunds[0].status,
                    version: b.payment.refunds[0].version,
                  }
                : null,
            }
          : null,
        notifications: notices,
        changes,
        support,
      });
    }
    if (request.method !== "POST") throw Error("404:Not found.");
    if (action === "select") {
      if (!e) throw Error("404:Scenario unavailable.");
      (await cookies()).set("mm-lab-event", e.id, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      return json({ ok: true });
    }
    if (action === "create") {
      const uid = permitted(["Organizer"]);
      const d = z
        .object({
          title: z.string().trim().min(5).max(85),
          startsLocal: z.string(),
          endsLocal: z.string(),
          capacity: z.number().int().min(2).max(1000),
          price: z.number().int().min(0).max(100000),
          city: z.string().trim().min(2).max(80),
          venue: z.string().trim().min(2).max(150),
          category: z.enum([
            "House Party",
            "Nightclub",
            "Live Music",
            "Music Festival",
            "Private Party",
            "Concert",
          ]),
          image: z.enum([
            "/images/neon.jpg",
            "/images/rooftop.jpg",
            "/images/live.jpg",
            "/images/social.jpg",
            "/images/halloween.jpg",
          ]),
        })
        .parse(data);
      const { price, ...values } = d;
      const event = await saveEventDraft(uid, {
        ...values,
        title: "TEST · " + d.title,
        creationKey: randomUUID(),
        description:
          "A fictional local MixerMates event for the owner to test booking, independent payment review and ticket admission. No real venue, money or admission.",
        genre: "House",
        privateVenue: "FICTIONAL studio. No real address.",
        access: "PUBLIC",
        locationVisibility: "HIDDEN",
        age: 18,
        approvalRequired: true,
        idCheckRequired: true,
        policies:
          "Fictional sandbox only. Refunds require independent review; no money moves.",
        paymentDestinationId: marker.destinationId,
        tiers: [
          {
            name: "General admission",
            price: d.price,
            quantity: d.capacity,
            maxPerOrder: 4,
          },
        ],
        fields: [{ label: "Full name as on IC", type: "text", required: true }],
      });
      await db.event.update({
        where: { id: event.id },
        data: {
          sourceConfiguration: JSON.stringify({
            testLab: true,
            nonce: marker.nonce,
          }),
          refundPolicy: JSON.stringify({
            kind: "REVIEW_REQUIRED",
            terms:
              "Fictional refunds may be requested before attendance and require independent human review. No real funds exist.",
            deadline: null,
            allowAfterChange: true,
          }),
        },
      });
      await setEventStaff(uid, {
        eventId: event.id,
        userId: marker.personas["Finance Reviewer"],
        active: true,
        canReviewPayments: true,
      });
      await setEventStaff(uid, {
        eventId: event.id,
        userId: marker.personas["Entrance Staff"],
        active: true,
        canCheckIn: true,
        canViewGuests: true,
      });
      (await cookies()).set("mm-lab-event", event.id, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
      return json({
        ok: true,
        message: "Fictional draft saved. Submit it for independent review.",
      });
    }
    if (!e || !e.testOnly || e.id === "halloween")
      throw Error("404:Choose a fictional Test Lab event.");
    if (action === "submit") {
      await submitEvent(permitted(["Organizer"]), e.id);
      return json({ ok: true });
    }
    if (action === "approve") {
      const uid = permitted(["Administrator"]);
      if (uid === e.organizerId)
        throw Error("403:Independent event review required.");
      await updateEventLifecycle(uid, e.id, "PUBLISHED", {
        notes:
          "Explicit fictional local Test Lab review. No real sales authorized.",
        reviewerId: uid,
        outcome: "APPROVED",
      });
      for (const [role, permissions] of [
        ["Finance Reviewer", { canReviewPayments: true }],
        ["Entrance Staff", { canCheckIn: true, canViewGuests: true }],
      ] as const) {
        const existing = await db.eventStaff.findUnique({
          where: {
            eventId_userId: { eventId: e.id, userId: marker.personas[role] },
          },
        });
        if (!existing?.active)
          await setEventStaff(uid, {
            eventId: e.id,
            userId: marker.personas[role],
            active: true,
            ...permissions,
          });
      }
      await transaction(async (tx) => {
        const current = await tx.event.findUniqueOrThrow({
          where: { id: e.id },
        });
        if (
          current.status !== "PUBLISHED" ||
          current.reviewedById !== uid ||
          current.organizerId !== marker.personas.Organizer ||
          !current.testOnly
        )
          throw Error("409:Event review changed.");
        // REAL is the existing domain's approval-driven workflow discriminator, not a live-sales grant.
        // The persistent testOnly/FICTIONAL_APPROVED flags and guarded local customer environment remain mandatory.
        await tx.event.update({
          where: { id: e.id },
          data: { origin: "REAL", configurationStatus: "FICTIONAL_APPROVED" },
        });
        await audit(tx, uid, "TEST_LAB_SCENARIO_AUTHORIZED", e.id, {
          eventId: e.id,
          entityType: "EVENT",
        });
      });
      return json({ ok: true });
    }
    if (action === "reject") {
      await updateEventLifecycle(permitted(["Administrator"]), e.id, "DRAFT", {
        notes: "Fictional event returned for changes.",
        reviewerId: user!.id,
        outcome: "CHANGES_REQUESTED",
      });
      return json({ ok: true });
    }
    const booking = await db.booking.findFirst({
      where: { eventId: e.id, userId: marker.personas.Customer },
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          include: {
            evidence: { orderBy: { createdAt: "desc" } },
            refunds: true,
          },
        },
        tickets: true,
      },
    });
    if (action === "sample-proof") {
      const uid = permitted(["Customer"]);
      if (!booking) throw Error("409:Book a ticket first.");
      const file = await db.fileUpload.create({
        data: {
          userId: uid,
          private: true,
          path: "test-lab-proof-" + randomUUID(),
          mime: "image/png",
          data: Uint8Array.from(
            await QRCode.toBuffer(
              "TEST PAYMENT EVIDENCE ONLY · NO MONEY · " +
                booking.id +
                " · " +
                randomUUID(),
            ),
          ),
        },
      });
      await submitPaymentEvidence(uid, booking.id, file.id, "PAYMENT", {
        claimedAmount: booking.total,
        paymentReference: "FICTIONAL-" + randomUUID(),
        claimedRecipient: "FICTIONAL MixerMates Test Recipient",
      });
      return json({
        ok: true,
        message: "TEST evidence submitted. Funds are still unconfirmed.",
      });
    }
    if (action === "confirm-payment") {
      const uid = permitted(["Finance Reviewer"]);
      if (!booking?.payment?.evidence[0])
        throw Error("409:Customer must submit evidence first.");
      if (data.confirmed !== true)
        throw Error("400:Explicitly confirm fictional funds received.");
      await reviewPayment(uid, booking.id, {
        evidenceId: booking.payment.evidence[0].id,
        decision: "CONFIRMED",
        fundsVerified: true,
        receivedAmount: booking.total,
        notes: "Independent FICTIONAL funds confirmation. No money moved.",
      });
      return json({ ok: true });
    }
    if (action === "approve-registration") {
      if (!booking) throw Error("409:Book a ticket first.");
      await approveRegistration(
        permitted(["Organizer", "Administrator"]),
        booking.id,
        true,
        "Fictional independent registration review",
      );
      return json({ ok: true });
    }
    if (action === "entrance-preview" || action === "admit") {
      const uid = permitted(["Entrance Staff"]);
      const ticket = booking?.tickets[0];
      if (!ticket) throw Error("409:No eligible ticket has been issued.");
      const result = await entranceAction(
        uid,
        {
          eventId: e.id,
          ticketId: ticket.id,
          method: "MANUAL",
          ...(action === "admit"
            ? { identityConfirmed: data.confirmed === true }
            : {}),
        },
        action === "admit",
      );
      return json(result);
    }
    if (action === "refund-request") {
      if (!booking) throw Error("409:Book a ticket first.");
      await requestRefund(permitted(["Customer"]), {
        bookingId: booking.id,
        reason: "Fictional customer refund request. No real money.",
      });
      return json({ ok: true });
    }
    if (action === "refund-step") {
      const refund = booking?.payment?.refunds[0];
      if (!refund) throw Error("409:Request a refund first.");
      const target = z
        .enum([
          "APPROVED",
          "REJECTED",
          "AWAITING_ORGANIZER_TRANSFER",
          "TRANSFER_REPORTED",
          "REFUND_CONFIRMED",
        ])
        .parse(data.status);
      const uid = permitted(
        target === "REFUND_CONFIRMED"
          ? ["Customer"]
          : ["Finance Reviewer", "Administrator"],
      );
      await reviewRefund(uid, {
        id: refund.id,
        version: refund.version,
        status: target,
        notes: "Fictional local refund review. No real bank transfer.",
        ...(target === "TRANSFER_REPORTED"
          ? { transferReference: "FICTIONAL-TRANSFER-" + randomUUID() }
          : {}),
        ...(target === "REFUND_CONFIRMED"
          ? { received: data.confirmed === true }
          : {}),
      });
      return json({ ok: true });
    }
    if (action === "reschedule") {
      const uid = permitted(["Organizer"]);
      const start = new Date(+e.startsAt + 86400000),
        end = new Date(+e.endsAt + 86400000);
      await requestEventChange(uid, {
        eventId: e.id,
        version: e.termsVersion,
        reason: "Fictional test: move this event one day later.",
        values: {
          startsLocal: localDateTime(start.toISOString(), e.timezone),
          endsLocal: localDateTime(end.toISOString(), e.timezone),
          venue: e.venue,
          privateVenue: e.privateVenue,
          city: e.city,
          latitude: e.latitude,
          longitude: e.longitude,
          entryInstructions: e.entryInstructions,
        },
      });
      return json({ ok: true });
    }
    if (action === "review-change") {
      const uid = permitted(["Administrator"]);
      const change = await db.eventChange.findFirst({
        where: { eventId: e.id, status: "PENDING_REVIEW" },
      });
      if (!change) throw Error("409:No pending change.");
      await reviewEventChange(uid, {
        id: change.id,
        approve: data.approve === true,
        notes: "Independent fictional event change review.",
      });
      return json({ ok: true });
    }
    if (action === "support") {
      const uid = permitted(["Customer"]);
      await supportRequest(uid, {
        category: "OTHER",
        description: z.string().min(10).max(1500).parse(data.message),
        ...(booking ? { bookingId: booking.id } : {}),
      });
      return json({ ok: true });
    }
    throw Error("404:Not found.");
  } catch (error: any) {
    const m = error?.message || "";
    const matched = m.match(/^(\d{3}):(.*)$/s);
    return NextResponse.json(
      {
        error: matched
          ? matched[2]
          : error instanceof z.ZodError
            ? error.issues[0]?.message
            : "The test step could not finish. Check its prerequisites and try again.",
      },
      {
        ...opts,
        status: matched
          ? +matched[1]
          : error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 500,
      },
    );
  }
}
