import test from "node:test";
import assert from "node:assert/strict";
import { databaseUrl } from "../lib/database-url";
test("managed database connection safely encodes punctuation in a saved password", () => {
  const result = databaseUrl({
    DB_USER: "app_user",
    DB_PASSWORD: "a@b:/#?%c",
    DB_NAME: "app",
    DB_HOST: "localhost",
    DB_PORT: "3306",
    DATABASE_URL: "file:./dev.db",
  });
  const url = new URL(result!);
  assert.equal(url.protocol, "mysql:");
  assert.equal(decodeURIComponent(url.password), "a@b:/#?%c");
  assert.equal(url.hostname, "localhost");
  assert.equal(url.pathname, "/app");
});
test("local and preconfigured database URLs remain supported", () => {
  assert.equal(databaseUrl({ DATABASE_URL: "file:./dev.db" }), "file:./dev.db");
  assert.equal(
    databaseUrl({ DATABASE_URL: "mysql://user:secret@host:3306/db" }),
    "mysql://user:secret@host:3306/db",
  );
});
