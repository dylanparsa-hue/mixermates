import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { secretHash } from "../lib/security";
import { activateOrganizer } from "../lib/organizer-identity";
import { slugBase } from "../lib/automatic-slugs";
import { eventWizardErrors } from "../lib/event-wizard-validation";
import { localDateTime } from "../lib/event-config";
import { hash } from "bcryptjs";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL || "";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  Object.keys(process.env).some((k) => k.startsWith("DB_"))
)
  throw Error("Owned isolated loopback fixture required.");

test("readable slug normalization handles accents, unsafe/reserved names and empty titles", () => {
  for (const [name, want] of [
    [" Néon / After Dark! ", "neon-after-dark"],
    ["admin", "event"],
    ["../api", "event"],
    ["💜", "event"],
    ["a".repeat(100), "a".repeat(64)],
  ])
    assert.equal(slugBase(name), want);
});
test("shared validation rejects the step-skipping paths and malformed prices", () => {
  const d: any = {};
  assert(eventWizardErrors(d, 0).title);
  assert(eventWizardErrors(d, 1).tiers);
  const input = complete("Shared validation");
  const missingShort = {
    ...input,
    shortDescription: "",
    description:
      "A long optional description cannot replace the required short summary.",
  };
  assert(eventWizardErrors(missingShort, 0).shortDescription);
  input.tiers[0].priceInput = "1.999";
  assert(eventWizardErrors(input, 1)["tier-0-price"]);
  input.startsLocal = "2020-01-01T12:00";
  assert.equal(
    eventWizardErrors(input, 0).startsLocal,
    "Choose a future date.",
  );
  input.endsLocal = input.startsLocal;
  assert.equal(
    eventWizardErrors(input, 0).endsLocal,
    "End time must be after start time.",
  );
});
function complete(title: string): any {
  return {
    creationKey: randomUUID(),
    title,
    category: "House Party",
    shortDescription: "A clearly fictional local organizer test event.",
    description: "A clearly fictional local organizer test event.",
    startsLocal: localDateTime(new Date(Date.now() + 7 * 86400000)),
    endsLocal: localDateTime(new Date(Date.now() + 7 * 86400000 + 7200000)),
    timezone: "Asia/Kuala_Lumpur",
    city: "Test City",
    venue: "Fictional public area",
    privateVenue: "PRIVATE-PHASE1-ADDRESS",
    access: "PUBLIC",
    locationVisibility: "HIDDEN",
    capacity: 20,
    image: "/images/neon.jpg",
    coverImage: "/images/sunset.jpg",
    tiers: [
      {
        name: "Free RSVP",
        description: "",
        price: 0,
        priceInput: "0.00",
        pricingMode: "FREE",
        currency: "MYR",
        quantity: 20,
        minPerOrder: 1,
        maxPerOrder: 4,
        sortOrder: 0,
        availability: "AVAILABLE",
        saleStart: null,
        saleEnd: null,
      },
    ],
  };
}
test("Phase 1 same-account organizer, secure three-step creator, artwork, review and compatibility", async (t) => {
  const prefix = "oc" + randomUUID().replaceAll("-", "").slice(0, 10),
    users: string[] = [],
    events: string[] = [],
    files: string[] = [];
  const password = "FictionalCreator!2026";
  const user = async (role = "ATTENDEE", name = "Alex Fictional") => {
    const id = prefix + users.length;
    users.push(id);
    return db.user.create({
      data: {
        id,
        email: id + "@example.test",
        username: id,
        name,
        passwordHash: await hash(password, 4),
        dob: new Date("1995-01-01"),
        city: "Test City",
        role,
      },
    });
  };
  const customer = await user(),
    other = await user(),
    admin = await user("ADMIN"),
    minor = await user();
  await db.user.update({
    where: { id: minor.id },
    data: { dob: new Date(Date.now() - 15 * 365.25 * 86400000) },
  });
  const call = async (route: string, who: any, data?: any) => {
    let cookie = "";
    if (who) {
      const token = randomBytes(32).toString("hex"),
        u = await db.user.findUniqueOrThrow({ where: { id: who.id } });
      await db.session.create({
        data: {
          id: secretHash(token),
          userId: who.id,
          securityVersion: u.securityVersion,
          expires: new Date(Date.now() + 3600000),
        },
      });
      cookie = "vibey-session=" + token;
    }
    const r = await fetch(base + "/api/" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        Origin: base,
        Cookie: cookie,
        ...(data instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        "x-forwarded-for": prefix,
      },
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    });
    return {
      status: r.status,
      data: r.headers.get("content-type")?.includes("json")
        ? await r.json()
        : await r.text(),
    };
  };
  let draft: any,
    payload = complete(prefix + " Neon after dark"),
    booking: any,
    ticket: any;
  const current = async () => {
    const e = await db.event.findUniqueOrThrow({
      where: { id: draft.id },
      include: { creatorState: true },
    });
    return {
      ...JSON.parse(e.creatorState!.payload),
      id: e.id,
      version: e.stateVersion,
    };
  };
  try {
    await t.test(
      "a real fictional password sign-in keeps the customer identity",
      async () => {
        const r = await call("login", null, {
          email: customer.email,
          password,
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        assert.equal(r.data.id, customer.id);
      },
    );
    const legacy = await db.event.findFirstOrThrow({
      include: { tiers: true },
      where: { tiers: { some: {} } },
    });
    booking = await db.booking.create({
      data: {
        userId: customer.id,
        eventId: legacy.id,
        tierId: legacy.tiers[0].id,
        total: 0,
        idempotencyKey: prefix + "legacy",
      },
    });
    ticket = await db.ticket.create({
      data: { bookingId: booking.id, token: prefix + "legacy-ticket" },
    });
    const before = await db.user.findUniqueOrThrow({
      where: { id: customer.id },
    });
    await t.test(
      "activation is idempotent under concurrency, preserves role/email/password/bookings, and never verifies or subscribes",
      async () => {
        assert.equal((await call("become-organizer", null, {})).status, 401);
        assert.equal((await call("become-organizer", minor, {})).status, 403);
        await Promise.all([
          activateOrganizer(customer.id),
          activateOrganizer(customer.id),
          activateOrganizer(customer.id),
        ]);
        assert.equal(
          (await call("become-organizer", customer, {})).status,
          200,
        );
        const after = await db.user.findUniqueOrThrow({
          where: { id: customer.id },
        });
        assert.deepEqual(after, before);
        assert.equal(
          await db.organizerIdentity.count({ where: { userId: customer.id } }),
          1,
        );
        assert.equal(
          await db.organizerSubscription.count({
            where: { userId: customer.id },
          }),
          0,
        );
        assert.equal(
          (await db.booking.findUniqueOrThrow({ where: { id: booking.id } }))
            .userId,
          customer.id,
        );
        assert.equal(
          (await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }))
            .token,
          ticket.token,
        );
      },
    );
    await t.test(
      "organizer names collide safely and later edits keep their automatic URL stable",
      async () => {
        const a = await db.organizerIdentity.findUniqueOrThrow({
          where: { userId: customer.id },
        });
        await activateOrganizer(other.id);
        const b = await db.organizerIdentity.findUniqueOrThrow({
          where: { userId: other.id },
        });
        assert.match(a.slug, /^alex-fictional(?:-\d+)?$/);
        assert.notEqual(b.slug, a.slug);
        const renamed = await call("organizer-identity", customer, {
          name: "Alex Updated",
        });
        assert.equal(renamed.status, 200);
        assert.equal(renamed.data.slug, a.slug);
        assert.equal(
          (await call("become-organizer", customer, { role: "ADMIN" })).status,
          400,
        );
      },
    );
    await t.test(
      "every server advance validates prior content even when clients forge advanceTo",
      async () => {
        for (const advanceTo of [1, 2]) {
          const r = await call("event-workspace", customer, {
            draft: { creationKey: randomUUID() },
            advanceTo,
          });
          assert.equal(r.status, 400);
          assert(r.data.fieldErrors.title);
          assert.equal(r.data.step, 0);
        }
        assert.equal(
          (
            await call("event-workspace", other, {
              draft: payload,
              advanceTo: 4,
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "unfinished draft saves/resumes incomplete dates and empty ticket names without invented schedule",
      async () => {
        const r = await call("event-workspace", customer, {
          draft: {
            ...payload,
            startsLocal: "",
            endsLocal: "",
            tiers: [{ ...payload.tiers[0], name: "", quantity: 0 }],
          },
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        draft = r.data.event;
        events.push(draft.id);
        const setup = await call("setup", customer),
          stored = setup.data.events.find((e: any) => e.id === draft.id);
        assert.equal(JSON.parse(stored.creatorState.payload).tiers[0].name, "");
        assert.equal(draft.startsAt, "1970-01-01T00:00:00.000Z");
        assert.equal(
          (await call("event-submit", customer, { eventId: draft.id })).status,
          400,
        );
        assert.equal((await call("events/" + draft.slug, null)).status, 404);
        assert.equal(
          (
            await call("event-workspace", other, {
              draft: { ...payload, id: draft.id, version: draft.stateVersion },
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "valid details advance; ticket errors are inline and server-enforced",
      async () => {
        const r = await call("event-workspace", customer, {
          draft: {
            ...payload,
            id: draft.id,
            version: draft.stateVersion,
            tiers: [],
          },
          advanceTo: 1,
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        draft = r.data.event;
        const bad = await call("event-workspace", customer, {
          draft: await current(),
          advanceTo: 2,
        });
        assert.equal(bad.status, 400);
        assert.equal(
          bad.data.fieldErrors.tiers,
          "Add at least one ticket type.",
        );
        const good = await call("event-workspace", customer, {
          draft: { ...payload, id: draft.id, version: draft.stateVersion },
          advanceTo: 2,
        });
        assert.equal(good.status, 200, JSON.stringify(good.data));
        draft = good.data.event;
        assert.equal(
          draft.slug,
          payload.title.toLowerCase().replaceAll(" ", "-"),
        );
        const invalid = await call("event-workspace", customer, {
          draft: { ...(await current()), title: "" },
          advanceTo: 2,
        });
        assert.equal(invalid.status, 400);
        assert.equal(invalid.data.step, 0);
      },
    );
    await t.test(
      "slug collisions are unique and title changes retain both historical links and ownership",
      async () => {
        const second = await call("event-workspace", customer, {
          draft: { ...payload, creationKey: randomUUID() },
        });
        assert.equal(second.status, 200);
        events.push(second.data.event.id);
        assert.equal(second.data.event.slug, draft.slug + "-2");
        const changed = await call("event-workspace", customer, {
          draft: { ...(await current()), title: prefix + " A new title" },
        });
        assert.equal(changed.status, 200);
        assert.equal(changed.data.event.slug, draft.slug);
        draft = changed.data.event;
        const historic = await db.event.findUniqueOrThrow({
          where: { id: legacy.id },
        });
        assert.equal(historic.slug, legacy.slug);
        assert.equal(historic.organizerId, legacy.organizerId);
      },
    );
    await t.test(
      "poster/banner upload validates bytes, rejects oversized or fake images and denies foreign artwork",
      async () => {
        const png = await sharp({
          create: { width: 64, height: 96, channels: 3, background: "#c91e38" },
        })
          .png()
          .toBuffer();
        const upload = async (who: any, bytes: Buffer, type: string) => {
          const f = new FormData();
          f.set(
            "file",
            new Blob([new Uint8Array(bytes)], { type }),
            "fictional.png",
          );
          return call("upload", who, f);
        };
        assert.equal(
          (await upload(customer, Buffer.from("fake image"), "image/png"))
            .status,
          400,
        );
        assert.equal(
          (await upload(customer, Buffer.alloc(4_000_001), "image/png")).status,
          400,
        );
        const poster = await upload(customer, png, "image/png"),
          banner = await upload(customer, png, "image/png"),
          foreign = await upload(other, png, "image/png");
        for (const r of [poster, banner, foreign]) {
          assert.equal(r.status, 200);
          files.push(r.data.id);
        }
        const bad = await call("event-workspace", customer, {
          draft: { ...(await current()), coverImage: foreign.data.path },
        });
        assert.equal(bad.status, 403);
        const good = await call("event-workspace", customer, {
          draft: {
            ...(await current()),
            image: poster.data.path,
            coverImage: banner.data.path,
          },
        });
        assert.equal(good.status, 200);
        draft = good.data.event;
        assert.equal(draft.coverImage, banner.data.path);
      },
    );
    await t.test(
      "multi-tier paid/free drafts preserve local sales dates, min/max, hidden/paused states and prevent invalid limits",
      async () => {
        const tiers = [
          { ...payload.tiers[0], quantity: 10 },
          {
            ...payload.tiers[0],
            name: "VIP",
            price: 2500,
            priceInput: "25.00",
            pricingMode: "PAID",
            quantity: 10,
            sortOrder: 1,
            availability: "HIDDEN",
          },
        ];
        const r = await call("event-workspace", customer, {
          draft: { ...payload, creationKey: randomUUID(), tiers },
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        events.push(r.data.event.id);
        assert.equal(r.data.event.tiers[1].price, 2500);
        const blockedAdvance = await call("event-workspace", customer, {
          draft: {
            ...payload,
            id: r.data.event.id,
            version: r.data.event.stateVersion,
            tiers,
          },
          advanceTo: 2,
        });
        assert.equal(blockedAdvance.status, 400);
        assert.equal(blockedAdvance.data.step, 1);
        assert.equal(blockedAdvance.data.fieldErrors.organizerVerification, undefined);
        assert.equal(blockedAdvance.data.fieldErrors.paymentDestinationId, undefined);
        assert(blockedAdvance.data.fieldErrors.policies);
        const blockedPaid = await call("event-submit", customer, {
          eventId: r.data.event.id,
          wizard: true,
        });
        assert.equal(blockedPaid.status, 400);
        assert.equal(blockedPaid.data.fieldErrors.organizerVerification, undefined);
        assert.equal(blockedPaid.data.fieldErrors.paymentDestinationId, undefined);
        assert(blockedPaid.data.fieldErrors.policies);
        const bad = await call("event-workspace", customer, {
          draft: {
            ...payload,
            tiers: [{ ...tiers[0], minPerOrder: 5, maxPerOrder: 2 }],
          },
          advanceTo: 2,
        });
        assert.equal(bad.status, 400);
        assert(bad.data.fieldErrors["tier-0-minPerOrder"]);
        const badDates = await call("event-workspace", customer, {
          draft: {
            ...payload,
            tiers: [
              {
                ...tiers[0],
                saleEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
            ],
          },
          advanceTo: 2,
        });
        assert.equal(badDates.status, 400);
        assert(badDates.data.fieldErrors["tier-0-saleEnd"]);
      },
    );
    await t.test(
      "private and online drafts never appear publicly or expose exact location through generated URLs",
      async () => {
        for (const access of ["PRIVATE", "INVITATION_ONLY"]) {
          const r = await call("event-workspace", customer, {
            draft: {
              ...payload,
              creationKey: randomUUID(),
              access,
              city: "Online",
              venue: "Online event",
              privateVenue: "https://example.test/PRIVATE-JOINING-LINK",
            },
          });
          assert.equal(r.status, 200);
          events.push(r.data.event.id);
          assert.equal(
            (await call("events/" + r.data.event.slug, other)).status,
            404,
          );
        }
        const profile = await db.organizerIdentity.findUniqueOrThrow({
          where: { userId: customer.id },
        });
        assert.equal(
          (await call("organizers/" + profile.slug, null)).status,
          404,
        );
      },
    );
    await t.test(
      "submission requires independent admin approval and does not start sales or grant admin authority",
      async () => {
        assert.equal(
          (await call("event-submit", customer, { eventId: draft.id })).status,
          200,
        );
        assert.equal(
          (
            await call("event-review", customer, {
              eventId: draft.id,
              decision: "APPROVE",
            })
          ).status,
          403,
        );
        assert.equal(
          (await call("event-workspace", customer, { draft: await current() }))
            .status,
          409,
        );
        const review = await call("event-review", admin, {
          eventId: draft.id,
          decision: "APPROVE",
        });
        assert.equal(review.status, 200, JSON.stringify(review.data));
        const approved = await db.event.findUniqueOrThrow({
          where: { id: draft.id },
        });
        assert.equal(approved.status, "PUBLISHED");
        assert.equal(approved.reviewedById, admin.id);
        assert.equal(process.env.TICKET_SALES_MODE, "disabled");
        assert.equal(approved.testOnly, true);
        const hidden = await db.eventTicketTier.create({
          data: {
            eventId: draft.id,
            name: "HIDDEN-TEST-TIER",
            price: 0,
            quantity: 1,
            availability: "HIDDEN",
          },
        });
        const hiddenField = await db.eventRegistrationField.create({
          data: {
            eventId: draft.id,
            label: "HIDDEN-TEST-QUESTION",
            type: "text",
            hidden: true,
          },
        });
        const view = await call("events/" + draft.slug, null);
        assert.equal(view.status, 200);
        assert(!JSON.stringify(view.data).includes("HIDDEN-TEST-"));
        const ownerView = await call("events/" + draft.slug, customer);
        assert(ownerView.data.tiers.some((t: any) => t.id === hidden.id));
        await db.eventTicketTier.delete({ where: { id: hidden.id } });
        await db.eventRegistrationField.delete({
          where: { id: hiddenField.id },
        });
        assert(!JSON.stringify(view.data).includes("PRIVATE-PHASE1-ADDRESS"));
        const identity = await db.organizerIdentity.findUniqueOrThrow({
            where: { userId: customer.id },
          }),
          profile = await call("organizers/" + identity.slug, null);
        assert.equal(profile.status, 200);
        assert.equal(profile.data.events.length, 1);
        assert(!JSON.stringify(profile.data).includes("PRIVATE-"));
        assert(!JSON.stringify(profile.data).includes(customer.email));
      },
    );
    await t.test(
      "permitted event edits return to review, keep URL stable, and optimistic versions reject stale saves",
      async () => {
        const payload = await current(),
          r = await call("event-workspace", customer, {
            draft: {
              ...payload,
              shortDescription:
                "An updated fictional event description, still entirely local.",
            },
          });
        assert.equal(r.status, 200);
        assert.equal(r.data.event.status, "DRAFT");
        assert.equal(r.data.event.slug, draft.slug);
        assert.equal(
          (await call("event-workspace", customer, { draft: payload })).status,
          409,
        );
        const controls = await call("setup", customer);
        assert.equal(controls.status, 200);
        assert(
          controls.data.events.find((e: any) => e.id === draft.id).tiers.length,
        );
      },
    );
  } finally {
    if (ticket) await db.ticket.deleteMany({ where: { id: ticket.id } });
    if (booking) await db.commissionEntry.deleteMany({where:{booking:{ id: booking.id }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ id: booking.id }}});
    await db.booking.deleteMany({ where: { id: booking.id } });
    await db.notification.deleteMany({
      where: {
        OR: [{ userId: { in: users } }, { dedupeKey: { contains: prefix } }],
      },
    });
    await db.event.deleteMany({ where: { id: { in: events } } });
    await db.fileUpload.deleteMany({ where: { id: { in: files } } });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
});
