import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { retryableTransactionError } from "../lib/domain-core";

test("MariaDB record conflicts retry only the specific connector error", () => {
  const message = 'ConnectorError(Server(MysqlError { code: 1020, message: "Record has changed since last read; try restarting transaction", state: "HY000" }))';
  assert.equal(retryableTransactionError(new Prisma.PrismaClientUnknownRequestError(message, {clientVersion: "6.19.0"})), true);
  assert.equal(retryableTransactionError(new Error(message)), false);
  assert.equal(retryableTransactionError(new Prisma.PrismaClientUnknownRequestError('MysqlError { code: 1146, message: "Table missing" }', {clientVersion: "6.19.0"})), false);
  assert.equal(retryableTransactionError(new Error("429:Too many attempts.")), false);
});
