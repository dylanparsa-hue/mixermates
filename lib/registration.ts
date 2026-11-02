import type { Tx } from "./domain-core";
export function entrySelection(event: any, key?: string) {
  const options = JSON.parse(event.entryOptions || "[]");
  if (!options.length) {
    if (key) throw Error("400:Choose a valid entry option.");
    return null;
  }
  const option = options.find((x: any) => x.key === key);
  if (
    !option ||
    !["FEE", "BYOB"].includes(option.relationship) ||
    !Number.isSafeInteger(option.price) ||
    option.price < 0
  )
    throw Error("400:Choose a confirmed entry option.");
  return option;
}
export async function validateRegistration(
  tx: Tx,
  event: any,
  user: any,
  answers: Record<string, unknown>,
  entryKey?: string,
) {
  const fields = await tx.eventRegistrationField.findMany({
      where: { eventId: event.id },
    }),
    allowed = new Set(
      fields
        .filter((f) => !f.hidden && (!f.condition || f.condition === entryKey))
        .map((f) => f.id),
    );
  if (Object.keys(answers).some((k) => !allowed.has(k)))
    throw Error("400:Registration contains an unknown or inactive question.");
  const safe: Record<string, unknown> = {};
  for (const f of fields) {
    if (!allowed.has(f.id)) continue;
    const v = answers[f.id],
      empty =
        v === undefined ||
        v === null ||
        v === "" ||
        v === false ||
        (Array.isArray(v) && v.length === 0);
    // Conditional proof questions are fulfilled at the private evidence step, after reservation.
    if (f.type === "file" && f.condition && /proof|evidence/i.test(f.label))
      continue;
    if (empty) {
      if (f.required) throw Error("400:" + f.label + " is required.");
      continue;
    }
    if (f.type === "consent") {
      if (v !== true) throw Error("400:Confirm " + f.label + ".");
      safe[f.id] = true;
      continue;
    }
    if (f.type === "checkbox") {
      const values = Array.isArray(v) ? v : [v];
      const choices = f.options
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (
        values.length > 30 ||
        values.some((x) => typeof x !== "string" || !choices.includes(x))
      )
        throw Error("400:Choose valid options for " + f.label + ".");
      safe[f.id] = values;
      continue;
    }
    if (typeof v !== "string" || v.length > 4000)
      throw Error("400:Check " + f.label + ".");
    const text = v.trim();
    if (f.required && !text) throw Error("400:" + f.label + " is required.");
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      throw Error("400:Enter a valid email address.");
    if (f.type === "tel" && !/^[+\d ()-]{6,30}$/.test(text))
      throw Error("400:Enter a valid phone number.");
    if (
      f.type === "number" &&
      (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text)))
    )
      throw Error("400:Enter a valid number for " + f.label + ".");
    if (
      /^age$/i.test(f.label) &&
      (Number(text) < event.age || Number(text) > 110)
    )
      throw Error("400:Age does not meet this event’s requirements.");
    if (
      ["select", "radio"].includes(f.type) &&
      !f.options
        .split(",")
        .map((x) => x.trim())
        .includes(text)
    )
      throw Error("400:Choose a valid option for " + f.label + ".");
    if (f.type === "file") {
      const file = await tx.fileUpload.findUnique({ where: { id: text } });
      if (!file || file.userId !== user.id || !file.private || !file.data)
        throw Error("400:Upload your own private attachment.");
    }
    safe[f.id] = text;
  }
  return JSON.stringify(safe);
}

export async function bookedHolder(
  tx: Tx,
  booking: { eventId: string; answers: string },
  fallback: string,
) {
  const field = await tx.eventRegistrationField.findFirst({
    where: { eventId: booking.eventId, label: { contains: "Full name" } },
  });
  return holderName(booking.answers, field?.id, fallback);
}
export function holderName(answers: string, fieldId: string | undefined, fallback: string) {
  if (!fieldId) return fallback;
  const value = JSON.parse(answers || "{}")[fieldId];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : fallback;
}
