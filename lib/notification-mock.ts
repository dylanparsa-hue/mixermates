import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { actor, audit, isolatedTestData, transaction } from "./domain-core";
/** Local-only transport rehearsal against the existing notification outbox. Never sends email. */
export async function mockNotificationDelivery(
  userId: string,
  notificationId: string,
  transport?: (message: {
    id: string;
    title: string;
    body: string;
  }) => Promise<void>,
) {
  if (!isolatedTestData())
    throw Error("503:Mock delivery requires an isolated fictional database.");
  return transaction(async (tx) => {
    const u = await actor(tx, userId),
      n = await tx.notification.findUniqueOrThrow({
        where: { id: notificationId },
      });
    if (u.role !== "ADMIN" && n.userId !== u.id)
      throw Error("403:Private notification.");
    if (n.deliveryStatus === "AVAILABLE_MOCK_DELIVERED")
      return { status: n.deliveryStatus };
    let status = "AVAILABLE_MOCK_DELIVERED";
    try {
      if (transport)
        await transport({ id: n.id, title: n.title, body: n.body });
      else {
        const folder = path.join(process.cwd(), ".local", "mail");
        await mkdir(folder, { recursive: true, mode: 0o700 });
        // Database IDs are never accepted as path fragments; use a fixed-length digest.
        const { createHash } = await import("node:crypto");
        const filename =
          createHash("sha256").update(n.id).digest("hex") + ".json";
        try {
          await writeFile(
            path.join(folder, filename),
            JSON.stringify({
              kind: "NOTIFICATION",
              transport: "LOCAL_MOCK_ONLY",
              id: n.id,
              title: n.title,
              body: n.body,
            }),
            { mode: 0o600, flag: "wx" },
          );
        } catch (e: any) {
          if (e.code !== "EEXIST") throw e;
        }
      }
    } catch {
      status = "AVAILABLE_MOCK_FAILED";
    }
    await tx.notification.update({
      where: { id: n.id },
      data: { deliveryStatus: status },
    });
    await audit(tx, userId, "NOTIFICATION_MOCK_ATTEMPT", n.id, {
      entityType: "NOTIFICATION",
      previousState: n.deliveryStatus,
      newState: status,
      reasonCode: status.endsWith("FAILED")
        ? "LOCAL_MOCK_FAILURE_RETRYABLE"
        : "LOCAL_MOCK_ONLY_NO_EMAIL_SENT",
    });
    return { status };
  });
}
