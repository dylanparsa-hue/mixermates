import { db } from "./db";
import { transaction } from "./domain-core";
import { ageOn, publicUser } from "./rules";
export const reservedUsernames = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "api",
  "root",
  "system",
  "mixermates",
  "security",
  "billing",
  "payments",
  "settings",
  "login",
  "signup",
  "register",
  "null",
  "undefined",
]);
export function permittedUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value) && !reservedUsernames.has(value);
}
export const socialPerson = (u: any) => ({
  ...publicUser(u),
  id: u.username,
  publicId: "@" + u.username,
});
export async function socialAction(
  userId: string,
  targetKey: string,
  action: string,
  reason?: string,
) {
  return transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const target = await tx.user.findFirst({
      where: {
        OR: [
          { username: targetKey.replace(/^@/, "").toLowerCase() },
          { id: targetKey },
        ],
      },
    });
    if (
      !me.active ||
      !target ||
      target.id === me.id ||
      (!target.active && action !== "unblock")
    )
      throw Error("400:Invalid contact.");
    const targetId = target.id,
      pair = {
        OR: [
          { userA: me.id, userB: targetId },
          { userA: targetId, userB: me.id },
        ],
      };
    if (action === "unblock") {
      await tx.block.deleteMany({ where: { fromId: me.id, toId: targetId } });
      return;
    }
    if (action === "block") {
      await tx.block.upsert({
        where: { fromId_toId: { fromId: me.id, toId: targetId } },
        create: { fromId: me.id, toId: targetId },
        update: {},
      });
      await tx.friendship.deleteMany({ where: pair });
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { fromId: me.id, toId: targetId },
            { fromId: targetId, toId: me.id },
          ],
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });
      await tx.follow.deleteMany({
        where: {
          OR: [
            { fromId: me.id, toId: targetId },
            { fromId: targetId, toId: me.id },
          ],
        },
      });
      return;
    }
    if (ageOn(me.dob) < 18 || ageOn(target.dob) < 18)
      throw Error("403:Social connections require adult accounts.");
    if (
      await tx.block.findFirst({
        where: {
          OR: [
            { fromId: me.id, toId: targetId },
            { fromId: targetId, toId: me.id },
          ],
        },
      })
    )
      throw Error("403:This connection is unavailable.");
    if (action === "remove") {
      await tx.friendship.deleteMany({ where: pair });
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { fromId: me.id, toId: targetId },
            { fromId: targetId, toId: me.id },
          ],
        },
        data: { status: "CANCELLED" },
      });
      return;
    }
    if (action === "cancel") {
      await tx.friendRequest.updateMany({
        where: { fromId: me.id, toId: targetId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      return;
    }
    if (action === "request") {
      if (!target.discoverable)
        throw Error("403:This person is not accepting discovery requests.");
      if (await tx.friendship.findFirst({ where: pair }))
        throw Error("409:You are already friends.");
      if (
        await tx.friendRequest.findFirst({
          where: {
            OR: [
              { fromId: me.id, toId: targetId },
              { fromId: targetId, toId: me.id },
            ],
            status: "PENDING",
          },
        })
      )
        throw Error("409:A friend request is already pending.");
      await tx.friendRequest.upsert({
        where: { fromId_toId: { fromId: me.id, toId: targetId } },
        create: { fromId: me.id, toId: targetId },
        update: { status: "PENDING" },
      });
      if (target.socialNotifications)
        await tx.notification.create({
          data: {
            userId: targetId,
            category: "SOCIAL",
            title: "Friend request",
            body: `${me.name} sent you a friend request.`,
            link: "/friends?tab=Requests",
          },
        });
      return;
    }
    if (action === "accept" || action === "reject") {
      const request = await tx.friendRequest.updateMany({
        where: { fromId: targetId, toId: me.id, status: "PENDING" },
        data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" },
      });
      if (request.count !== 1) throw Error("404:Request unavailable.");
      if (action === "accept") {
        const [userA, userB] = [me.id, targetId].sort();
        await tx.friendship.upsert({
          where: { userA_userB: { userA, userB } },
          create: { userA, userB },
          update: {},
        });
      }
      return;
    }
    if (action === "follow") {
      if (!target.discoverable) throw Error("403:Profile is private.");
      await tx.follow.upsert({
        where: { fromId_toId: { fromId: me.id, toId: targetId } },
        create: { fromId: me.id, toId: targetId },
        update: {},
      });
      return;
    }
    if (action === "unfollow") {
      await tx.follow.deleteMany({ where: { fromId: me.id, toId: targetId } });
      return;
    }
    if (action === "report") {
      if (!reason || reason.trim().length < 3 || reason.length > 1000)
        throw Error("400:Add a report reason.");
      await tx.report.create({ data: { userId: me.id, targetId, reason } });
      return;
    }
    throw Error("400:Unsupported connection action.");
  });
}
export async function blockedAccounts(userId: string) {
  const rows = await db.block.findMany({ where: { fromId: userId } });
  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.toId) } },
  });
  return users.map((u) => ({
    id: u.username,
    username: u.username,
    name: u.name,
    photo: u.photo,
  }));
}
