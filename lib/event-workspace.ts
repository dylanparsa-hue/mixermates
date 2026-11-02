import { z } from "zod";
import {
  draftInput,
  organizerActor,
  saveEventDraft,
  eventCreatorReadiness,
} from "./event-management";
import { db } from "./db";
import { transaction, audit } from "./domain-core";
import { eventWizardErrors, firstInvalidStep } from "./event-wizard-validation";

const relaxedTier = z
  .object({
    ...draftInput.shape.tiers.removeDefault().element.shape,
    name: z.string().trim().max(80),
    quantity: z.number().int().min(0).max(100000),
    minPerOrder: z.number().int().min(0).max(10).default(1),
    maxPerOrder: z.number().int().min(0).max(10).default(4),
    priceInput: z.string().max(24).optional(),
    pricingMode: z.enum(["FREE", "PAID"]).optional(),
  })
  .strict();
const relaxedQuestion = z
  .object({
    ...draftInput.shape.fields.removeDefault().element.shape,
    label: z.string().trim().max(100),
  })
  .strict();
export const workspaceInput = draftInput.extend({
  timezone: z.string().max(80).default("Asia/Kuala_Lumpur"),
  tiers: z.array(relaxedTier).max(10).default([]),
  fields: z.array(relaxedQuestion).max(25).default([]),
  entryOptions: z
    .array(
      draftInput.shape.entryOptions.removeDefault().element.extend({
        label: z.string().max(100),
        priceInput: z.string().max(24).optional(),
      }),
    )
    .max(5)
    .default([]),
});
export const workspaceRequest = z
  .object({
    draft: workspaceInput,
    advanceTo: z.number().int().min(1).max(3).optional(),
  })
  .strict();
/** Raw unfinished input is private and cannot alter existing bookings or become a reviewed event. */
export async function saveEventWorkspace(userId: string, input: unknown) {
  await organizerActor(db, userId);
  const { draft, advanceTo } = workspaceRequest.parse(input);
  if (draft.paymentMode === "TEST_SIMULATOR") {
    await (await import("./payment-simulator")).assertSimulator();
    draft.paymentDestinationId = null;
    draft.policies ||= (await import("./simulator-policy")).TEST_EVENT_POLICY;
  }
  const readiness =
    (advanceTo || 0) >= 2 ||
    draft.paymentDestinationId ||
    draft.paymentMode === "TEST_SIMULATOR"
      ? await eventCreatorReadiness(db, userId)
      : undefined;
  const errors = eventWizardErrors(
    draft,
    advanceTo ? advanceTo - 1 : 2,
    new Date(),
    readiness,
  );
  if (advanceTo && Object.keys(errors).length)
    return {
      validation: {
        error: Object.values(errors)[0],
        fieldErrors: errors,
        step: firstInvalidStep(errors),
      },
    };
  const canonical = {
    ...draft,
    tiers: draft.tiers.map(({ priceInput, pricingMode, ...t }) => t),
  };
  // A short description is sufficient. Legacy long descriptions remain intact.
  canonical.description ||= canonical.shortDescription;
  const parsed = draftInput.safeParse(canonical);
  const dateInvalid = ["startsLocal", "endsLocal", "timezone"].some(
    (k) => errors[k],
  );
  const needsSnapshotOnly =
    !parsed.success ||
    dateInvalid ||
    (!!draft.paymentDestinationId &&
      !!readiness &&
      !readiness.approvedDestinationIds.includes(draft.paymentDestinationId)) ||
    !!errors.capacity ||
    Object.keys(errors).some(
      (k) => k.startsWith("tier-") || k.startsWith("question-"),
    );
  if (!needsSnapshotOnly) {
    const event = await saveEventDraft(userId, canonical, draft);
    const state = await db.eventCreatorState.findUnique({
      where: { eventId: event.id },
    });
    return {
      event,
      form: state ? JSON.parse(state.payload) : draft,
      advanceTo,
    };
  }
  if (advanceTo) {
    // Structural advanced input still goes through the canonical schema; no client-only transition.
    if (advanceTo >= 2 && !parsed.success)
      return {
        validation: {
          error: "Check the highlighted ticket or question.",
          fieldErrors: { tiers: "Check your ticket and question options." },
          step: 1,
        },
      };
    // Step 1 can advance with incomplete ticket settings, but the draft snapshot stays private.
  }
  let created: any = null;
  if (!draft.id) {
    created = await saveEventDraft(userId, {
      creationKey: draft.creationKey,
      title: draft.title,
    });
  }
  const event = await transaction(async (tx) => {
    await organizerActor(tx, userId);
    const old = await tx.event.findUniqueOrThrow({
      where: { id: draft.id || created.id },
      include: { tiers: true, fields: true },
    });
    if (old.organizerId !== userId)
      throw Error("403:Only the event owner can edit this draft.");
    if (old.status !== "DRAFT" || old.pendingChangeId)
      throw Error("409:Only an editable draft can save unfinished changes.");
    if (
      !draft.id &&
      (await tx.eventCreatorState.findUnique({ where: { eventId: old.id } }))
    )
      return old;
    if ((draft.id ? draft.version : created.stateVersion) !== old.stateVersion)
      throw Error(
        "409:This draft changed in another session. Reload before saving.",
      );
    const validatedThrough = Object.keys(eventWizardErrors(draft, 0)).length
      ? -1
      : Object.keys(eventWizardErrors(draft, 1)).length
        ? 0
        : 1;
    await tx.eventCreatorState.upsert({
      where: { eventId: old.id },
      create: {
        eventId: old.id,
        payload: JSON.stringify(draft),
        validatedThrough,
      },
      update: { payload: JSON.stringify(draft), validatedThrough },
    });
    const result = await tx.event.update({
      where: { id: old.id },
      data: { stateVersion: { increment: 1 } },
      include: { tiers: true, fields: true },
    });
    await audit(tx, userId, "EVENT_UNFINISHED_DRAFT_SAVED", old.id, {
      eventId: old.id,
      entityType: "EVENT",
    });
    return result;
  });
  const state = await db.eventCreatorState.findUnique({
    where: { eventId: event.id },
  });
  return { event, form: state ? JSON.parse(state.payload) : draft, advanceTo };
}
