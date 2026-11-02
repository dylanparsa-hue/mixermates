import test from "node:test";
import assert from "node:assert/strict";
import { testLabEnvironment, testLabRequest } from "../lib/test-lab-guard";
import { upcomingEvents, malaysiaDay } from "../lib/discovery";
const cwd = "/Users/parsa/.codex/tmp/mixermates-correction-20261027/preview";
const env = {
  NODE_ENV: "development",
  MIXERMATES_TEST_LAB: "enabled",
  ISOLATED_TEST_DATA: "true",
  LOCAL_CUSTOMER_TEST_ENABLED: "true",
  TICKET_SALES_MODE: "disabled",
  SITE_MODE: "coming_soon",
  DEMO_MODE: "false",
  LOCAL_DEMO_BOOKING_ENABLED: "false",
  HOSTINGER_DATABASE_BOOTSTRAP: "false",
  HOSTINGER_SEED_DEMO: "false",
  DATABASE_URL: "file:" + cwd + "/prisma/audit.db",
  APP_ORIGIN: "http://localhost:3081",
};
test("Test Lab requires every explicit local development guard", () => {
  assert(testLabEnvironment(env, cwd));
  for (const k of Object.keys(env))
    assert.equal(testLabEnvironment({ ...env, [k]: undefined }, cwd), false, k);
  for (const NODE_ENV of ["production", "test", "Development", ""])
    assert.equal(testLabEnvironment({ ...env, NODE_ENV }, cwd), false);
  for (const enable of ["true", "enable", "ENABLED"])
    assert.equal(
      testLabEnvironment({ ...env, MIXERMATES_TEST_LAB: enable }, cwd),
      false,
    );
  for (const dir of [
    "/tmp/preview",
    "/Users/parsa/Desktop/EVENT FINDER",
    cwd + "/../preview",
    cwd + "/copy",
  ])
    assert.equal(testLabEnvironment(env, dir), false);
  for (const DATABASE_URL of [
    "file:/Users/parsa/Desktop/EVENT FINDER/prisma/dev.db",
    "mysql://127.0.0.1/test",
    "file:" + cwd + "/prisma/audit.db?connection_limit=1",
  ])
    assert.equal(testLabEnvironment({ ...env, DATABASE_URL }, cwd), false);
  for (const key of [
    "DB_PASSWORD",
    "DB_NAME",
    "SMTP_HOST",
    "STRIPE_SECRET_KEY",
    "RESEND_API_KEY",
    "TWILIO_AUTH_TOKEN",
    "TRANSACTIONAL_PROVIDER",
    "PAYMENT_GATEWAY_KEY",
    "BANK_SECRET",
    "MAIL_PASSWORD",
  ])
    assert.equal(
      testLabEnvironment({ ...env, [key]: "present" }, cwd),
      false,
      key,
    );
  for (const APP_ORIGIN of [
    "https://mixermates.com",
    "http://0.0.0.0:3081",
    "http://192.168.1.10:3081",
    "http://user@localhost:3081",
    "http://localhost",
  ])
    assert.equal(testLabEnvironment({ ...env, APP_ORIGIN }, cwd), false);
});
test("Test Lab rejects public hosts, proxy forwarding and cross-origin mutations", () => {
  const make = (
    url = "http://localhost:3081/api/test-lab/state",
    headers: Record<string, string> = {},
    method = "GET",
  ) => new Request(url, { method, headers });
  assert(testLabRequest(make(), env, cwd));
  assert(
    testLabRequest(
      make(undefined, {
        Host: "localhost:3081",
        "x-forwarded-host": "localhost:3081",
        "x-forwarded-for": "127.0.0.1",
      }),
      env,
      cwd,
    ),
  );
  assert(
    testLabRequest(
      make(undefined, { Origin: env.APP_ORIGIN }, "POST"),
      env,
      cwd,
    ),
  );
  for (const url of [
    "https://mixermates.com/api/test-lab/state",
    "http://evil.test:3081/api/test-lab/state",
    "http://localhost:3082/api/test-lab/state",
  ])
    assert.equal(testLabRequest(make(url), env, cwd), false);
  for (const [key, value] of [
    ["Host", "evil.test:3081"],
    ["x-forwarded-host", "evil.test:3081"],
    ["forwarded", "host=localhost"],
    ["x-forwarded-for", "198.51.100.1"],
  ])
    assert.equal(
      testLabRequest(make(undefined, { [key]: value }), env, cwd),
      false,
    );
  for (const origin of ["", "https://evil.test", "http://localhost:3082"])
    assert.equal(
      testLabRequest(make(undefined, { Origin: origin }, "POST"), env, cwd),
      false,
    );
  assert.equal(
    testLabRequest(make(), { ...env, NODE_ENV: "production" }, cwd),
    false,
  );
});
test("Discovery excludes ended events, sorts actual instants and groups dates in Malaysia", () => {
  const now = Date.parse("2026-10-27T16:30:00Z");
  const e = [
    { id: "past", startsAt: "2026-10-23T10:00Z", endsAt: "2026-10-23T16:00Z" },
    { id: "later", startsAt: "2026-10-30T12:00Z", endsAt: "2026-10-30T16:00Z" },
    {
      id: "ongoing",
      startsAt: "2026-10-27T15:00Z",
      endsAt: "2026-10-27T18:00Z",
    },
  ];
  assert.deepEqual(
    upcomingEvents(e, now).map((e) => e.id),
    ["ongoing", "later"],
  );
  assert.equal(malaysiaDay(new Date(now)), "2026-10-28");
  assert.equal(
    upcomingEvents([{ startsAt: new Date(now), endsAt: new Date(now) }], now)
      .length,
    0,
  );
});

// Free RSVP follows the publication rule; paid events retain independent verification.
import { customerEventReady } from "../lib/customer-policy";
test("approved fictional free RSVP and paid event verification remain distinct", () => {
  const event = {
    origin: "REAL",
    testOnly: true,
    status: "PUBLISHED",
    salesPaused: false,
    startsAt: new Date(Date.now() + 86400000),
    configurationStatus: "FICTIONAL_APPROVED",
    reviewOutcome: "APPROVED",
    organizer: { verification: "UNVERIFIED" },
    tiers: [{ price: 0 }],
  };
  assert.equal(customerEventReady(event), true);
  assert.equal(
    customerEventReady({ ...event, tiers: [{ price: 3500 }] }),
    false,
  );
  assert.equal(
    customerEventReady({ ...event, tiers: [{ price: 0 }, { price: 3500 }] }),
    false,
  );
  assert.equal(customerEventReady({ ...event, tiers: [] }), false);
  for (const override of [
    { testOnly: false },
    { status: "DRAFT" },
    { salesPaused: true },
    { configurationStatus: "UNCONFIRMED" },
    { reviewOutcome: "PENDING" },
  ])
    assert.equal(customerEventReady({ ...event, ...override }), false);
});
