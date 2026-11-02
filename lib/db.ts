import { PrismaClient } from "@prisma/client";
import { clientDatabaseUrl } from "./database-url";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({ datasources: { db: { url: clientDatabaseUrl() } } });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
