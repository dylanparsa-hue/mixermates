// Local development adapter. Never called when NODE_ENV !== development.
import { cookies, headers } from "next/headers";
import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "./db";
import { testLabEnvironment, testLabRequest } from "./test-lab-guard";
import { createSession, currentUser, hashToken } from "./auth";
import { persistSession } from "./session-security";
export const labRoles = [
  "Customer",
  "Organizer",
  "Administrator",
  "Finance Reviewer",
  "Entrance Staff",
  "Community Friend",
] as const;
export type LabRole = (typeof labRoles)[number];
export type LabMarker = {
  version: 1;
  fictional: true;
  workspace: string;
  database: string;
  nonce: string;
  ownerId: string;
  personas: Record<LabRole, string>;
  destinationId: string;
};
const deny = () => {
  throw Error("404:Not found.");
};
export async function assertLabEnvironment(
  request?: Request,
  reader: Pick<
    typeof db,
    "user" | "event" | "ticket" | "booking" | "paymentRecipientVersion"
  > = db,
): Promise<LabMarker> {
  if (!testLabEnvironment() || (request && !testLabRequest(request)))
    return deny();
  try {
    const cwd = await realpath(process.cwd());
    const marker: LabMarker = JSON.parse(
      await readFile(cwd + "/.local/test-lab-marker.json", "utf8"),
    );
    if (
      marker.version !== 1 ||
      marker.fictional !== true ||
      marker.workspace !== cwd ||
      marker.database !== cwd + "/prisma/audit.db" ||
      marker.database !== (await realpath(cwd + "/prisma/audit.db")) ||
      new Set(Object.values(marker.personas)).size !== 6
    )
      return deny();
    const sentinel = await reader.user.findUnique({
      where: { id: "test-lab-sentinel" },
    });
    if (
      !sentinel ||
      sentinel.active ||
      sentinel.bio !== createHash("sha256").update(marker.nonce).digest("hex")
    )
      return deny();
    if (
      (await reader.event.count({ where: { testOnly: false } })) ||
      (await reader.ticket.count({ where: { testOnly: false } })) ||
      (await reader.booking.count({ where: { testOnly: false } })) ||
      (await reader.paymentRecipientVersion.count({
        where: { testOnly: false },
      }))
    )
      return deny();
    if (
      await reader.user.count({
        where: {
          NOT: {
            OR: [
              { email: { endsWith: "@example.test" } },
              { email: { endsWith: "@vibey.demo" } },
            ],
          },
        },
      })
    )
      return deny();
    return marker;
  } catch {
    return deny();
  }
}
export async function labOwner(marker: LabMarker) {
  const token = (await cookies()).get("mm-test-lab")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  return session &&
    session.userId === marker.ownerId &&
    session.expires > new Date() &&
    session.user.active &&
    session.securityVersion === session.user.securityVersion
    ? session.user
    : null;
}
export async function labContext(request?: Request) {
  const marker = await assertLabEnvironment(request);
  if (!(await labOwner(marker)))
    throw Error("401:Sign in to the local Test Lab first.");
  const user = await currentUser();
  return {
    marker,
    user,
    role:
      labRoles.find((r) => marker.personas[r] === user?.id) ||
      "Signup customer",
  };
}
/** A request-bound local access exception; persisted domain permissions still apply. */
export async function localLabAccess() {
  if (!testLabEnvironment()) return false;
  try {
    const h = await headers();
    const request = new Request(process.env.APP_ORIGIN! + "/test-lab", {
      headers: h,
    });
    const marker = await assertLabEnvironment(request);
    return !!(await labOwner(marker));
  } catch {
    return false;
  }
}
/** Code-free entry is available only inside the verified disposable loopback Lab. */
export async function labLogin(request: Request) {
  const marker = await assertLabEnvironment(request);
  if (await labOwner(marker)) return;
  const owner = await db.user.findUniqueOrThrow({
    where: { id: marker.ownerId },
  });
  if (!owner.active || owner.role !== "ATTENDEE") return deny();
  const oldReturn = (await cookies()).get("mm-lab-return")?.value;
  if (oldReturn)
    await db.session.deleteMany({ where: { id: hashToken(oldReturn) } });
  (await cookies()).delete("mm-lab-return");
  const old = (await cookies()).get("mm-test-lab")?.value;
  if (old) await db.session.deleteMany({ where: { id: hashToken(old) } });
  const token = await persistSession(owner.id, owner);
  (await cookies()).set("mm-test-lab", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 8 * 3600,
  });
  await db.session.update({
    where: { id: hashToken(token) },
    data: { expires: new Date(Date.now() + 8 * 3600000) },
  });
  await createSession(marker.personas.Customer);
}
async function rememberLabCustomer(
  user: Awaited<ReturnType<typeof currentUser>>,
) {
  if (!user || !["ATTENDEE", "ORGANIZER"].includes(user.role)) return;
  const jar = await cookies(),
    old = jar.get("mm-lab-return")?.value;
  if (old) await db.session.deleteMany({ where: { id: hashToken(old) } });
  const token = await persistSession(user.id, user);
  await db.session.update({
    where: { id: hashToken(token) },
    data: { expires: new Date(Date.now() + 8 * 3600000) },
  });
  jar.set("mm-lab-return", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function switchLabPersona(request: Request, role: string) {
  const { marker } = await labContext(request);
  if (!labRoles.includes(role as LabRole))
    throw Error("400:Choose an available test persona.");
  const id = marker.personas[role as LabRole];
  const actor = await db.user.findUniqueOrThrow({ where: { id } });
  const expected =
    role === "Administrator"
      ? "ADMIN"
      : role === "Organizer"
        ? "ORGANIZER"
        : ["Finance Reviewer", "Entrance Staff"].includes(role)
          ? "STAFF"
          : "ATTENDEE";
  if (!actor.active || actor.role !== expected)
    throw Error("409:The fictional persona is unavailable.");
  if (role !== "Customer") await rememberLabCustomer(await currentUser());
  (await cookies()).delete("mm-lab-workspace");
  await createSession(actor.id);
  await db.adminAuditLog.create({
    data: {
      userId: actor.id,
      actorRole: actor.role,
      action: "TEST_LAB_PERSONA_SELECTED",
      targetId: actor.id,
      entityType: "USER",
    },
  });
}
export async function endLab() {
  for (const name of [
    "mm-test-lab",
    "vibey-session",
    "mm-lab-workspace",
    "mm-lab-return",
  ]) {
    const t = (await cookies()).get(name)?.value;
    if (t) await db.session.deleteMany({ where: { id: hashToken(t) } });
    (await cookies()).delete(name);
  }
}

export async function switchLabWorkspace(
  request: Request,
  workspace: "Customer" | "Organizer" | "Admin",
) {
  const { user } = await labContext(request);
  if (workspace === "Admin") await switchLabPersona(request, "Administrator");
  else if (!user || !["ATTENDEE", "ORGANIZER"].includes(user.role)) {
    const jar = await cookies(),
      token = jar.get("mm-lab-return")?.value;
    const remembered = token
      ? await db.session.findUnique({
          where: { id: hashToken(token) },
          include: { user: true },
        })
      : null;
    if (
      remembered &&
      remembered.expires > new Date() &&
      remembered.user.active &&
      remembered.securityVersion === remembered.user.securityVersion &&
      ["ATTENDEE", "ORGANIZER"].includes(remembered.user.role)
    ) {
      await createSession(remembered.userId, remembered.user);
      await db.session.delete({ where: { id: remembered.id } });
    } else await switchLabPersona(request, "Customer");
    jar.delete("mm-lab-return");
  }
  (await cookies()).set("mm-lab-workspace", workspace, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 8 * 3600,
  });
}
/** Bridge normal admin event approval into the existing guarded fictional workflow. */
export async function authorizeReviewedLabEvent(
  eventId: string,
  reviewerId: string,
) {
  if (!(await localLabAccess())) return;
  const { marker } = await labContext();
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  const owner = await db.user.findUnique({
    where: { id: event.organizerId },
    include: { capabilities: { where: { active: true } } },
  });
  if (
    !owner?.active ||
    !["ATTENDEE", "ORGANIZER"].includes(owner.role) ||
    !/@(example\.test|vibey\.demo)$/.test(owner.email) ||
    !(
      owner.role === "ORGANIZER" ||
      owner.capabilities.some((c) => c.capability === "ORGANIZER")
    )
  )
    return;
  if (
    !event.testOnly ||
    event.status !== "PUBLISHED" ||
    event.reviewedById !== reviewerId ||
    reviewerId !== marker.personas.Administrator ||
    event.organizerId === reviewerId
  )
    throw Error("403:Independent local event approval required.");
  const { transaction, audit } = await import("./domain-core");
  await transaction(async (tx) => {
    const current = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
    });
    if (current.stateVersion !== event.stateVersion)
      throw Error("409:Event changed during review.");
    await tx.event.update({
      where: { id: eventId },
      data: {
        origin: "REAL",
        configurationStatus: "FICTIONAL_APPROVED",
        ...(current.paymentMode === "TEST_SIMULATOR" &&
        current.refundPolicy === "{}"
          ? {
              refundPolicy: JSON.stringify({
                kind: "REVIEW_REQUIRED",
                terms: (await import("./simulator-constants"))
                  .TEST_EVENT_POLICY,
                deadline: null,
                allowAfterChange: true,
              }),
            }
          : {}),
      },
    });
    await audit(tx, reviewerId, "TEST_LAB_SCENARIO_AUTHORIZED", eventId, {
      eventId,
      entityType: "EVENT",
    });
  });
  const { setEventStaff } = await import("./staff-permissions");
  for (const [role, permissions] of [
    ["Finance Reviewer", { canReviewPayments: true }],
    ["Entrance Staff", { canCheckIn: true, canViewGuests: true }],
  ] as const) {
    await setEventStaff(reviewerId, {
      eventId,
      userId: marker.personas[role],
      active: true,
      ...permissions,
    });
  }
}
