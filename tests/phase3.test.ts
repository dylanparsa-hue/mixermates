import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
import { secretHash } from "../lib/security";
import { decimalToSen, zonedInstant, localDateTime } from "../lib/event-config";
import { reserveBooking } from "../lib/booking-domain";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL || "";
if (
  process.env.ISOLATED_TEST_DATA !== "true" ||
  !process.env.DATABASE_URL?.startsWith("file:") ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  process.env.DB_PASSWORD !== undefined
)
  throw Error("Phase 3 tests require explicit isolated loopback SQLite.");
test("Phase 3 event setup, payment configuration and admin review", async (t) => {
  const prefix = "p3_" + randomUUID().slice(0, 8),
    uids: string[] = [],
    eids: string[] = [],
    uploads: string[] = [],
    destinations: string[] = [];
  const pw = await hash("IsolatedPhase3Test!", 4);
  const createUser = async (role = "ATTENDEE") => {
    const id = prefix + "_" + uids.length;
    uids.push(id);
    return db.user.create({
      data: {
        id,
        username: id,
        email: id + "@example.test",
        name: id,
        role,
        passwordHash: pw,
        dob: new Date("1990-01-01"),
        city: "Test",
      },
    });
  };
  const org = await createUser("ORGANIZER"),
    other = await createUser("ORGANIZER"),
    customer = await createUser(),
    admin = await createUser("ADMIN"),
    scanner = await createUser("STAFF");
  async function call(route: string, who: any, body?: any) {
    let cookie = "";
    if (who) {
      const token = randomBytes(32).toString("hex"),
        current = await db.user.findUniqueOrThrow({ where: { id: who.id } });
      await db.session.create({
        data: {
          id: secretHash(token),
          userId: who.id,
          securityVersion: current.securityVersion,
          expires: new Date(Date.now() + 3600000),
        },
      });
      cookie = "vibey-session=" + token;
    }
    const r = await fetch(base + "/api/" + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        Origin: base,
        Cookie: cookie,
        "x-forwarded-for": prefix,
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    return {
      status: r.status,
      data: r.headers.get("content-type")?.includes("json")
        ? await r.json()
        : await r.arrayBuffer(),
    };
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=",
    "base64",
  );
  async function upload(
    who: any,
    bytes: Buffer,
    mime: string,
    privateFile = true,
    purpose = "PAYMENT_QR",
  ) {
    const f = new FormData();
    f.set(
      "file",
      new Blob([new Uint8Array(bytes)], { type: mime }),
      "fixture." + (mime === "image/png" ? "png" : "webp"),
    );
    f.set("private", String(privateFile));
    if (purpose) f.set("purpose", purpose);
    const result = await call("upload", who, f);
    if (result.status === 200) uploads.push(result.data.id);
    return result;
  }
  const baseDraft = (title = "Phase 3 event") => ({
    creationKey: randomUUID(),
    title: prefix + " " + title,
    category: "House Party",
    subcategory: "Private House Party",
    description:
      "An entirely fictional local event for isolated setup verification.",
    shortDescription: "A local rehearsal only.",
    genre: "House",
    image: "/images/halloween.jpg",
    startsLocal: "2026-12-01T21:00",
    endsLocal: "2026-12-02T02:00",
    timezone: "Asia/Kuala_Lumpur",
    city: "Kuala Lumpur",
    venue: "Approximate test area",
    privateVenue: "PRIVATE PHASE3 ADDRESS",
    locationVisibility: "HIDDEN",
    age: 18,
    capacity: 30,
    access: "INVITATION_ONLY",
    approvalRequired: true,
    invitationsEnabled: true,
    policies:
      "Fictional local test policies. Cancellation requires organizer review.",
    theme: "Halloween",
    tiers: [
      { name: "General Admission", price: 3500, quantity: 30, maxPerOrder: 4 },
    ],
    fields: [{ label: "Instagram username", type: "text", required: true }],
    entryOptions: [
      {
        key: "fee",
        label: "Entrance Fee — RM35",
        price: 3500,
        relationship: "FEE",
        proofRequired: true,
      },
      {
        key: "byob",
        label: "BYOB",
        price: 0,
        relationship: "BYOB",
        proofRequired: true,
      },
    ],
  });
  let draft: any, payload: any, qr: any, v1: any, v2: any, booking: any;
  const currentPayload = async (e: any) => {
    const x = await db.event.findUniqueOrThrow({
      where: { id: e.id },
      include: { tiers: true, fields: true },
    });
    const { creationKey, ...p } = payload;
    return {
      ...p,
      id: x.id,
      version: x.stateVersion,
      tiers: x.tiers.map(({ eventId, sold, ...t }) => ({
        ...t,
        saleStart: t.saleStart?.toISOString() || null,
        saleEnd: t.saleEnd?.toISOString() || null,
      })),
      fields: x.fields.map(({ eventId, ...q }) => q),
    };
  };
  try {
    await t.test(
      "minor-unit conversion is exact and rejects negatives, fractions beyond sen and overflow",
      () => {
        assert.equal(decimalToSen("35.01"), 3501);
        assert.equal(decimalToSen("0.10"), 10);
        for (const x of ["-1", "1.005", "NaN", "1e5", "999999999999999999"])
          assert.throws(() => decimalToSen(x));
      },
    );
    await t.test(
      "timezone conversion supports overnight events and rejects invalid dates, zones and DST gaps",
      () => {
        assert.equal(
          zonedInstant("2026-12-01T21:00", "Asia/Kuala_Lumpur").toISOString(),
          "2026-12-01T13:00:00.000Z",
        );
        assert.equal(
          localDateTime("2026-12-01T13:00:00Z", "Asia/Kuala_Lumpur"),
          "2026-12-01T21:00",
        );
        assert.throws(() =>
          zonedInstant("2026-02-30T20:00", "Asia/Kuala_Lumpur"),
        );
        assert.throws(() =>
          zonedInstant("2026-12-01T20:00", "Invalid/Timezone"),
        );
        assert.throws(() =>
          zonedInstant("2027-03-14T02:30", "America/New_York"),
        );
      },
    );
    await t.test(
      "ordinary and anonymous callers cannot create organizer drafts or view setup",
      async () => {
        assert.equal(
          (await call("event-draft", null, baseDraft())).status,
          401,
        );
        assert.equal(
          (await call("event-draft", customer, baseDraft())).status,
          403,
        );
        assert.equal((await call("setup", customer)).status, 403);
      },
    );
    await t.test(
      "eligible account can acquire organizer capability without becoming verified",
      async () => {
        assert.equal(
          (await call("become-organizer", customer, {})).status,
          200,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: customer.id } }))
            .verification,
          "UNVERIFIED",
        );
        await db.userCapability.deleteMany({ where: { userId: customer.id } });
      },
    );
    await t.test(
      "unfinished draft saves without invented schedule and persists after a fresh read",
      async () => {
        const r = await call("event-draft", org, {
          creationKey: randomUUID(),
          title: prefix + " unfinished",
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        eids.push(r.data.id);
        const x = await db.event.findUniqueOrThrow({
          where: { id: r.data.id },
        });
        assert.equal(x.status, "DRAFT");
        assert.equal(x.startsAt.getTime(), 0);
        assert.equal(
          (await call("event-submit", org, { eventId: x.id })).status,
          400,
        );
        assert(
          (await call("setup", org)).data.events.some(
            (e: any) => e.id === x.id,
          ),
        );
      },
    );
    await t.test(
      "complete draft saves category, privacy, preset, overnight schedule, tiers and questions",
      async () => {
        payload = baseDraft();
        const r = await call("event-draft", org, payload);
        assert.equal(r.status, 200, JSON.stringify(r.data));
        draft = r.data;
        eids.push(draft.id);
        assert.equal(draft.category, "House Party");
        assert.equal(draft.access, "INVITATION_ONLY");
        assert.equal(draft.theme, "Halloween");
        assert.equal(draft.tiers[0].price, 3500);
        assert.equal(draft.fields[0].required, true);
        assert.equal(draft.endsAt, "2026-12-01T18:00:00.000Z");
      },
    );
    await t.test(
      "duplicate creation keys are idempotent and identical names receive unique slugs",
      async () => {
        const repeat = await call("event-draft", org, payload);
        assert.equal(repeat.data.id, draft.id);
        const x = await call("event-draft", org, {
          ...payload,
          creationKey: randomUUID(),
        });
        assert.equal(x.status, 200);
        eids.push(x.data.id);
        assert.notEqual(x.data.slug, draft.slug);
        assert.equal((await call("event-draft", other, payload)).status, 403);
      },
    );
    await t.test(
      "draft validates dates, negative prices, stock, duplicate tiers, currency and quantities",
      async () => {
        for (const edit of [
          { endsLocal: "2026-12-01T20:00" },
          { timezone: "Bad/Zone" },
          { tiers: [{ name: "VIP", price: -1, quantity: 1 }] },
          { capacity: 1 },
          {
            tiers: [
              { name: "VIP", price: 0, quantity: 1 },
              { name: "VIP", price: 0, quantity: 1 },
            ],
          },
          { tiers: [{ name: "VIP", price: 0, quantity: 1, currency: "USD" }] },
          {
            tiers: [
              {
                name: "VIP",
                price: 0,
                quantity: 1,
                minPerOrder: 5,
                maxPerOrder: 1,
              },
            ],
          },
        ]) {
          const r = await call("event-draft", org, {
            ...payload,
            creationKey: randomUUID(),
            ...edit,
          });
          assert.equal(r.status, 400, JSON.stringify(r.data));
        }
      },
    );
    await t.test(
      "cross-owner editing, stale versions and foreign tier IDs are rejected",
      async () => {
        const data = await currentPayload(draft);
        assert.equal((await call("event-draft", other, data)).status, 403);
        assert.equal(
          (
            await call("event-draft", org, {
              ...data,
              version: data.version + 99,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await call("event-draft", org, {
              ...data,
              tiers: [{ ...data.tiers[0], id: "foreign-tier" }],
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "all named ticket types and custom question types persist without duplicating tiers on edit",
      async () => {
        const data = await currentPayload(draft);
        const tiers = [
          "General Admission",
          "Early Bird",
          "VIP",
          "Free RSVP",
          "Custom balcony",
        ].map((name, i) => ({
          name,
          price: i === 3 ? 0 : 3500,
          quantity: 6,
          maxPerOrder: 4,
          minPerOrder: 1,
          sortOrder: i,
          availability: "AVAILABLE",
        }));
        const r = await call("event-draft", org, {
          ...data,
          tiers,
          fields: [
            { label: "Phone number", type: "tel", required: false },
            {
              label: "Entry",
              type: "select",
              options: "Fee,BYOB",
              required: true,
            },
            {
              label: "BYOB evidence",
              type: "file",
              required: true,
              condition: "byob",
            },
            { label: "Consent", type: "consent", required: true },
            {
              label: "Hidden internal",
              type: "text",
              hidden: true,
              required: false,
            },
          ],
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        assert.equal(r.data.tiers.length, 5);
        draft = r.data;
        const next = await currentPayload(draft);
        assert.equal(
          (await call("event-draft", org, next)).data.tiers.length,
          5,
        );
      },
    );
    await t.test(
      "poster upload is persisted and foreign-owner poster references are rejected",
      async () => {
        const poster = await upload(org, png, "image/png", false, "");
        assert.equal(poster.status, 200);
        const data = await currentPayload(draft);
        const r = await call("event-draft", org, {
          ...data,
          image: poster.data.path,
        });
        assert.equal(r.status, 200);
        const foreign = await upload(other, png, "image/png", false, "");
        assert.equal(
          (
            await call("event-draft", org, {
              ...(await currentPayload(draft)),
              image: foreign.data.path,
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "private QR accepts PNG and WebP while rejecting executable, oversized and public-purpose files",
      async () => {
        qr = await upload(org, png, "image/png");
        assert.equal(qr.status, 200);
        const webp = await upload(
          org,
          await sharp({
            create: { width: 1, height: 1, channels: 3, background: "white" },
          })
            .webp()
            .toBuffer(),
          "image/webp",
        );
        assert.equal(webp.status, 200);
        assert.equal(
          (
            await upload(
              org,
              Buffer.from('<svg onload="alert(1)"></svg>'),
              "image/svg+xml",
            )
          ).status,
          400,
        );
        assert.equal(
          (await upload(org, Buffer.alloc(4_000_001), "image/png")).status,
          400,
        );
        assert.equal((await upload(org, png, "image/png", false)).status, 400);
        assert.equal((await upload(customer, png, "image/png")).status, 403);
      },
    );
    await t.test(
      "payment destination submission persists a private pending recipient version",
      async () => {
        const r = await call("payment-destination", org, {
          methodType: "TOUCH_N_GO",
          label: prefix + " QR",
          recipientName: "FICTIONAL LOCAL RECIPIENT",
          recipientReference: "TEST ONLY",
          qrAssetId: qr.data.id,
          instructions: "Not a real payment request.",
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        v1 = r.data;
        destinations.push(v1.destinationId);
        assert.equal(v1.status, "PENDING_REVIEW");
        assert.equal(v1.testOnly, true);
        assert.equal(
          (
            await db.fileUpload.findUniqueOrThrow({
              where: { id: v1.qrAssetId },
            })
          ).private,
          true,
        );
      },
    );
    await t.test(
      "private QR preview is owner/admin only and never ordinary or cross-organizer",
      async () => {
        assert.equal((await call("payment-qr/" + v1.id, org)).status, 200);
        assert.equal((await call("payment-qr/" + v1.id, admin)).status, 200);
        assert.equal((await call("payment-qr/" + v1.id, other)).status, 403);
        assert.equal((await call("payment-qr/" + v1.id, customer)).status, 403);
        assert.equal((await call("payment-qr/" + v1.id, null)).status, 401);
        assert.equal((await call("media/" + v1.qrAssetId, null)).status, 404);
      },
    );
    await t.test(
      "recipient approval rejects customers, scanner staff, self approval and undocumented checks",
      async () => {
        const body = {
          versionId: v1.id,
          decision: "APPROVE",
          notes: "Fictional local review.",
          procedure: "Checked the fictional sample and fictional owner.",
          recipientChecked: true,
        };
        for (const who of [org, other, customer, scanner])
          assert.equal(
            (await call("payment-destination-review", who, body)).status,
            403,
          );
        assert.equal(
          (
            await call("payment-destination-review", admin, {
              ...body,
              recipientChecked: false,
            })
          ).status,
          400,
        );
        const r = await call("payment-destination-review", admin, body);
        assert.equal(r.status, 200, JSON.stringify(r.data));
        assert.equal(
          (
            await db.paymentDestination.findUniqueOrThrow({
              where: { id: v1.destinationId },
            })
          ).activeVersionId,
          v1.id,
        );
      },
    );
    await t.test(
      "new versions preserve history, correction/rejection cannot activate, owner cannot change another destination",
      async () => {
        const input = {
          methodType: "TOUCH_N_GO",
          label: prefix + " QR",
          recipientName: "FICTIONAL REPLACEMENT",
          qrAssetId: qr.data.id,
          destinationId: v1.destinationId,
        };
        assert.equal(
          (await call("payment-destination", other, input)).status,
          403,
        );
        const r = await call("payment-destination", org, input);
        assert.equal(r.status, 200);
        v2 = r.data;
        assert.equal(v2.version, 2);
        assert.equal(
          (
            await db.paymentDestination.findUniqueOrThrow({
              where: { id: v1.destinationId },
            })
          ).activeVersionId,
          v1.id,
        );
        assert.equal(
          (
            await call("payment-destination-review", admin, {
              versionId: v2.id,
              decision: "CORRECTION",
              notes: "Please correct the fictional label.",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call("payment-destination-action", admin, {
              destinationId: v1.destinationId,
              versionId: v2.id,
              action: "ACTIVATE",
              reason: "Attempt rejected activation.",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await db.paymentRecipientVersion.findUniqueOrThrow({
              where: { id: v1.id },
            })
          ).recipientName,
          "FICTIONAL LOCAL RECIPIENT",
        );
      },
    );
    await t.test(
      "organizer default is stored and event assignment requires owned active approved destination",
      async () => {
        assert.equal(
          (
            await call("payment-destination-action", org, {
              destinationId: v1.destinationId,
              action: "DEFAULT",
              reason: "Set test default.",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await db.paymentDestination.findUniqueOrThrow({
              where: { id: v1.destinationId },
            })
          ).isDefault,
          true,
        );
        const r = await call("event-draft", org, {
          ...(await currentPayload(draft)),
          paymentDestinationId: v1.destinationId,
        });
        assert.equal(r.status, 200);
        const foreign = await call("event-draft", other, {
          ...baseDraft(),
          paymentDestinationId: v1.destinationId,
        });
        assert.equal(foreign.status, 409);
      },
    );
    await t.test(
      "content review is independent of organizer verification; verification still requires independent review",
      async () => {
        assert.equal(
          (await call("event-submit", org, { eventId: draft.id })).status,
          200,
        );
        await db.event.update({where:{id:draft.id},data:{status:"DRAFT"}});
        const v = await call("verification-submit", org, {
          note: "Fictional organizer for a local test only. No real identity documents.",
        });
        assert.equal(v.status, 200);
        assert.equal(
          (
            await call("verification-review", org, {
              id: v.data.id,
              approve: true,
              notes: "Attempt self approval.",
              identityChecked: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("verification-review", admin, {
              id: v.data.id,
              approve: true,
              notes: "Explicit fictional isolated organizer review.",
              identityChecked: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await db.organizerVerification.findUniqueOrThrow({
              where: { id: v.data.id },
            })
          ).testOnly,
          true,
        );
        const current = await db.event.findUniqueOrThrow({
          where: { id: draft.id },
        });
        await db.event.update({
          where: { id: draft.id },
          data: {
            entryOptions: JSON.stringify([
              { key: "byob", price: null, relationship: "UNCONFIRMED" },
            ]),
          },
        });
        const blocked = await call("event-submit", org, { eventId: draft.id });
        assert.equal(blocked.status, 400);
        assert.match(blocked.data.error, /Choose Fee or BYOB/);
        assert.match(blocked.data.error, /Use 0 for a free option/);
        await db.event.update({
          where: { id: draft.id },
          data: { entryOptions: current.entryOptions },
        });
      },
    );
    await t.test(
      "event submit, admin request changes and rejection preserve the draft with review notes",
      async () => {
        assert.equal(
          (await call("event-submit", org, { eventId: draft.id })).status,
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
          (
            await call("event-review", admin, {
              eventId: draft.id,
              decision: "CHANGES_REQUESTED",
              notes: "Please clarify the test policies.",
            })
          ).status,
          200,
        );
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: draft.id } }))
            .reviewOutcome,
          "CHANGES_REQUESTED",
        );
        assert.equal(
          (await call("event-submit", org, { eventId: draft.id })).status,
          200,
        );
        assert.equal(
          (
            await call("event-review", admin, {
              eventId: draft.id,
              decision: "REJECT",
              notes: "Rejected fictional submission for correction.",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "admin publication is database-backed, locks pending edits and leaves real sales disabled",
      async () => {
        assert.equal(
          (await call("event-submit", org, { eventId: draft.id })).status,
          200,
        );
        assert.equal(
          (await call("event-draft", org, await currentPayload(draft))).status,
          409,
        );
        const r = await call("event-review", admin, {
          eventId: draft.id,
          decision: "APPROVE",
          notes: "Approved fictional local publication only.",
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        assert.equal(
          (await db.event.findUniqueOrThrow({ where: { id: draft.id } }))
            .status,
          "PUBLISHED",
        );
        assert.equal((await call("setup", org)).data.salesEnabled, false);
        assert.equal((await call("events/" + draft.slug, null)).status, 404);
      },
    );
    await t.test(
      "suspension cannot be bypassed through editing or organizer publication",
      async () => {
        assert.equal(
          (
            await call("event-review", admin, {
              eventId: draft.id,
              decision: "SUSPEND",
              notes: "Local suspension test.",
            })
          ).status,
          200,
        );
        assert.equal(
          (await call("event-draft", org, await currentPayload(draft))).status,
          409,
        );
        assert.equal(
          (
            await call("event-state", org, {
              eventId: draft.id,
              status: "PUBLISHED",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("event-review", admin, {
              eventId: draft.id,
              decision: "APPROVE",
              notes: "Restore the fictional event.",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "disabled destinations block assignment/publication and only admin can reactivate an approved version",
      async () => {
        assert.equal(
          (
            await call("payment-destination-action", org, {
              destinationId: v1.destinationId,
              action: "DISABLE",
              reason: "Disable fictional method.",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call("event-draft", org, {
              ...(await currentPayload(draft)),
              paymentDestinationId: v1.destinationId,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await call("payment-destination-action", org, {
              destinationId: v1.destinationId,
              action: "ACTIVATE",
              versionId: v1.id,
              reason: "Attempt organizer activation.",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("payment-destination-action", admin, {
              destinationId: v1.destinationId,
              action: "ACTIVATE",
              versionId: v1.id,
              reason: "Admin restored approved test QR.",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "event-scoped staff assignment, financial denial and revocation persist",
      async () => {
        const r = await call("staff-assignment", org, {
          eventId: draft.id,
          username: scanner.username,
          active: true,
          canViewGuests: true,
          canCheckIn: true,
          canReviewPayments: false,
          canApproveRegistrations: false,
          canViewLocation: false,
        });
        assert.equal(r.status, 200, JSON.stringify(r.data));
        assert.equal(
          (
            await call("staff", other, {
              eventId: draft.id,
              userId: scanner.id,
              active: false,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("payment-destination-action", scanner, {
              destinationId: v1.destinationId,
              action: "DISABLE",
              reason: "Attempt scanner finance.",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("staff", org, {
              eventId: draft.id,
              userId: scanner.id,
              active: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await db.eventStaff.findUniqueOrThrow({
              where: {
                eventId_userId: { eventId: draft.id, userId: scanner.id },
              },
            })
          ).active,
          false,
        );
      },
    );
    await t.test(
      "existing booking amounts, tiers and recipient snapshots survive financial edit attempts",
      async () => {
        await db.event.update({
          where: { id: draft.id },
          data: { origin: "REAL", testOnly: true, access: "PUBLIC" },
        });
        const tier = await db.eventTicketTier.findFirstOrThrow({
          where: { eventId: draft.id, price: { gt: 0 } },
        });
        booking = await reserveBooking(customer.id, {
          eventId: draft.id,
          tierId: tier.id,
          quantity: 1,
          idempotencyKey: randomUUID(),
          expiresAt: new Date(Date.now() + 3600000),
        });
        const data = await currentPayload(draft);
        const r = await call("event-draft", org, {
          ...data,
          access: "PUBLIC",
          tiers: data.tiers.map((t: any) => ({ ...t, price: 1 })),
        });
        assert.equal(r.status, 409);
        const after = await db.booking.findUniqueOrThrow({
          where: { id: booking.id },
        });
        assert.equal(after.total, 3500);
        assert.equal(after.recipientVersionId, v1.id);
        assert.equal(after.recipientSnapshot, booking.recipientSnapshot);
        assert.equal(
          (
            await db.eventTicketTier.findUniqueOrThrow({
              where: { id: tier.id },
            })
          ).price,
          3500,
        );
        const edit = await currentPayload(draft);
        const contentOnly = await call("event-draft", org, {
          ...edit,
          access: "PUBLIC",
          paymentDestinationId: v1.destinationId,
          description:
            "Updated local event description with existing booking preserved.",
        });
        assert.equal(contentOnly.status, 200, JSON.stringify(contentOnly.data));
        assert.equal(contentOnly.data.status, "PUBLISHED");
      },
    );
    await t.test(
      "Halloween remains a protected unconfirmed draft with required fields and unresolved entry pricing",
      async () => {
        const e = await db.event.findUniqueOrThrow({
          where: { id: "halloween" },
          include: { fields: true },
        });
        assert.equal(e.status, "DRAFT");
        assert.equal(e.age, 18);
        assert.equal(e.access, "INVITATION_ONLY");
        assert.equal(e.approvalRequired, true);
        assert.equal(e.paymentDestinationId, null);
        assert.equal(e.theme, "Halloween");
        assert(
          e.fields.find((f) => f.label === "Instagram username")?.required,
        );
        assert.equal(
          e.fields.find((f) => f.label === "Invited by")?.required,
          false,
        );
        assert(
          JSON.parse(e.entryOptions).every(
            (x: any) => x.relationship === "UNCONFIRMED",
          ),
        );
        assert.equal(
          (
            await call("event-state", admin, {
              eventId: e.id,
              status: "PUBLISHED",
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "sensitive changes persist structured audit records without QR contents or credentials",
      async () => {
        const logs = await db.adminAuditLog.findMany({
          where: { userId: { in: uids } },
        });
        for (const action of [
          "EVENT_DRAFT_CREATED",
          "EVENT_SUBMITTED",
          "EVENT_STATE_CHANGED",
          "PAYMENT_DESTINATION_SUBMITTED",
          "PAYMENT_DESTINATION_APPROVED",
          "EVENT_STAFF_UPDATED",
        ])
          assert(
            logs.some((x) => x.action === action),
            action,
          );
        assert(
          logs
            .filter((x) => x.action === "EVENT_DRAFT_CREATED")
            .every((x) => x.correlationId && x.actorRole === "ORGANIZER"),
        );
        assert(!JSON.stringify(logs).includes("IsolatedPhase3Test!"));
        assert(!JSON.stringify(logs).includes("iVBOR"));
      },
    );
  } finally {
    const bs = await db.booking.findMany({ where: { eventId: { in: eids } } }),
      bids = bs.map((b) => b.id);
    await db.payment.deleteMany({ where: { bookingId: { in: bids } } });
    await db.commissionEntry.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.bookingFeeSnapshot.deleteMany({where:{booking:{ id: { in: bids } }}});
    await db.booking.deleteMany({ where: { id: { in: bids } } });
    await db.event.deleteMany({ where: { id: { in: eids } } });
    await db.paymentDestination.updateMany({
      where: { id: { in: destinations } },
      data: { activeVersionId: null },
    });
    await db.paymentRecipientVersion.deleteMany({
      where: { destinationId: { in: destinations } },
    });
    await db.paymentDestination.deleteMany({
      where: { id: { in: destinations } },
    });
    await db.fileUpload.deleteMany({ where: { id: { in: uploads } } });
    await db.organizerVerification.deleteMany({
      where: { userId: { in: uids } },
    });
    await db.adminAuditLog.deleteMany({ where: { userId: { in: uids } } });
    await db.user.deleteMany({ where: { id: { in: uids } } });
    await db.$disconnect();
  }
});
