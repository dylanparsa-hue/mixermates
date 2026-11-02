import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { databaseUrl } from "./database-url";
import { RELEASE_SCOPE } from "./release-scope";
export type Tx = Prisma.TransactionClient;
export function isolatedTestData() {
  if (
    RELEASE_SCOPE !== "development" ||
    process.env.NODE_ENV === "production" ||
    process.env.ISOLATED_TEST_DATA !== "true"
  )
    return false;
  const value = databaseUrl();
  if (value?.startsWith("file:")) return true;
  try {
    const url = new URL(value || "");
    return (
      process.env.MYSQL_DISPOSABLE_TEST === "true" &&
      url.protocol === "mysql:" &&
      url.hostname === "127.0.0.1" &&
      url.port === "13306" &&
      url.username === "p4test" &&
      /^\/mixermates_p4_(main|restore|upgrade)$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function retryableTransactionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (
    ["P2034", "P2002", "P1008", "P2028"].includes(
      (error as { code?: string }).code || "",
    )
  )
    return true;
  // MariaDB 11.8 reports optimistic record conflicts as an unmapped connector error.
  // Retry the entire rolled-back transaction, never just its last statement.
  return (
    error instanceof Prisma.PrismaClientUnknownRequestError &&
    /MysqlError \{ code: 1020,/.test(error.message) &&
    /try restarting transaction/.test(error.message)
  );
}
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error: any) {
      if (attempt >= 4 || !retryableTransactionError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
export async function actor(tx: Tx, id: string) {
  const user = await tx.user.findUnique({
    where: { id },
    include: { capabilities: { where: { active: true } } },
  });
  if (!user?.active) throw Error("403:Active account required.");
  return user;
}
export type EventCapability =
  "manage" | "guests" | "checkin" | "payments" | "registrations" | "location";
const staffFields = {
  guests: "canViewGuests",
  checkin: "canCheckIn",
  payments: "canReviewPayments",
  registrations: "canApproveRegistrations",
  location: "canViewLocation",
} as const;
export async function eventPermission(
  tx: Tx,
  userId: string,
  eventId: string,
  capability: EventCapability,
) {
  const user = await actor(tx, userId);
  const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
  if (event.organizerId === user.id || user.role === "ADMIN")
    return { user, event };
  const staff = await tx.eventStaff.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (
    capability === "manage" ||
    !staff?.active ||
    !staff[staffFields[capability]]
  )
    throw Error("403:Event permission required.");
  return { user, event };
}
export async function eventFence(
  tx: Tx,
  event: { id: string; stateVersion: number; status: string },
  registration = false,
) {
  if ((event as any).pendingChangeId)throw Error("409:Event changes are awaiting review.");
  if (event.status !== "PUBLISHED")
    throw Error("409:This event is not active.");
  const result = await tx.event.updateMany({
    where: {
      id: event.id,
      stateVersion: event.stateVersion,
      status: "PUBLISHED",
      endsAt: { gt: new Date() },
      ...(registration ? { salesPaused: false } : {}),
    },
    data: { stateVersion: { increment: 1 } },
  });
  if (result.count !== 1)
    throw Error("409:Event eligibility changed or the event has ended.");
}
export async function audit(
  tx: Tx,
  userId: string,
  action: string,
  targetId: string,
  info: {
    eventId?: string;
    entityType?: string;
    previousState?: string;
    newState?: string;
    reasonCode?: string;
    correlationId?: string;
  } = {},
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });
  return tx.adminAuditLog.create({
    data: {
      userId,
      actorRole: user.role,
      action,
      targetId,
      ...info,
      correlationId: info.correlationId || randomUUID(),
    },
  });
}
export async function notify(
  tx: Tx,
  userId: string,
  key: string,
  title: string,
  body: string,
  link?: string,
) {
  return tx.notification.upsert({
    where: { dedupeKey: key },
    update: {},
    create: {
      userId,
      dedupeKey: key,
      title,
      body,
      link:
        link ||
        (/^(registration-owner|proof-owner):/.test(key)
          ? "/organizer?tab=Booking%20reviews"
          : /^(event-review|event-reviewed|event-submit):/.test(key)
            ? "/organizer?tab=My%20events"
            : /^(tickets|payment|registration|instructions|reserved|cancelled|event-cancel|expired):/.test(
                  key,
                )
              ? "/bookings/" + encodeURIComponent(key.split(":")[1])
              : "/my-bookings"),
      deliveryChannel: "IN_APP",
      deliveryStatus: "AVAILABLE",
    },
  });
}

export async function notifyAdmins(
  tx: Tx,
  key: string,
  title: string,
  body: string,
  link = "/admin?tab=Event%20setup",
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true },
  });
  for (const a of admins)
    await notify(tx, a.id, key + ":" + a.id, title, body, link);
}
