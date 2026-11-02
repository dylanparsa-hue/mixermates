import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
export async function seedProfileReference() {
  const clubs = [
    {
      id: "house-society",
      name: "House Society",
      description:
        "For the selectors, dancers, and lovers of a deep house groove.",
      symbol: "✳",
      color: "#b7e96c",
    },
    {
      id: "afterhours-club",
      name: "Afterhours",
      description:
        "A community for late nights and independent electronic sounds.",
      symbol: "◒",
      color: "#ef754c",
    },
    {
      id: "livewire-club",
      name: "Livewire",
      description: "Discover live music and the people who keep coming back.",
      symbol: "ϟ",
      color: "#93b9ee",
    },
    {
      id: "sunset-sessions",
      name: "Sunset Sessions",
      description: "Golden-hour disco, warm house, and a little sea breeze.",
      symbol: "☼",
      color: "#f0c986",
    },
  ];
  for (const club of clubs)
    await db.club.upsert({ where: { id: club.id }, create: club, update: {} });
  for (const id of ["attendee", "sarah", "daniel", "maya"]) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) continue;
    const data = {
      ...(["/images/hero.jpg", "/images/profile-cover.jpg"].includes(user.cover)
        ? { cover: "/images/profile-cover.png" }
        : {}),
      ...(id === "attendee" && !user.photo
        ? { photo: "/images/profile-avatar.jpg" }
        : {}),
    };
    if (Object.keys(data).length) await db.user.update({ where: { id }, data });
  }
  // Fictional, development-only memberships. Membership starts private.
  for (const [userId, clubId] of [
    ["attendee", "house-society"],
    ["attendee", "afterhours-club"],
    ["sarah", "house-society"],
    ["sarah", "livewire-club"],
    ["daniel", "afterhours-club"],
    ["maya", "sunset-sessions"],
  ])
    await db.clubMembership.upsert({
      where: { userId_clubId: { userId, clubId } },
      update: {},
      create: { userId, clubId, public: false },
    });
  await db.$disconnect();
}
if (process.argv[1]?.endsWith("profile-seed.ts"))
  seedProfileReference().finally(() => db.$disconnect());
