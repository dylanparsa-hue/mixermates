import test from "node:test";
import assert from "node:assert/strict";
import { ageOn, feeFor, publicUser } from "../lib/rules";
test("age restriction respects the birthday boundary", () => {
  assert.equal(ageOn(new Date("2008-10-18"), new Date("2026-10-17")), 17);
  assert.equal(ageOn(new Date("2008-10-17"), new Date("2026-10-17")), 18);
});
test("platform fee uses integer sen and configurable basis points", () => {
  assert.equal(feeFor(3500, 500), 175);
  assert.equal(feeFor(999, 275), 27);
  assert.equal(feeFor(0, 500), 0);
  assert.throws(() => feeFor(-1));
  assert.throws(() => feeFor(100, 10001));
});
test("public profile projection excludes personal and credential fields", () => {
  const result = publicUser({
    id: "u",
    name: "Test",
    username: "t",
    city: "KL",
    bio: "",
    interests: "House",
    instagram: "private",
    instagramPublic: false,
    passwordHash: "secret",
    dob: new Date(),
    email: "secret@test.com",
  });
  assert.equal(result.instagram, "");
  assert.equal("email" in result, false);
  assert.equal("dob" in result, false);
  assert.equal("passwordHash" in result, false);
});
