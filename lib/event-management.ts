import { simulatorEnvironment, TEST_EVENT_POLICY } from "./simulator-policy";
import { notifyAdmins } from "./domain-core";
import { z } from "zod";
import { designInput, designAssets, readDesign } from "./page-design";
import { db } from "./db";
import { stat } from "node:fs/promises";
import { uniqueSlug } from "./automatic-slugs";
import { ensureOrganizerIdentity } from "./organizer-identity";
import {
  eventWizardErrors,
  paidEventErrors,
  type CreatorReadiness,
  type FieldErrors,
} from "./event-wizard-validation";
import {
  actor,
  audit,
  eventPermission,
  isolatedTestData,
  notify,
  transaction,
  type Tx,
} from "./domain-core";
import { ageOn } from "./rules";
import {
  eventCategories,
  eventPresets,
  registrationTypes,
  validTimezone,
  zonedInstant,
} from "./event-config";
const id = z.string().min(1).max(191);
const tier = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(2).max(80),
    description: z.string().max(500).default(""),
    image: z.string().max(500).default(""),
    section: z.string().trim().max(80).default(""),
    showRemaining: z.boolean().default(false),
    price: z.number().int().min(0).max(10000000),
    discount: z.number().int().min(0).max(10000000).default(0),
    currency: z.literal("MYR").default("MYR"),
    quantity: z.number().int().min(1).max(100000),
    minPerOrder: z.number().int().min(1).max(10).default(1),
    maxPerOrder: z.number().int().min(1).max(10).default(4),
    sortOrder: z.number().int().min(0).max(100).default(0),
    availability: z
      .enum(["AVAILABLE", "HIDDEN", "PAUSED"])
      .default("AVAILABLE"),
    saleStart: z.string().datetime().nullable().optional(),
    saleEnd: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine(
    (t) => t.minPerOrder <= t.maxPerOrder && t.discount <= t.price,
    "Minimum booking quantity must not exceed maximum.",
  )
  .refine(
    (t) =>
      !t.saleStart || !t.saleEnd || new Date(t.saleStart) < new Date(t.saleEnd),
    "Ticket sale end must follow sale start.",
  );
const question = z
  .object({
    id: id.optional(),
    label: z.string().trim().min(2).max(100),
    type: z.enum(registrationTypes),
    required: z.boolean().default(false),
    hidden: z.boolean().default(false),
    options: z.string().max(1000).default(""),
    condition: z.string().max(100).default(""),
  })
  .strict()
  .refine(
    (q) => !["select", "radio"].includes(q.type) || q.options.trim().length > 0,
    "Choice questions need options.",
  )
  .refine(
    (q) => !q.hidden || !q.required,
    "A hidden question cannot be required.",
  );
export const draftInput = z
  .object({
    id: id.optional(),
    version: z.number().int().nonnegative().optional(),
    creationKey: z.string().uuid().optional(),
    title: z.string().trim().max(100).default(""),
    subcategory: z.string().trim().max(80).default(""),
    shortDescription: z.string().trim().max(240).default(""),
    description: z.string().trim().max(6000).default(""),
    category: z.enum(eventCategories).default("House Party"),
    genre: z.string().trim().max(80).default(""),
    image: z.string().max(500).default(""),
    coverImage: z.string().max(500).default(""),
    pageDesign: designInput.default(() => designInput.parse({})),
    supportingImages: z.array(z.string().max(500)).max(4).default([]),
    startsLocal: z.string().max(16).default(""),
    endsLocal: z.string().max(16).default(""),
    timezone: z
      .string()
      .refine(validTimezone, "Choose a valid timezone.")
      .default("Asia/Kuala_Lumpur"),
    city: z.string().trim().max(80).default(""),
    venue: z.string().trim().max(160).default(""),
    privateVenue: z.string().trim().max(500).default(""),
    locationVisibility: z
      .enum(["PUBLIC", "APPROXIMATE", "HIDDEN"])
      .default("HIDDEN"),
    latitude: z.number().min(-90).max(90).default(0),
    longitude: z.number().min(-180).max(180).default(0),
    age: z.number().int().min(0).max(99).default(18),
    capacity: z.number().int().min(0).max(100000).default(0),
    access: z.enum(["PUBLIC", "PRIVATE", "INVITATION_ONLY"]).default("PUBLIC"),
    invitationsEnabled: z.boolean().default(false),
    approvalRequired: z.boolean().default(true),
    guestListVisibility: z.literal("PRIVATE").default("PRIVATE"),
    idCheckRequired: z.boolean().default(true),
    policies: z.string().trim().max(3000).default(""),
    entryInstructions: z.string().trim().max(3000).default(""),
    theme: z.enum(eventPresets).default("House Party"),
    paymentMode: z
      .enum(["ORGANIZER_QR", "TEST_SIMULATOR"])
      .default("ORGANIZER_QR"),
    platformFeePolicy: z.enum(["ABSORB", "CUSTOMER"]).default("ABSORB"),
    paymentDestinationId: id.nullable().default(null),
    tiers: z.array(tier).max(10).default([]),
    fields: z.array(question).max(25).default([]),
    entryOptions: z
      .array(
        z.object({
          key: z.string().regex(/^[a-z0-9_-]{1,40}$/),
          label: z.string().min(2).max(100),
          price: z.number().int().min(0).max(10000000).nullable(),
          relationship: z.enum(["UNCONFIRMED", "FEE", "BYOB"]),
          proofRequired: z.boolean(),
        }),
      )
      .max(5)
      .default([]),
  })
  .strict();
export async function organizerActor(tx: Tx, userId: string) {
  const user = await actor(tx, userId);
  if (
    ageOn(user.dob) < 18 ||
    !(
      user.role === "ADMIN" ||
      user.role === "ORGANIZER" ||
      user.capabilities.some((c) => c.capability === "ORGANIZER")
    )
  )
    throw Error("403:An adult organizer account is required.");
  return user;
}
async function ownedPoster(tx: Tx, userId: string, path: string) {
  if (!path) return;
  if (/^\/images\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(path)) {
    try {
      const asset = await stat(process.cwd() + "/public" + path);
      if (asset.isFile() && asset.size > 0) return;
    } catch {}
    throw Error("400:Upload a valid image or choose provided artwork.");
  }
  const match = path.match(/^\/api\/media\/([a-z0-9]+)$/);
  if (!match)
    throw Error("400:Use an uploaded event image or a provided artwork.");
  const f = await tx.fileUpload.findFirst({
    where: { path, userId, private: false },
  });
  if (!f) throw Error("403:Event artwork must belong to this organizer.");
}
export async function approvedDestination(
  tx: Tx,
  organizerId: string,
  destinationId: string,
) {
  const d = await tx.paymentDestination.findUnique({
    where: { id: destinationId },
    include: { activeVersion: true },
  });
  if (
    !d ||
    d.organizerId !== organizerId ||
    d.status !== "APPROVED" ||
    !d.activeVersion ||
    d.activeVersion.status !== "APPROVED" ||
    d.activeVersion.disabledAt ||
    !d.activeVersion.approvedAt
  )
    throw Error("409:Select your own approved active payment destination.");
  return d;
}
export async function eventCreatorReadiness(
  tx: Tx,
  organizerId: string,
): Promise<CreatorReadiness> {
  const organizer = await tx.user.findUniqueOrThrow({
    where: { id: organizerId },
    select: { verification: true },
  });
  const destinations = await tx.paymentDestination.findMany({
    where: { organizerId, status: "APPROVED" },
    include: { activeVersion: true },
  });
  let simulatorEnabled = false;
  if (simulatorEnvironment()) {
    await (await import("./payment-simulator")).assertSimulator(tx);
    simulatorEnabled = true;
  }
  return {
    simulatorEnabled,
    verification: organizer.verification,
    approvedDestinationIds: destinations
      .filter(
        (d) =>
          d.activeVersion?.status === "APPROVED" &&
          !d.activeVersion.disabledAt &&
          !!d.activeVersion.approvedAt,
      )
      .map((d) => d.id),
    paidEventsEnabled: process.env.NODE_ENV !== "production",
  };
}
export async function publicationFieldErrors(tx: Tx, e: any) {
  const problems: FieldErrors = {};
  const options = JSON.parse(e.entryOptions || "[]");
  if (
    options.some(
      (o: any) => o.relationship === "UNCONFIRMED" || o.price === null,
    )
  )
    options.forEach((o: any, i: number) => {
      if (o.relationship === "UNCONFIRMED")
        problems[`entry-${i}-relationship`] =
          "Choose Fee or BYOB to confirm how this entry option is priced.";
      if (o.price === null)
        problems[`entry-${i}-price`] =
          "Set this entry option’s price. Use 0 for a free option.";
    });
  if (e.id === "halloween" || e.configurationStatus === "UNCONFIRMED")
    problems.eventConfiguration = "Halloween details remain unconfirmed.";
  if (e.title.trim().length < 3 || e.title === "Untitled event")
    problems.title = "Add an event name.";
  if ((e.shortDescription || e.description).trim().length < 20)
    problems.shortDescription = "Add a description of at least 20 characters.";
  if (!e.image) problems.image = "Upload or select event artwork.";
  if (readDesign(e.pageDesign).sections.some((s) => !s.title.trim()))
    problems.pageDesign = "Give every page section a title or remove it.";
  if (!e.city || !e.venue)
    problems[!e.city ? "city" : "venue"] =
      "Add the city and public venue or approximate area.";
  if (e.startsAt <= new Date() || e.endsAt <= e.startsAt)
    problems[e.startsAt <= new Date() ? "startsLocal" : "endsLocal"] =
      "Choose a future start and a later end date.";
  if (e.capacity < 1) problems.capacity = "Set a finite capacity.";
  const tiers = await tx.eventTicketTier.findMany({
    where: { eventId: e.id },
    orderBy: { sortOrder: "asc" },
  });
  if (!tiers.length || tiers.reduce((n, t) => n + t.quantity, 0) > e.capacity)
    problems.capacity = "Configure ticket quantities within event capacity.";
  if (
    tiers.some(
      (t) =>
        (t.saleEnd && t.saleEnd > e.startsAt) ||
        (t.saleStart && t.saleStart >= e.startsAt),
    )
  )
    tiers.forEach((t, i) => {
      if (t.saleStart && t.saleStart >= e.startsAt)
        problems[`tier-${i}-saleStart`] = "Sales must start before the event.";
      if (t.saleEnd && t.saleEnd > e.startsAt)
        problems[`tier-${i}-saleEnd`] = "Sales must end before the event.";
    });
  if (tiers.some((t) => t.price > 0))
    Object.assign(
      problems,
      paidEventErrors(
        { ...e, tiers },
        await eventCreatorReadiness(tx, e.organizerId),
      ),
    );
  return problems;
}
export async function publicationProblems(tx: Tx, e: any) {
  return Object.values(await publicationFieldErrors(tx, e));
}
export async function saveEventDraft(
  userId: string,
  input: unknown,
  creatorSnapshot?: unknown,
) {
  const d = draftInput.parse(input);
  if (d.paymentMode === "TEST_SIMULATOR") {
    await (await import("./payment-simulator")).assertSimulator();
    d.paymentDestinationId = null;
    d.policies ||= TEST_EVENT_POLICY;
  }
  if (new Set(d.entryOptions.map((o) => o.key)).size !== d.entryOptions.length)
    throw Error("400:Entry option keys must be unique.");
  if (
    d.fields.some(
      (q) => q.condition && !d.entryOptions.some((o) => o.key === q.condition),
    )
  )
    throw Error(
      "400:Conditional questions must reference an event entry option.",
    );
  if (!d.id && !d.creationKey)
    throw Error("400:A draft creation key is required.");
  if (
    new Set(d.tiers.map((t) => t.name.toLowerCase())).size !== d.tiers.length ||
    new Set(d.tiers.flatMap((t) => (t.id ? [t.id] : []))).size !==
      d.tiers.filter((t) => t.id).length
  )
    throw Error("400:Ticket tier names and IDs must be unique.");
  if (
    new Set(d.fields.map((q) => q.label.toLowerCase())).size !== d.fields.length
  )
    throw Error("400:Question names must be unique.");
  if (d.tiers.reduce((n, t) => n + t.quantity, 0) > d.capacity)
    throw Error("400:Ticket quantities cannot exceed event capacity.");
  const startsAt = d.startsLocal
      ? zonedInstant(d.startsLocal, d.timezone)
      : new Date(0),
    endsAt = d.endsLocal ? zonedInstant(d.endsLocal, d.timezone) : new Date(0);
  if (d.startsLocal && d.endsLocal && endsAt <= startsAt)
    throw Error(
      "400:End date and time must follow the start; choose the next day for overnight events.",
    );
  return transaction(async (tx) => {
    await organizerActor(tx, userId);
    await ensureOrganizerIdentity(tx, userId);
    let old = d.id
      ? await tx.event.findUniqueOrThrow({
          where: { id: d.id },
          include: { tiers: true, fields: true },
        })
      : null;
    if (!old && d.creationKey) {
      const prior = await tx.event.findUnique({
        where: { creationKey: d.creationKey },
      });
      if (prior) {
        if (prior.organizerId !== userId)
          throw Error("403:Draft belongs to another organizer.");
        return prior;
      }
    }
    if (old?.organizerId && old.organizerId !== userId)
      throw Error("403:Only the event owner can edit this draft.");
    if (
      old &&
      ["SUSPENDED", "CANCELLED", "COMPLETED", "PENDING_REVIEW"].includes(
        old.status,
      )
    )
      throw Error(
        "409:This event is locked for editing; resolve its review or lifecycle first.",
      );
    if (old?.pendingChangeId)
      throw Error("409:Resolve the reviewed event change before editing.");
    if (old && d.version !== old.stateVersion)
      throw Error(
        "409:This draft changed in another session. Reload before saving.",
      );
    for (const image of [
      d.image,
      d.coverImage,
      ...d.supportingImages,
      ...d.tiers.map((t) => t.image),
      ...designAssets(d.pageDesign),
    ])
      await ownedPoster(tx, userId, image);
    if (d.paymentDestinationId)
      await approvedDestination(tx, userId, d.paymentDestinationId);
    const bookings = old
      ? await tx.booking.count({ where: { eventId: old.id } })
      : 0;
    if (bookings) {
      const protectedFields = {
        category: d.category,
        genre: d.genre,
        city: d.city,
        venue: d.venue,
        privateVenue: d.privateVenue,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        age: d.age,
        capacity: d.capacity,
        access: d.access,
        approvalRequired: d.approvalRequired,
        locationVisibility: d.locationVisibility,
        paymentMode: d.paymentMode,
        platformFeePolicy: d.platformFeePolicy,
        paymentDestinationId: d.paymentDestinationId,
        theme: d.theme,
        policies: d.policies,
        entryOptions: JSON.stringify(d.entryOptions),
        latitude: d.latitude,
        longitude: d.longitude,
        invitationsEnabled: d.invitationsEnabled,
        idCheckRequired: d.idCheckRequired,
      };
      for (const [k, v] of Object.entries(protectedFields)) {
        const prev = (old as any)[k];
        if ((prev instanceof Date ? prev.toISOString() : prev) !== v)
          throw Error(
            "409:Events with registrations lock schedule, venue, access, policy and financial settings. Contact an administrator for a reviewed change.",
          );
      }
      for (const t of d.tiers) {
        const prev = old!.tiers.find((x) => x.id === t.id);
        if (
          !prev ||
          [
            "name",
            "description",
            "price",
            "discount",
            "quantity",
            "maxPerOrder",
            "minPerOrder",
            "availability",
            "currency",
            "sortOrder",
            "image",
            "section",
            "showRemaining",
          ].some((k) => (prev as any)[k] !== (t as any)[k])
        )
          throw Error("409:Ticket tiers with registrations cannot be changed.");
      }
      if (
        d.tiers.length !== old!.tiers.length ||
        d.fields.length !== old!.fields.length ||
        d.fields.some((q) => {
          const prev = old!.fields.find((f) => f.id === q.id);
          return (
            !prev ||
            [
              "label",
              "type",
              "required",
              "hidden",
              "options",
              "condition",
            ].some((k) => (prev as any)[k] !== (q as any)[k])
          );
        })
      )
        throw Error(
          "409:Registration definitions and tier removal are locked after bookings.",
        );
    }
    const {
      id: ignore,
      version,
      creationKey,
      startsLocal,
      endsLocal,
      tiers,
      fields,
      supportingImages,
      entryOptions,
      ...values
    } = d;
    const data = {
      ...values,
      pageDesign: JSON.stringify(d.pageDesign),
      title: d.title || "Untitled event",
      startsAt,
      endsAt,
      supportingImages: JSON.stringify(supportingImages),
      entryOptions: JSON.stringify(entryOptions),
      ...(old
        ? {}
        : {
            creationKey,
            organizerId: userId,
            slug: await uniqueSlug(
              d.title,
              async (slug) =>
                !!(await tx.event.findFirst({
                  where: { OR: [{ slug }, { id: slug }] },
                })),
            ),
            origin: isolatedTestData() ? "DEMO" : "REAL",
            testOnly: isolatedTestData(),
            status: "DRAFT",
            configurationStatus: "DRAFT_CONFIG",
          }),
      ...(old?.status === "PUBLISHED" && !bookings
        ? {
            status: "DRAFT",
            salesPaused: true,
            reviewOutcome: "CHANGES_REQUESTED",
            reviewNotes: "Updated event requires a new publication review.",
          }
        : {}),
    };
    const saved = old
      ? await tx.event.update({
          where: { id: old.id },
          data: { ...data, stateVersion: { increment: 1 } },
        })
      : await tx.event.create({
          data: { ...data, organizerId: userId, slug: data.slug! },
        });
    if (!bookings) {
      for (const t of tiers) {
        if (t.id && !old?.tiers.some((v) => v.id === t.id))
          throw Error("403:Ticket tier does not belong to this event.");
        const { id: tid, saleStart, saleEnd, ...rest } = t;
        const value = {
          ...rest,
          saleStart: saleStart ? new Date(saleStart) : null,
          saleEnd: saleEnd ? new Date(saleEnd) : null,
        };
        if (tid)
          await tx.eventTicketTier.update({ where: { id: tid }, data: value });
        else
          await tx.eventTicketTier.create({
            data: { ...value, eventId: saved.id },
          });
      }
      await tx.eventTicketTier.deleteMany({
        where: {
          eventId: saved.id,
          id: {
            in:
              old?.tiers
                .filter((t) => !tiers.some((v) => v.id === t.id))
                .map((t) => t.id) || [],
          },
        },
      });
      for (const q of fields) {
        if (q.id && !old?.fields.some((v) => v.id === q.id))
          throw Error("403:Question does not belong to this event.");
        const { id: qid, ...value } = q;
        if (qid)
          await tx.eventRegistrationField.update({
            where: { id: qid },
            data: value,
          });
        else
          await tx.eventRegistrationField.create({
            data: { ...value, eventId: saved.id },
          });
      }
      await tx.eventRegistrationField.deleteMany({
        where: {
          eventId: saved.id,
          id: {
            in:
              old?.fields
                .filter((f) => !fields.some((q) => q.id === f.id))
                .map((f) => f.id) || [],
          },
        },
      });
    }
    if (creatorSnapshot) {
      const snapshot = structuredClone(creatorSnapshot) as any;
      const definitions = await tx.event.findUniqueOrThrow({
        where: { id: saved.id },
        include: { tiers: { orderBy: { sortOrder: "asc" } }, fields: true },
      });
      snapshot.tiers = snapshot.tiers.map((t: any, i: number) => ({
        ...t,
        id:
          definitions.tiers.find((x) => x.name === t.name)?.id ||
          definitions.tiers[i]?.id,
      }));
      snapshot.fields = snapshot.fields.map((q: any, i: number) => ({
        ...q,
        id:
          definitions.fields.find((x) => x.label === q.label)?.id ||
          definitions.fields[i]?.id,
      }));
      const validatedThrough = Object.keys(eventWizardErrors(snapshot, 0))
        .length
        ? -1
        : Object.keys(eventWizardErrors(snapshot, 1)).length
          ? 0
          : 1;
      await tx.eventCreatorState.upsert({
        where: { eventId: saved.id },
        create: {
          eventId: saved.id,
          payload: JSON.stringify(snapshot),
          validatedThrough,
        },
        update: { payload: JSON.stringify(snapshot), validatedThrough },
      });
    } else
      await tx.eventCreatorState.deleteMany({ where: { eventId: saved.id } });
    await audit(
      tx,
      userId,
      old ? "EVENT_DRAFT_UPDATED" : "EVENT_DRAFT_CREATED",
      saved.id,
      {
        eventId: saved.id,
        entityType: "EVENT",
        previousState: old?.status,
        newState: saved.status,
      },
    );
    return tx.event.findUniqueOrThrow({
      where: { id: saved.id },
      include: { tiers: { orderBy: { sortOrder: "asc" } }, fields: true },
    });
  });
}
export async function submitEvent(userId: string, eventId: string) {
  return transaction(async (tx) => {
    const { event } = await eventPermission(tx, userId, eventId, "manage");
    if (event.pendingChangeId)
      throw Error(
        "409:Resolve the pending change before submitting publication.",
      );
    if (event.status === "PENDING_REVIEW") return event;
    if (event.status !== "DRAFT")
      throw Error("409:Only drafts can be submitted.");
    const creator = await tx.eventCreatorState.findUnique({
      where: { eventId },
    });
    if (creator) {
      const snapshot = JSON.parse(creator.payload);
      const errors = eventWizardErrors(
        snapshot,
        2,
        new Date(),
        await eventCreatorReadiness(tx, event.organizerId),
      );
      const canonical = draftInput.safeParse({
        ...snapshot,
        tiers: snapshot.tiers.map(
          ({ priceInput, pricingMode, ...t }: any) => t,
        ),
      });
      if (!canonical.success)
        throw Error(
          "400:Finish your ticket and registration options before submitting.",
        );
      if (Object.keys(errors).length)
        throw Error("400:" + Object.values(errors)[0]);
    }
    const problems = await publicationProblems(tx, event);
    if (problems.length) throw Error("400:" + problems.join(" "));
    // Fictional events also require an independent editorial review.
    // Approval can activate the guarded simulator only; real sales stay disabled.
    await tx.event.update({
      where: { id: eventId },
      data: {
        status: "PENDING_REVIEW",
        reviewOutcome: "PENDING_REVIEW",
        reviewNotes: "",
        submittedAt: new Date(),
        stateVersion: { increment: 1 },
      },
    });
    await audit(tx, userId, "EVENT_SUBMITTED", eventId, {
      eventId,
      entityType: "EVENT",
      previousState: "DRAFT",
      newState: "PENDING_REVIEW",
    });
    await notify(
      tx,
      userId,
      "event-submit:" + eventId + ":" + event.stateVersion,
      "Event submitted",
      "An administrator will review your event. Ticket sales remain disabled.",
    );
    await notifyAdmins(
      tx,
      `event-queue:${eventId}:${event.stateVersion}`,
      "Event awaiting review",
      "An organizer submitted an event for publication review.",
    );
    return { ok: true };
  });
}
