import type { User } from "@prisma/client";
import { db } from "./db";
import { socialPerson } from "./social";
import { ageOn, publicUser } from "./rules";

// Social counts and previews honor active accounts, adult eligibility, blocks,
// and profile-discovery consent. Club membership is private until opted in.
export async function profileConnections(target: User, viewer: User) {
  const own = target.id === viewer.id;
  const blocks = await db.block.findMany({
    where: {
      OR: [
        { fromId: viewer.id },
        { toId: viewer.id },
        { fromId: target.id },
        { toId: target.id },
      ],
    },
  });
  const excluded = [
    ...new Set(
      blocks
        .flatMap((b) => [b.fromId, b.toId])
        .filter((id) => id !== viewer.id && id !== target.id),
    ),
  ];
  const [followers, following, targetFriends, viewerFriends, memberships] =
    await Promise.all([
      db.follow.findMany({ where: { toId: target.id } }),
      db.follow.findMany({ where: { fromId: target.id } }),
      db.friendship.findMany({
        where: { OR: [{ userA: target.id }, { userB: target.id }] },
      }),
      db.friendship.findMany({
        where: { OR: [{ userA: viewer.id }, { userB: viewer.id }] },
      }),
      db.clubMembership.findMany({
        where: { userId: target.id, ...(!own ? { public: true } : {}) },
        include: { club: true },
      }),
    ]);
  const friendIds = (rows: typeof targetFriends, id: string) =>
    rows.map((f) => (f.userA === id ? f.userB : f.userA));
  const targetIds = friendIds(targetFriends, target.id),
    viewerIds = friendIds(viewerFriends, viewer.id);
  const wanted = [
    ...new Set([
      ...followers.map((f) => f.fromId),
      ...following.map((f) => f.toId),
      ...targetIds,
    ]),
  ];
  const permitted =
    ageOn(viewer.dob) < 18
      ? []
      : await db.user.findMany({
          where: {
            id: { in: wanted, notIn: excluded },
            active: true,
            ...(!own ? { discoverable: true } : {}),
          },
        });
  const adults = permitted.filter((p) => ageOn(p.dob) >= 18);
  const select = (ids: string[]) =>
    adults.filter((p) => ids.includes(p.id)).map(socialPerson);
  const friendList = select(targetIds);
  const mutualFriends = own
    ? friendList
    : select(targetIds.filter((id) => viewerIds.includes(id)));
  return {
    followers: select(followers.map((f) => f.fromId)),
    followingPeople: select(following.map((f) => f.toId)),
    friends: friendList,
    mutualFriends,
    clubs: [], mutualClubs: [], conversationId: null,
  };
}
