import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import {
  actor,
  audit,
  isolatedTestData,
  eventFence,
  notify,
  transaction,
} from "./domain-core";
import { expireReservation, issueTickets } from "./booking-domain";
export interface TransactionalTransport {
  send(message: {
    idempotencyKey: string;
    template: string;
    title: string;
    body: string;
    link: string;
    signal?: AbortSignal;
  }): Promise<void>;
}
export function notificationTemplate(title: string) {
  return /refund/i.test(title)
    ? "REFUND_STATUS"
    : /cancel/i.test(title)
      ? "EVENT_CANCELLED"
      : /details updated|reschedul/i.test(title)
        ? "EVENT_RESCHEDULED"
        : /ticket/i.test(title)
          ? "TICKET_ISSUED"
          : /payment|evidence/i.test(title)
            ? "PAYMENT_REVIEW"
            : /registration/i.test(title)
              ? "REGISTRATION_REVIEW"
              : /recovery|password/i.test(title)
                ? "PASSWORD_RECOVERY"
                : "SERVICE_UPDATE";
}
export const localMailboxTransport: TransactionalTransport = {
  async send(message) {
    if (!isolatedTestData()) throw Error("Local mock transport unavailable.");
    message.signal?.throwIfAborted();
    const dir = path.join(process.cwd(), ".local", "notification-mailbox");
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const name = createHash("sha256")
        .update(message.idempotencyKey)
        .digest("hex"),
      temporary = path.join(dir, name + "-" + randomUUID() + ".tmp");
    await writeFile(
      temporary,
      JSON.stringify({
        ...message,
        signal: undefined,
        transport: "LOCAL_MOCK_ONLY_NO_EMAIL_SENT",
      }),
      { mode: 0o600, flag: "wx" },
    );
    try {
      message.signal?.throwIfAborted();
      await link(temporary, path.join(dir, name + ".json"));
    } catch (e: any) {
      if (e.code !== "EEXIST") throw e;
    } finally {
      await unlink(temporary).catch(() => {});
    }
  },
};
class DeliveryTimeout extends Error {}
async function sendWithDeadline(
  transport: TransactionalTransport,
  message: Parameters<TransactionalTransport["send"]>[0],
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      // Defer invocation so synchronous adapter errors follow the same safe failure path.
      Promise.resolve().then(() =>
        transport.send({ ...message, signal: controller.signal }),
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new DeliveryTimeout());
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function deliveryFailureAlert(
  tx: Parameters<Parameters<typeof transaction>[0]>[0],
  id: string,
) {
  const admins = await tx.user.findMany({
    where: { active: true, role: "ADMIN" },
    select: { id: true },
  });
  for (const a of admins) {
    const alert = await notify(
      tx,
      a.id,
      `delivery-failed:${id}:${a.id}`,
      "Notification processing needs attention",
      "An important local delivery job reached its retry limit. In-app content remains available.",
      "/admin?tab=Operations",
    );
    await tx.notification.update({
      where: { id: alert.id },
      data: { jobStatus: "SKIPPED", category: "OPERATIONAL" },
    });
  }
}
export async function processNotifications(
  adminId: string,
  transport: TransactionalTransport = localMailboxTransport,
  now = new Date(),
  limit = 50,
  onlyId?: string,
  deliveryTimeoutMs = 10000,
) {
  if (!isolatedTestData())
    throw Error(
      "503:Only isolated local notification processing is enabled. No external email transport is connected.",
    );
  const u = await actor(db, adminId);
  if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
  if (
    !Number.isInteger(deliveryTimeoutMs) ||
    deliveryTimeoutMs < 1 ||
    deliveryTimeoutMs > 30000
  )
    throw Error("400:Delivery timeout must be shorter than the worker lease.");
  const rows = await db.notification.findMany({
    where: {
      ...(onlyId ? { id: onlyId } : {}),
      attempts: { lt: 3 },
      OR: [
        {
          jobStatus: { in: ["PENDING", "RETRY"] },
          nextAttemptAt: { lte: now },
        },
        { jobStatus: "PROCESSING", leaseUntil: { lte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(100, Math.max(1, limit)),
  });
  const results = [];
  for (const item of rows) {
    const token = randomUUID();
    const claimed = await transaction(async (tx) => {
      const currentActor = await actor(tx, adminId);
      if (currentActor.role !== "ADMIN")
        throw Error("403:Administrator access required.");
      const n = await tx.notification.findUnique({
        where: { id: item.id },
        include: { user: true },
      });
      if (
        !n ||
        n.attempts >= 3 ||
        !(
          (["PENDING", "RETRY"].includes(n.jobStatus) &&
            n.nextAttemptAt <= now) ||
          (n.jobStatus === "PROCESSING" && n.leaseUntil && n.leaseUntil <= now)
        )
      )
        return false;
      const optional: Record<string, boolean> = {
        PROMOTIONAL: n.user.promotionalNotifications,
        SOCIAL: n.user.socialNotifications,
        REMINDER: n.user.eventReminders,
        ANNOUNCEMENT: n.user.organizerAnnouncements,
      };
      if (!n.user.active || optional[n.category] === false) {
        await tx.notification.update({
          where: { id: n.id },
          data: {
            jobStatus: "SKIPPED",
            lastError: "OPTIONAL_CONSENT_OR_ACCOUNT_UNAVAILABLE",
          },
        });
        return false;
      }
      const update = await tx.notification.updateMany({
        where: {
          id: n.id,
          jobStatus: n.jobStatus,
          attempts: n.attempts,
          workerToken: n.workerToken,
        },
        data: {
          jobStatus: "PROCESSING",
          workerToken: token,
          leaseUntil: new Date(now.getTime() + 60000),
          lastAttemptAt: now,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      return update.count === 1;
    });
    if (!claimed) continue;
    let success = true;
    let failureCode = "LOCAL_TRANSPORT_FAILURE";
    try {
      await sendWithDeadline(
        transport,
        {
          idempotencyKey: item.id,
          template: notificationTemplate(item.title),
          title: item.title,
          body: item.body,
          link: item.link.replace(/^\/booking\//, "/bookings/"),
        },
        deliveryTimeoutMs,
      );
    } catch (error) {
      success = false;
      if (error instanceof DeliveryTimeout)
        failureCode = "LOCAL_TRANSPORT_TIMEOUT";
    }
    const result = await transaction(async (tx) => {
      const n = await tx.notification.findUnique({
        where: { id: item.id },
      });
      if (!n) return { id: item.id, status: "REMOVED" };
      if (n.workerToken !== token || n.jobStatus !== "PROCESSING")
        return { id: n.id, status: "LEASE_CHANGED" };
      const status = success
        ? "MOCK_DELIVERED"
        : n.attempts >= 3
          ? "FAILED"
          : "RETRY";
      await tx.notification.update({
        where: { id: n.id },
        data: {
          jobStatus: status,
          leaseUntil: null,
          workerToken: null,
          lastError: success ? null : failureCode,
          nextAttemptAt: new Date(
            now.getTime() + 60000 * 2 ** (n.attempts - 1),
          ),
        },
      });
      await audit(tx, adminId, "NOTIFICATION_JOB_ATTEMPT", n.id, {
        entityType: "NOTIFICATION",
        previousState: "PROCESSING",
        newState: status,
        reasonCode: success ? "LOCAL_MOCK_ONLY_NO_EMAIL_SENT" : failureCode,
      });
      if (status === "FAILED") {
        await deliveryFailureAlert(tx, n.id);
      }
      return { id: n.id, status };
    });
    results.push(result);
  }
  // A third worker that died after claiming its final attempt must not strand a permanent PROCESSING row.
  const abandoned = await db.notification.findMany({
    where: {
      ...(onlyId ? { id: onlyId } : {}),
      jobStatus: "PROCESSING",
      attempts: { gte: 3 },
      leaseUntil: { lte: now },
    },
    select: { id: true },
    take: Math.min(100, Math.max(1, limit)),
  });
  for (const item of abandoned)
    await transaction(async (tx) => {
      const currentActor = await actor(tx, adminId);
      if (currentActor.role !== "ADMIN")
        throw Error("403:Administrator access required.");
      const changed = await tx.notification.updateMany({
        where: {
          id: item.id,
          jobStatus: "PROCESSING",
          attempts: { gte: 3 },
          leaseUntil: { lte: now },
        },
        data: {
          jobStatus: "FAILED",
          workerToken: null,
          leaseUntil: null,
          lastError: "FINAL_LEASE_EXPIRED",
        },
      });
      if (!changed.count) return;
      await audit(tx, adminId, "NOTIFICATION_JOB_ATTEMPT", item.id, {
        entityType: "NOTIFICATION",
        previousState: "PROCESSING",
        newState: "FAILED",
        reasonCode: "FINAL_LEASE_EXPIRED",
      });
      await deliveryFailureAlert(tx, item.id);
      results.push({ id: item.id, status: "FAILED" });
    });
  return results;
}
export async function retryNotification(adminId: string, id: string) {
  return transaction(async (tx) => {
    const u = await actor(tx, adminId);
    if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
    const n = await tx.notification.findUniqueOrThrow({ where: { id } });
    if (!["FAILED", "RETRY"].includes(n.jobStatus) || n.retryCycles >= 10)
      throw Error("409:This job cannot be manually retried.");
    await tx.notification.update({
      where: { id },
      data: {
        jobStatus: "RETRY",
        attempts: 0,
        retryCycles: { increment: 1 },
        nextAttemptAt: new Date(),
        workerToken: null,
        leaseUntil: null,
        lastError: null,
      },
    });
    await audit(tx, adminId, "NOTIFICATION_RETRY_REQUESTED", id, {
      entityType: "NOTIFICATION",
      previousState: n.jobStatus,
      newState: "RETRY",
    });
    return { ok: true };
  });
}
export async function recordOperationalFailure(
  userId: string,
  kind: string,
  targetId: string,
  eventId?: string,
) {
  await transaction(async (tx) => {
    await actor(tx, userId);
    await audit(tx, userId, "OPERATIONAL_" + kind, targetId.slice(0, 191), {
      entityType: "OPERATIONAL",
      eventId,
      reasonCode: kind,
    });
  });
}
export async function runOperationalJobs(adminId: string, now = new Date()) {
  if (!isolatedTestData())
    throw Error("503:Operational jobs are local fictional processing only.");
  const u = await actor(db, adminId);
  if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
  const due = await db.booking.findMany({
    where: {
      origin: "REAL",
      testOnly: true,
      lifecycle: { in: ["RESERVED", "PENDING"] },
      reviewHold: false,
      inventoryHeld: true,
      paymentState: { notIn: ["CONFIRMED", "REFUND_PENDING", "REFUNDED"] },
      reservationExpiresAt: { lte: now },
    },
    select: { id: true, eventId: true },
    take: 100,
  });
  const result = { expired: 0, failed: 0, notificationJobs: 0, reminders: 0 };
  for (const b of due)
    try {
      await expireReservation(adminId, b.id, now);
      result.expired++;
    } catch (e: any) {
      if (!String(e.message).startsWith("409:")) {
        result.failed++;
        await recordOperationalFailure(
          adminId,
          "EXPIRY_FAILED",
          b.id,
          b.eventId,
        );
      }
    }
  let cursor: string | undefined;
  while (result.reminders < 100) {
    const reminders = await db.booking.findMany({
      where: {
        origin: "REAL",
        testOnly: true,
        lifecycle: "CONFIRMED",
        event: {
          status: "PUBLISHED",
          salesPaused: false,
          pendingChangeId: null,
          startsAt: { gt: now, lte: new Date(now.getTime() + 86400000) },
        },
        user: { active: true, eventReminders: true },
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
        event: { select: { termsVersion: true } },
      },
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 100,
    });
    if (!reminders.length) break;
    cursor = reminders[reminders.length - 1].id;
    const existing = new Set(
      (
        await db.notification.findMany({
          where: {
            dedupeKey: {
              in: reminders.map(
                (b) => `reminder:${b.id}:${b.event.termsVersion}`,
              ),
            },
          },
          select: { dedupeKey: true },
        })
      ).map((n) => n.dedupeKey),
    );
    for (const b of reminders) {
      if (result.reminders >= 100) break;
      if (existing.has(`reminder:${b.id}:${b.event.termsVersion}`)) continue;
      const created = await transaction(async (tx) => {
        const currentActor = await actor(tx, adminId);
        if (currentActor.role !== "ADMIN")
          throw Error("403:Administrator access required.");
        const current = await tx.booking.findUnique({
          where: { id: b.id },
          include: { event: true, user: true },
        });
        if (
          !current ||
          current.lifecycle !== "CONFIRMED" ||
          !current.user.active ||
          !current.user.eventReminders ||
          current.event.status !== "PUBLISHED" ||
          current.event.salesPaused ||
          current.event.pendingChangeId ||
          current.event.startsAt <= now ||
          current.event.startsAt.getTime() > now.getTime() + 86400000
        )
          return false;
        await eventFence(tx, current.event, true);
        const key = `reminder:${b.id}:${current.event.termsVersion}`;
        if (await tx.notification.findUnique({ where: { dedupeKey: key } }))
          return false;
        const n = await notify(
          tx,
          b.userId,
          key,
          "Event reminder",
          "Your confirmed event is coming up. Check the current approved details in your booking.",
          "/bookings/" + b.id,
        );
        await tx.notification.update({
          where: { id: n.id },
          data: { category: "REMINDER" },
        });
        return true;
      }).catch(async (error: unknown) => {
        // Another valid event transition can win the fence while this batch runs.
        // Skip that booking, retaining other independent reminders in this run.
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("409:")) return false;
        if (message.startsWith("403:")) throw error;
        result.failed++;
        await recordOperationalFailure(
          adminId,
          "REMINDER_FAILED",
          b.id,
          b.eventId,
        );
        return false;
      });
      if (created) result.reminders++;
    }
  }
  result.notificationJobs = (
    await processNotifications(adminId, localMailboxTransport, now)
  ).length;
  await transaction(async (tx) => {
    await audit(tx, adminId, "LOCAL_OPERATIONAL_JOBS_RAN", "local-job-runner", {
      entityType: "OPERATIONAL",
      newState: "COMPLETED",
    });
  });
  return result;
}
export async function recoverIssuance(adminId: string, bookingId: string) {
  const u = await actor(db, adminId);
  if (u.role !== "ADMIN") throw Error("403:Administrator access required.");
  try {
    const tickets = await issueTickets(adminId, bookingId);
    await transaction((tx) =>
      audit(tx, adminId, "ISSUANCE_RECOVERY_ATTEMPT", bookingId, {
        entityType: "BOOKING",
        newState: "COMPLETE",
      }),
    );
    return { count: tickets.length };
  } catch (e) {
    await recordOperationalFailure(adminId, "ISSUANCE_FAILED", bookingId);
    throw e;
  }
}
