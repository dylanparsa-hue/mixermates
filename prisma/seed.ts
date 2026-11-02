import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { seedProfileReference } from "./profile-seed";
const db = new PrismaClient();
async function main() {
  const passwordHash = await hash(
    process.env.NODE_ENV === "production"
      ? randomBytes(48).toString("base64url")
      : "VibeyDemo2026!",
    12,
  );
  const accounts = [
    ["attendee", "Alex Morgan", "alex", "ATTENDEE", "UNVERIFIED"],
    [
      "organizer",
      "Afterhours Collective",
      "afterhours",
      "ORGANIZER",
      "VERIFIED",
    ],
    ["staff", "Jamie Lee", "jamie", "STAFF", "UNVERIFIED"],
    ["admin", "MixerMates Admin", "vibeyadmin", "ADMIN", "VERIFIED"],
    ["sarah", "Sarah Tan", "sarahtan", "ATTENDEE", "UNVERIFIED"],
    ["daniel", "Daniel Lim", "daniellim", "ATTENDEE", "UNVERIFIED"],
    ["maya", "Maya Chen", "mayachen", "ATTENDEE", "UNVERIFIED"],
  ];
  for (const [id, name, username, role, verification] of accounts)
    await db.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `${id}@vibey.demo`,
        name,
        username,
        role,
        verification,
        passwordHash,
        dob: new Date("1998-05-12"),
        city: "Kuala Lumpur",
        bio:
          id === "organizer"
            ? "A little after dark. A lot to remember. Independent nights for the people who feel the music."
            : "Here for the music, staying for the people. ✨",
        interests: "House,Electronic,Techno",
        discoverable: ["sarah", "daniel", "maya"].includes(id),
      },
    });
  const events = [
    {
      id: "halloween",
      title: "Halloween House Party",
      slug: "halloween-house-party",
      category: "House Party",
      genre: "House · Electronic",
      city: "Kuala Lumpur",
      venue: "Mont Kiara · Private location",
      privateVenue: "Demo venue: 18 Jalan Kiara, Mont Kiara, Kuala Lumpur",
      latitude: 3.171,
      longitude: 101.651,
      day: 29,
      price: 3500,
      capacity: 80,
      access: "INVITATION_ONLY",
      approvalRequired: true,
      image: "/images/halloween.jpg",
      theme: "Halloween",
      description:
        "Something wicked is coming to Mont Kiara. A house full of good people, a soundtrack that goes until late, and one unforgettable night. Come as your alter ego. Leave with a new story. Expect intimate dance floors, a curated house and electronic lineup, and a few surprises after midnight. Costumes encouraged. Good energy required.",
    },
    {
      id: "neon",
      title: "NEON / After Dark",
      slug: "neon-after-dark",
      category: "Nightlife",
      genre: "Techno · Electronic",
      city: "Kuala Lumpur",
      venue: "The Foundry · Bukit Bintang",
      privateVenue: "",
      latitude: 3.1466,
      longitude: 101.711,
      day: 24,
      price: 6500,
      capacity: 240,
      image: "/images/neon.jpg",
      theme: "Electric",
      description:
        "Lose yourself in a night of deep frequencies and electric connections. Three selectors. One dance floor. No distractions. A fictional independent club night in the heart of Kuala Lumpur.",
    },
    {
      id: "sunset",
      title: "Sunset Social Club",
      slug: "sunset-social-club",
      category: "House Music",
      genre: "House · Disco",
      city: "Penang",
      venue: "Seafront Sessions · George Town",
      privateVenue: "",
      latitude: 5.419,
      longitude: 100.343,
      day: 25,
      price: 4500,
      capacity: 160,
      image: "/images/sunset.jpg",
      theme: "Sunset",
      description:
        "Golden hour, warm grooves, and a sea breeze. A laid-back open-air gathering that moves from sunset disco into late-night house.",
    },
    {
      id: "frequency",
      title: "Frequency Festival",
      slug: "frequency-festival",
      category: "Festival",
      genre: "EDM · Electronic",
      city: "Johor Bahru",
      venue: "Southern Grounds · Iskandar",
      privateVenue: "",
      latitude: 1.4655,
      longitude: 103.7578,
      day: 31,
      price: 12000,
      capacity: 800,
      image: "/images/festival.jpg",
      theme: "Electric",
      description:
        "Find your frequency. An immersive demo festival celebrating electronic music, independent artists, and the people who bring it all to life.",
    },
    {
      id: "rooftop",
      title: "Above The City",
      slug: "above-the-city",
      category: "Nightlife",
      genre: "House · R&B",
      city: "Petaling Jaya",
      venue: "Skyline Sessions · PJ",
      privateVenue: "",
      latitude: 3.1073,
      longitude: 101.6067,
      day: 23,
      price: 5500,
      capacity: 120,
      image: "/images/rooftop.jpg",
      theme: "Minimal",
      description:
        "The city below. Your people above. A rooftop escape with smooth house selections and an intimate skyline setting.",
    },
    {
      id: "live",
      title: "The Midnight Sessions",
      slug: "midnight-sessions",
      category: "Concert",
      genre: "Indie · Live",
      city: "Subang Jaya",
      venue: "Studio 19 · SS15",
      privateVenue: "",
      latitude: 3.0738,
      longitude: 101.586,
      day: 30,
      price: 4000,
      capacity: 150,
      image: "/images/live.jpg",
      theme: "Cinematic",
      description:
        "Live sounds for late souls. Discover three fictional independent acts in a beautifully intimate room. A night for the songs you have not found yet.",
    },
    {
      id: "melaka",
      title: "Riverside Groove",
      slug: "riverside-groove",
      category: "House Music",
      genre: "House · Soul",
      city: "Melaka",
      venue: "River House · Old Town",
      privateVenue: "",
      latitude: 2.195,
      longitude: 102.249,
      day: 24,
      price: 0,
      capacity: 60,
      image: "/images/social.jpg",
      theme: "Sunset",
      description:
        "An easy evening by the river. Soulful selections, new connections, and a dance floor with no pressure. Free RSVP, limited capacity.",
    },
  ];
  for (const e of events) {
    const { day, price, ...rest } = e;
    await db.event.upsert({
      where: { id: e.id },
      update: {},
      create: {
        ...rest,
        origin:"DEMO",testOnly:true,status:e.id === "halloween"?"DRAFT":"PUBLISHED",configurationStatus:e.id === "halloween"?"UNCONFIRMED":"FICTIONAL_DEMO",sourceConfiguration:e.id === "halloween"?JSON.stringify({date:"2026-10-29",yearConfirmed:false,startTime:null,endTime:null,capacity:null,venue:null,paymentRecipient:null,feeByobRelationship:null,fullIcNameRequired:true,ageMinimum:18,instagramRequired:true,inviterRequired:false,proofRequired:true,proofFileLimitBytes:10000000}):"{}",
        access: e.access || "PUBLIC",
        approvalRequired: e.approvalRequired || false,
        organizerId: "organizer",
        startsAt: new Date(`2026-10-${day}T12:00:00Z`),
        endsAt: new Date(Date.UTC(2026, 9, day, 18)),
        tiers: {
          create: [
            {
              id: `${e.id}-general`,
              name: price ? "General Admission" : "Free RSVP",
              price,
              quantity: e.capacity - 20,
              maxPerOrder: e.id === "halloween" ? 1 : 4,
            },
            {
              id: `${e.id}-vip`,
              name: "VIP Experience",
              price: price ? price + 5000 : 0,
              quantity: 20,
              maxPerOrder: 2,
            },
          ],
        },
      },
    });
  }
  for (const label of [
    "Full name as on IC",
    "Age",
    "Phone number",
    "Instagram username",
    "Invited by",
    "Entry option",
  ]) {
    const exists = await db.eventRegistrationField.findFirst({
      where: { eventId: "halloween", label },
    });
    if (!exists)
      await db.eventRegistrationField.create({
        data: {
          eventId: "halloween",
          label,
          type: label === "Entry option" ? "select" : "text",
          required: !["Invited by","Phone number"].includes(label),
          options:
            label === "Entry option"
              ? "Standard entry — RM35,BYOB — four beers (review required),BYOB — two sojus (review required),BYOB — one bottle (review required)"
              : "",
        },
      });
  }
  await db.eventStaff.upsert({
    where: { eventId_userId: { eventId: "halloween", userId: "staff" } },
    update: {},
    create: { eventId: "halloween", userId: "staff" },
  });
  for (const [name, threshold] of [
    ["First Night Out", 1],
    ["Nightlife Explorer", 5],
    ["10 Nights to Remember", 10],
  ] as const)
    await db.eventBadge.upsert({
      where: { name },
      update: {},
      create: { name, threshold },
    });
  if (!(await db.notification.findFirst({ where: { userId: "attendee" } })))
    await db.notification.create({
      data: {
        userId: "attendee",
        title: "Your next great night starts here",
        body: "Welcome to MixerMates. Explore a night out, save your favorites, and find your people.",
        link: "/explore",
      },
    });
  await seedProfileReference();
  console.log("Seed ready. Demo accounts use VibeyDemo2026!");
}
main().finally(() => db.$disconnect());
