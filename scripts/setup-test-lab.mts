// One-shot provisioning in a freshly prepared, fictional, contained workspace only.
import { readFile, writeFile, mkdir, realpath, stat } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
import QRCode from "qrcode";
import { testLabEnvironment } from "../lib/test-lab-guard";
import {
  submitPaymentDestination,
  reviewPaymentDestination,
} from "../lib/payment-foundation";
if (!testLabEnvironment())
  throw Error("Fresh local Test Lab workspace required");
const cwd = await realpath(process.cwd());
try {
  await stat(".local/test-lab-marker.json");
  throw Error("Existing Test Lab is preserved.");
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
if (await db.user.findUnique({ where: { id: "test-lab-sentinel" } }))
  throw Error("Existing fixture preserved");
if (await db.event.count({ where: { testOnly: false } }))
  throw Error("Fictional database required");
const nonce = randomBytes(32).toString("hex"),
  passwordHash = await hash(randomBytes(32).toString("hex"), 12);
const definitions = [
  ["Customer", "lab-customer", "ATTENDEE", "Alex Test"],
  ["Organizer", "lab-organizer", "ORGANIZER", "River Test"],
  ["Administrator", "lab-administrator", "ADMIN", "Morgan Test"],
  ["Finance Reviewer", "lab-finance", "STAFF", "Casey Test"],
  ["Entrance Staff", "lab-entrance", "STAFF", "Jordan Test"],
  ["Community Friend", "lab-friend", "ATTENDEE", "Sam Test"],
] as const;
const personas: any = {};
for (const [label, id, role, name] of definitions) {
  personas[label] = id;
  await db.user.create({
    data: {
      id,
      role,
      name,
      email: id + "@example.test",
      username: id.replaceAll("-", "_"),
      passwordHash: await hash(randomBytes(32).toString("hex"), 12),
      dob: new Date("1995-02-14"),
      city: "Kuala Lumpur",
      verification: role === "ORGANIZER" ? "VERIFIED" : "UNVERIFIED",
      bio:
        label === "Customer"
          ? "Fictional local tester. Here for house music and new places."
          : label === "Community Friend"
            ? "Fictional local tester. Live music, late dinners and a good dance floor."
            : "Fictional local " +
              label.toLowerCase() +
              ". No real authority or money.",
      interests:
        label === "Community Friend"
          ? "Live music,Jazz,Food"
          : "House,Electronic,Techno",
      discoverable: ["Customer", "Community Friend"].includes(label),
    },
  });
}
await db.user.create({
  data: {
    id: "test-lab-owner",
    role: "ATTENDEE",
    name: "Local Test Lab Workspace",
    email: "test-lab-owner@example.test",
    username: "test_lab_owner",
    passwordHash,
    dob: new Date("1990-01-01"),
    city: "Fictional",
    discoverable: false,
  },
});
await db.user.create({
  data: {
    id: "test-lab-sentinel",
    active: false,
    name: "Fictional Database Marker",
    email: "test-lab-marker@example.test",
    username: "test_lab_marker",
    passwordHash: "disabled",
    dob: new Date("1990-01-01"),
    city: "Fictional",
    bio: createHash("sha256").update(nonce).digest("hex"),
  },
});
const qr = await db.fileUpload.create({
  data: {
    userId: personas.Organizer,
    private: true,
    path: "test-lab-fictional-recipient",
    mime: "image/png",
    data: Uint8Array.from(
      await QRCode.toBuffer("FICTIONAL TEST ONLY - NO PAYMENT DESTINATION"),
    ),
  },
});
const submitted = await submitPaymentDestination(personas.Organizer, {
  methodType: "BANK_QR",
  label: "TEST ONLY · no money",
  recipientName: "FICTIONAL MixerMates Test Recipient",
  recipientReference: "FICTIONAL-NO-BANK-ACCOUNT",
  qrAssetId: qr.id,
  instructions:
    "TEST ONLY. Do not transfer money. Use sample evidence in the Test Lab.",
  displayName: "Fictional local sandbox",
  organizerReference: "FICTIONAL",
});
await reviewPaymentDestination(
  personas.Administrator,
  submitted.id,
  true,
  "FICTIONAL local review. No real account or payment capability.",
);
// Relative dates preserve each fictional event’s local time, avoiding stale discovery fixtures.
const now = new Date();
const local = new Date(now.getTime() + 8 * 3600000);
const start =
  Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    12,
  ) -
  8 * 3600000;
let offset = 1;
for (const e of await db.event.findMany({
  where: { id: { not: "halloween" } },
})) {
  const startsAt = new Date(start + offset++ * 86400000);
  await db.event.update({
    where: { id: e.id },
    data: { startsAt, endsAt: new Date(+startsAt + 4 * 3600000) },
  });
}
await mkdir(".local", { recursive: true, mode: 0o700 });
await writeFile(
  ".local/test-lab-marker.json",
  JSON.stringify(
    {
      version: 1,
      fictional: true,
      workspace: cwd,
      database: await realpath("prisma/audit.db"),
      nonce,
      ownerId: "test-lab-owner",
      personas,
      destinationId: submitted.destinationId,
    },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
await writeFile(
  ".local/test-lab-access.json",
  JSON.stringify(
    {
      url: process.env.APP_ORIGIN + "/test-lab",
      localOnly: true,
    },
    null,
    2,
  ),
  { mode: 0o600, flag: "wx" },
);
await writeFile(
  ".local/TEST-LAB-ACCESS.txt",
  "Open " +
    process.env.APP_ORIGIN +
    "/\nThe fictional customer session opens automatically. No access code or password is required. Use the workspace switcher for organizer/admin testing. All actions are fictional and local.\n",
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Local Test Lab provisioned. Open APP_ORIGIN directly; no access code is required.",
);
await db.$disconnect();
